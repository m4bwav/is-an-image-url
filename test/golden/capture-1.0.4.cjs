'use strict';
// Golden capture of the PUBLISHED is-an-image-url 1.0.4 (package-modernize Phase 0), adapted from the skill's
// scripts/golden-capture-npm.template.cjs for an asynchronous, callback-style function that makes HTTP requests.
//
// Run in a scratch project, never inside the repository, before any code change:
//   npm init -y && npm install is-an-image-url@1.0.4 is-image-300@npm:is-image@3.0.0
//   (codec.cjs and fixture-server.cjs next to this file)
//   node capture-1.0.4.cjs > 1.0.4.json
//
// Every network case talks to fixture-server.cjs on 127.0.0.1 (or localhost, as a second host); none touches the internet.
// Arguments are stored with codec.cjs. Strings may hold {{base}} (http://127.0.0.1:PORT), {{localhost}}
// (http://localhost:PORT) and {{closed}} (http://127.0.0.1:A_CLOSED_PORT); {$callback: true} marks where the recording
// callback goes. For each case the file records what the call returned or threw, every callback invocation (its arguments
// and whether it ran before the call returned), any uncaught exception, and every HTTP request the fixture server received
// (method, path, HTTP version, raw headers in the client's order and case, port replaced by {{port}}).

const {spawnSync} = require('node:child_process');
const path = require('node:path');
const {encode, decode} = require('./codec.cjs');
const fixtures = require('./fixture-server.cjs');

const isAnImageUrl = require('is-an-image-url');
const packageVersion = require('is-an-image-url/package.json').version;

const SETTLE_MS = 300;
const MAX_WAIT_MS = 25_000;

let server;
let current;

process.on('uncaughtException', error => {
  if (current) {
    current.uncaught.push({$throws: error.message, $error: error.name, code: error.code});
  } else {
    throw error;
  }
});

function substitute(value) {
  if (typeof value === 'string') {
    return value
      .replaceAll('{{base}}', server.base)
      .replaceAll('{{localhost}}', `http://localhost:${server.port}`)
      .replaceAll('{{closed}}', `http://127.0.0.1:${server.closedPort}`);
  }

  return value;
}

const sleep = ms => new Promise(resolve => {
  setTimeout(resolve, ms);
});

async function runCase(name, args, options = {}) {
  const encoded = encode(args);
  const record = {name, args: encoded, returned: undefined, threw: undefined, calls: [], uncaught: [], requests: []};
  current = record;
  const before = server.requests.length;
  let returnedYet = false;
  const callback = (...callbackArgs) => {
    record.calls.push({sync: !returnedYet, args: encode(callbackArgs)});
  };

  const realArgs = decode(encoded).map(value => {
    if (value && typeof value === 'object' && value.$callback === true) {
      return callback;
    }

    return substitute(value);
  });

  const started = Date.now();
  try {
    record.returned = encode(isAnImageUrl(...realArgs));
  } catch (error) {
    record.threw = {$throws: error.message, $error: error.name, code: error.code};
  }

  returnedYet = true;
  const maxWait = options.maxWait ?? MAX_WAIT_MS;
  while (record.calls.length === 0 && record.uncaught.length === 0 && !record.threw && Date.now() - started < maxWait) {
    // eslint-disable-next-line no-await-in-loop
    await sleep(10);
  }

  record.elapsedMs = Date.now() - started;
  await sleep(SETTLE_MS);
  record.requests = server.requests.slice(before);
  if (record.returned === undefined || (record.returned && record.returned.$undefined)) {
    delete record.returned;
  }

  if (!record.threw) {
    delete record.threw;
  }

  if (record.uncaught.length === 0) {
    delete record.uncaught;
  }

  current = undefined;
  server.dropConnections();
  return record;
}

const cb = {$callback: true};

// [name, args, options]
const methodCases = [
  // Not a URL: decided by the file extension alone, synchronously, no request.
  ['bare file name with an image extension', ['photo.png', cb]],
  ['bare file name, upper-case extension', ['PHOTO.JPG', cb]],
  ['bare file name without an extension', ['afewaefaefwf', cb]],
  ['bare file name, text extension', ['notes.txt', cb]],
  ['Windows path to an image', ['C:\\pictures\\cat.gif', cb]],
  ['POSIX path to an image', ['/tmp/cat.webp', cb]],
  ['relative path with a query string after the extension', ['cat.png?size=large', cb]],
  ['URL without a scheme or slashes', ['example.com/cat.png', cb]],
  ['URL with a space in the host (is-url says no)', ['http://exa mple.com/cat.png', cb]],
  ['IPv6 literal URL (is-url says no, so the extension decides)', ['http://[::1]/cat', cb]],
  ['IPv6 literal URL with an image extension', ['http://[::1]/cat.png', cb]],
  ['extension .avif (not in is-image 3)', ['photo.avif', cb]],
  ['extension .jxl (not in is-image 3)', ['photo.jxl', cb]],
  ['extension .fs (in is-image 3: F# source counts as an image)', ['program.fs', cb]],
  ['extension .int (in is-image 3)', ['data.int', cb]],
  ['extension .max (in is-image 3)', ['scene.max', cb]],
  ['extension .raw (in is-image 3)', ['sensor.raw', cb]],
  ['extension .PI1 (listed upper-case in is-image 3, then lower-cased on lookup)', ['degas.PI1', cb]],
  ['extension .heic', ['photo.heic', cb]],
  ['extension .ico', ['favicon.ico', cb]],
  ['emoji file name with an image extension', ['😀.png', cb]],
  // Falsy inputs: false straight away.
  ['empty string', ['', cb]],
  ['undefined url', [undefined, cb]],
  ['null url', [null, cb]],
  ['zero', [0, cb]],
  ['NaN', [Number.NaN, cb]],
  ['false', [false, cb]],
  // Truthy non-strings: is-url refuses them, then is-image calls path.extname on them.
  ['number', [123, cb]],
  ['true', [true, cb]],
  ['object', [{}, cb]],
  ['array holding an image name', [['cat.png'], cb]],
  ['String wrapper object', [new String('cat.png'), cb]],
  // No callback: throws before anything else, even for a falsy url.
  ['no callback', ['{{base}}/image']],
  ['no callback, empty url', ['']],
  ['callback is null', ['cat.png', null]],
  ['callback is a string, non-URL path', ['cat.png', 'not a function']],
  ['callback is a string, network path', ['{{base}}/html', 'not a function']],
  // URLs whose path has an image extension: true without any request.
  ['URL path with an image extension, server would 404', ['{{base}}/missing.png', cb]],
  ['URL path with an image extension and a query', ['{{base}}/missing.png?w=10', cb]],
  ['URL path with an upper-case image extension', ['{{base}}/missing.PNG', cb]],
  ['image extension only in the query string', ['{{base}}/html?file=cat.png', cb]],
  ['image extension only in the fragment', ['{{base}}/html#cat.png', cb]],
  ['percent-encoded dot before the extension', ['{{base}}/cat%2Epng', cb]],
  ['ftp URL with an image extension', ['ftp://example.com/cat.png', cb]],
  ['javascript: URL with an image extension', ['javascript://example.com/cat.png', cb]],
  // Network: the Content-Type decides.
  ['image/png', ['{{base}}/image', cb]],
  ['image/jpeg', ['{{base}}/image-jpeg', cb]],
  ['image/svg+xml with a charset parameter', ['{{base}}/image-svg-with-charset', cb]],
  ['upper-case IMAGE/PNG', ['{{base}}/image-uppercase-type', cb]],
  ['PNG bytes sent as application/octet-stream', ['{{base}}/image-bytes-as-octet-stream', cb]],
  ['text/html', ['{{base}}/html', cb]],
  ['no Content-Type header', ['{{base}}/no-content-type', cb]],
  ['empty Content-Type header', ['{{base}}/empty-content-type', cb]],
  ['404 with text/html', ['{{base}}/not-found-html', cb]],
  ['404 with image/png', ['{{base}}/not-found-image', cb]],
  ['500 with image/png', ['{{base}}/server-error-image', cb]],
  ['204 with image/png', ['{{base}}/no-content-image', cb]],
  ['upper-case scheme', ['HTTP://127.0.0.1:{{PORT}}/image', cb]],
  ['localhost host name', ['{{localhost}}/image', cb]],
  ['user and password in the URL', ['http://user:secret@127.0.0.1:{{PORT}}/echo-auth', cb]],
  // Redirects.
  ['302 to an image', ['{{base}}/redirect-to-image', cb]],
  ['301 to an image', ['{{base}}/redirect-301-to-image', cb]],
  ['302 to HTML', ['{{base}}/redirect-to-html', cb]],
  ['302 to an image on another host', ['{{base}}/redirect-to-other-host-image', cb]],
  ['302 without a Location header, image type', ['{{base}}/redirect-without-location', cb]],
  ['302 to a file: URL', ['{{base}}/redirect-to-file-protocol', cb]],
  ['redirect loop', ['{{base}}/redirect-loop', cb]],
  ['credentials in the URL, redirected to another host', ['http://user:secret@127.0.0.1:{{PORT}}/auth-redirect-to-other-host', cb]],
  // Errors and time.
  ['connection refused', ['{{closed}}/image', cb]],
  ['https to a plain-HTTP port', ['https://127.0.0.1:{{PORT}}/image', cb]],
  ['ftp URL without an image extension', ['ftp://127.0.0.1:{{PORT}}/image', cb]],
  ['file: URL without an image extension', ['file://example.com/etc/passwd', cb]],
  ['protocol-relative URL (is-url accepts it, new URL() does not)', ['//example.com/cat', cb]],
  ['protocol-relative URL with an image extension', ['//example.com/cat.png', cb]],
  ['URL with an invalid port', ['http://127.0.0.1:99999/image', cb]],
  ['slow image within the timeout', ['{{base}}/slow-image?ms=300', cb, 2000]],
  ['slow image past the timeout', ['{{base}}/slow-image?ms=1500', cb, 300]],
  ['server never responds, timeout 300', ['{{base}}/never-responds', cb, 300]],
  ['image headers then a stalled body, timeout 300', ['{{base}}/headers-then-stall', cb, 300]],
  ['timeout given as a string', ['{{base}}/slow-image?ms=1500', cb, '300']],
  ['negative timeout', ['{{base}}/image', cb, -1]],
  ['8 MiB image body', ['{{base}}/big-image', cb]],
];

function portArgs(args) {
  return args.map(value => (typeof value === 'string' ? value.replaceAll('{{PORT}}', String(server.port)) : value));
}

// The CLI record keeps stdout whole and, from stderr, only the first line naming an error (a stack holds local paths).
function cliRecord(name, args, status, stdout, stderr) {
  const text = value => server.normalise(String(value)).replaceAll('\r\n', '\n');
  const errorLine = text(stderr).split('\n').find(line => /^\w*Error\b/.test(line));
  return {name, args, status, stdout: text(stdout), stderrError: errorLine ?? (text(stderr) === '' ? '' : '(stderr without an error line)')};
}

function runCli(name, args, options = {}) {
  const cli = path.join(path.dirname(require.resolve('is-an-image-url/package.json')), 'cli.js');
  const result = spawnSync(process.execPath, [cli, ...args.map(value => substitute(value))], {encoding: 'utf8', timeout: 30_000, ...options});
  return cliRecord(name, args, result.status, result.stdout, result.stderr);
}

async function main() {
  server = await fixtures.start();
  const cases = [];
  for (const [name, args, ...rest] of methodCases) {
    // {{PORT}} is a bare port inside a URL that {{base}} cannot express (upper-case scheme, credentials, https).
    // Recorded args keep the placeholder; the call gets the real port.
    const recorded = await runCase(name, portArgs(args), ...rest);
    recorded.args = encode(args);
    cases.push(recorded);
  }

  // The CLI runs in a child process; the fixture server keeps running in this one. The child's promise-free callback
  // prints once, so spawnSync blocks this process and the server cannot answer. Run the network CLI cases asynchronously.
  const cliCases = [
    runCli('no arguments', []),
    runCli('--help', ['--help']),
    runCli('--version', ['--version']),
    runCli('file name with an image extension', ['cat.png']),
    runCli('file name without an image extension', ['notes.txt']),
    runCli('number-like argument (yargs-parser makes it a number)', ['123']),
    runCli('two arguments (only the first is used)', ['cat.png', 'notes.txt']),
    runCli('an unknown flag before the input', ['--foo', 'cat.png']),
  ];
  const {spawn} = require('node:child_process');
  const cliPath = path.join(path.dirname(require.resolve('is-an-image-url/package.json')), 'cli.js');
  const runCliAsync = (name, args) => new Promise(resolve => {
    const child = spawn(process.execPath, [cliPath, ...args.map(value => substitute(value))]);
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', data => {
      stdout += data;
    });
    child.stderr.on('data', data => {
      stderr += data;
    });
    child.on('close', status => resolve(cliRecord(name, args, status, stdout, stderr)));
  });
  const beforeCli = server.requests.length;
  cliCases.push(
    await runCliAsync('URL served as image/png', ['{{base}}/image']),
    await runCliAsync('URL served as text/html', ['{{base}}/html']),
    await runCliAsync('connection refused', ['{{closed}}/image']),
  );
  const cliRequests = server.requests.slice(beforeCli);

  // Quirks: evidence that is machine- or timing-dependent, or about the dependencies, not asserted as golden values.
  const imageNow = require('is-image');
  const image300 = require('is-image-300');
  const probe = ['avif', 'jxl', 'heic', 'heif', 'jfif', 'webp', 'svg', 'ico', 'fs', 'int', 'max', 'raw', 'pi1', 'PI1', 'rgb', 'stl', 'vnd'];
  const quirks = {
    requireResult: typeof isAnImageUrl,
    functionName: isAnImageUrl.name,
    functionLength: isAnImageUrl.length,
    ownKeys: Reflect.ownKeys(isAnImageUrl).map(String),
    isImageVersionsDiffer: Object.fromEntries(probe.map(extension => [extension, {'3.0.0': image300(`a.${extension}`), '3.1.0': imageNow(`a.${extension}`)}]).filter(([, both]) => both['3.0.0'] !== both['3.1.0'])),
    isImageProbe: Object.fromEntries(probe.map(extension => [extension, imageNow(`a.${extension}`)])),
    bigImage: server.outcomes.bigImage,
    cliRequests,
    // Rounded to 100 ms so a second run writes the same file.
    elapsedMsRounded: Object.fromEntries(cases.filter(entry => entry.elapsedMs >= 250).map(entry => [entry.name, Math.round(entry.elapsedMs / 100) * 100])),
    proxyEnvironment: 'request 2.88 honours HTTP_PROXY, HTTPS_PROXY and NO_PROXY from the environment; the capture ran with none set',
  };
  for (const entry of cases) {
    delete entry.elapsedMs;
  }

  // Default timeout: no timeout argument, and 0, both fall back to 20 seconds. Run together to save time.
  const defaults = await Promise.all([
    (async () => {
      const started = Date.now();
      return new Promise(resolve => {
        isAnImageUrl(`${server.base}/never-responds`, result => resolve({argument: 'none', result, seconds: Math.round((Date.now() - started) / 1000)}));
      });
    })(),
    (async () => {
      const started = Date.now();
      return new Promise(resolve => {
        isAnImageUrl(`${server.base}/never-responds`, result => resolve({argument: 0, result, seconds: Math.round((Date.now() - started) / 1000)}), 0);
      });
    })(),
  ]);
  quirks.defaultTimeout = defaults;

  const dependency = name => require(`${name}/package.json`).version;
  const header = {
    package: `is-an-image-url@${packageVersion}`,
    dependencies: {'is-image': dependency('is-image'), 'is-url': dependency('is-url'), meow: dependency('meow'), request: dependency('request')},
    node: process.version,
    captured: new Date().toISOString().slice(0, 10),
    note: 'Golden outputs of the published 1.0.4 against test/golden/fixture-server.cjs; see capture-1.0.4.cjs and codec.cjs for the format.',
    quirks,
  };
  await server.close();
  const lines = cases.map(entry => JSON.stringify(entry));
  const cliLines = cliCases.map(entry => JSON.stringify(entry));
  process.stdout.write(`${JSON.stringify(header, null, '\t').slice(0, -2)},\n\t"cases": [\n\t\t${lines.join(',\n\t\t')}\n\t],\n\t"cli": [\n\t\t${cliLines.join(',\n\t\t')}\n\t]\n}\n`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
