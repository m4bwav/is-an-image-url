/*
Both call forms against the local fixture server (test/golden/fixture-server.cjs, the capture's own): statuses, media types,
redirects, credentials, timeouts, aborts, and what happens to the body. Nothing here touches the internet.
*/
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {getEventListeners} from 'node:events';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import process from 'node:process';
import {
  after,
  before,
  describe,
  test,
} from 'node:test';
import {builds} from '../helpers/builds.js';

const fixtures = createRequire(import.meta.url)('../golden/fixture-server.cjs');

let server;
// A second server on another port, whose routes redirect to the fixture server: another host, as a redirect sees it.
let redirector;

function startRedirector() {
  return new Promise(resolve => {
    const http = createServer((request, response) => {
      const target = request.url === '/to-credentials'
        ? `http://user:secret@127.0.0.1:${server.port}/image`
        : `${server.base}/image`;
      response.writeHead(302, {location: target});
      response.end();
    });
    http.listen(0, '127.0.0.1', () => {
      resolve({
        base: `http://127.0.0.1:${http.address().port}`,
        close: () => new Promise(done => {
          http.closeAllConnections();
          http.close(() => done());
        }),
      });
    });
  });
}

before(async () => {
  server = await fixtures.start();
  redirector = await startRedirector();
});

after(async () => {
  await redirector.close();
  await server.close();
});

const sleep = ms => new Promise(resolve => {
  setTimeout(resolve, ms);
});

// Destroys the server's sockets, then gives the client's connection pool time to see them close. A request sent at once can
// go out on a pooled keep-alive socket that is already dead and fail without reaching the server (seen on Node 20, 22 and 26).
async function dropConnections() {
  server.dropConnections();
  await sleep(30);
}

// The requests the server received while `action` ran, as "METHOD path" lines.
async function requestsDuring(action) {
  const seen = server.requests.length;
  const result = await action();
  await sleep(20);
  const requests = server.requests.slice(seen).map(request => `${request.method} ${request.path}`);
  await dropConnections();
  return {result, requests};
}

const ANSWERS = [
  ['/image', true],
  ['/image-jpeg', true],
  ['/image-svg-with-charset', true],
  ['/image-uppercase-type', true],
  ['/image-bytes-as-octet-stream', false],
  ['/html', false],
  ['/no-content-type', false],
  ['/empty-content-type', false],
  ['/not-found-html', false],
  ['/not-found-image', false],
  ['/server-error-image', false],
  ['/no-content-image', true],
  ['/redirect-to-image', true],
  ['/redirect-301-to-image', true],
  ['/redirect-to-html', false],
  ['/redirect-to-other-host-image', true],
  ['/redirect-without-location', false],
  ['/redirect-to-file-protocol', false],
  ['/redirect-loop', false],
  ['/no-such-route', false],
];

for (const {name, lib} of builds) {
  describe(`against the fixture server (${name} build)`, () => {
    test('each route answers as documented, the same in both forms', async () => {
      for (const [route, expected] of ANSWERS) {
        const url = `${server.base}${route}`;
        assert.equal(await lib(url), expected, `${route} (Promise form)`);
        await dropConnections();
        assert.equal(await new Promise(resolve => {
          lib(url, resolve);
        }), expected, `${route} (callback form)`);
        await dropConnections();
      }
    });

    test('one GET per call, plus one per redirect', async () => {
      const {requests} = await requestsDuring(() => lib(`${server.base}/redirect-to-image`));
      assert.deepEqual(requests, ['GET /redirect-to-image', 'GET /image']);
    });

    test('a URL with a user name or password is answered false without any request', async () => {
      const {result, requests} = await requestsDuring(() => lib(`http://user:secret@127.0.0.1:${server.port}/image`));
      assert.equal(result, false);
      assert.deepEqual(requests, []);
    });

    test('a refused connection answers false', async () => {
      assert.equal(await lib(`http://127.0.0.1:${server.closedPort}/image`), false);
    });

    test('the body is cancelled once the headers are in: an 8 MiB image is not downloaded', async () => {
      delete server.outcomes.bigImage;
      assert.equal(await lib(`${server.base}/big-image`), true);
      for (let wait = 0; wait < 100 && !server.outcomes.bigImage; wait++) {
        await sleep(20);
      }

      assert.ok(server.outcomes.bigImage, 'the server saw the connection close');
      assert.equal(server.outcomes.bigImage.finished, false, 'the response was not read to the end');
      assert.ok(server.outcomes.bigImage.bytesWritten < fixtures.BIG_SIZE, `${server.outcomes.bigImage.bytesWritten} bytes written`);
    });

    test('image headers followed by a stalled body answer true before the timeout', async () => {
      const started = Date.now();
      assert.equal(await lib(`${server.base}/headers-then-stall`, {timeout: 2000}), true);
      assert.ok(Date.now() - started < 1500);
      await dropConnections();
    });

    test('the timeout bounds the wait for the headers, in both forms', async () => {
      const started = Date.now();
      assert.equal(await lib(`${server.base}/never-responds`, {timeout: 200}), false);
      assert.equal(await new Promise(resolve => {
        lib(`${server.base}/slow-image?ms=1000`, resolve, 200);
      }), false);
      assert.ok(Date.now() - started < 1500, `took ${Date.now() - started} ms`);
      assert.equal(await lib(`${server.base}/slow-image?ms=100`, {timeout: 2000}), true);
      await dropConnections();
    });

    test('a signal aborted during the request rejects with its reason', async () => {
      const controller = new AbortController();
      const reason = new Error('user cancelled');
      const pending = lib(`${server.base}/never-responds`, {signal: controller.signal});
      setTimeout(() => {
        controller.abort(reason);
      }, 50);
      await assert.rejects(pending, error => error === reason);
      await dropConnections();
    });

    test('a signal aborted after the answer changes nothing', async () => {
      const controller = new AbortController();
      assert.equal(await lib(`${server.base}/image`, {signal: controller.signal}), true);
      controller.abort();
    });

    test('the callback runs exactly once for a network answer', async () => {
      const calls = [];
      lib(`${server.base}/image`, isImage => {
        calls.push(isImage);
      });
      await sleep(300);
      assert.deepEqual(calls, [true]);
    });

    test('concurrent calls do not interfere', async () => {
      const routes = ['/image', '/html', '/redirect-to-image', '/not-found-image', '/image-jpeg'];
      const answers = await Promise.all(routes.map(route => lib(`${server.base}${route}`)));
      assert.deepEqual(answers, [true, false, true, false, true]);
    });

    test('redirects are followed to another host, internal addresses included (README: not a guard for untrusted URLs)', async () => {
      assert.equal(await lib(`${redirector.base}/to-image`), true);
    });

    test('a redirect to a URL with a user name or password answers false (CHANGELOG: Changed)', async () => {
      const {result, requests} = await requestsDuring(() => lib(`${redirector.base}/to-credentials`));
      assert.equal(result, false);
      assert.deepEqual(requests, []);
    });

    test('a timeout longer than setTimeout allows is cut to the longest it allows, not turned into 1 ms', async () => {
      assert.equal(await lib(`${server.base}/slow-image?ms=100`, {timeout: 3e9}), true);
      assert.equal(await new Promise(resolve => {
        lib(`${server.base}/slow-image?ms=100`, resolve, 3e9);
      }), true);
      await dropConnections();
    });

    test('a shared signal is left with no listeners after the calls settle', async () => {
      const controller = new AbortController();
      await Promise.all(['/image', '/html', '/redirect-loop', '/slow-image?ms=50'].map(route => lib(`${server.base}${route}`, {signal: controller.signal})));
      await lib(`${server.base}/never-responds`, {signal: controller.signal, timeout: 100});
      assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
      await dropConnections();
    });
  });
}

test('the timer is cleared once the answer is in: a process with one call exits long before the 20 s default timeout', async () => {
  const build = new URL('../../dist/index.mjs', import.meta.url).href;
  const script = `const {default: f} = await import(${JSON.stringify(build)}); console.log(await f(${JSON.stringify(`${server.base}/image`)}));`;
  const started = Date.now();
  const stdout = await new Promise((resolve, reject) => {
    execFile(process.execPath, ['--input-type=module', '--eval', script], {encoding: 'utf8', timeout: 15_000}, (error, output) => {
      if (error) {
        reject(error);
      } else {
        resolve(output);
      }
    });
  });
  assert.equal(stdout, 'true\n');
  assert.ok(Date.now() - started < 10_000, `took ${Date.now() - started} ms`);
});
