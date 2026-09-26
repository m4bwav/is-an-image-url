/*
The golden suite: the contract with the published 1.0.4. test/golden/1.0.4.json was captured from the published 1.0.4 by
capture-1.0.4.cjs in a scratch project, with codec.cjs, against fixture-server.cjs (which this suite starts too); never
regenerate it from this repository's code, and never loosen a comparison.

For every captured case, both builds must call the callback exactly once, asynchronously, with 1.0.4's answer as a boolean,
after the same sequence of requests (method and path). The cases 2.0.0 answers differently on purpose are the named
exceptions below, one per changelog line (plan D1 and items 2 to 12 of "What the old version gets wrong"). The Promise form
must give the same answer as the callback form for every case that has a callback.
*/
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {
  after,
  before,
  describe,
  test,
} from 'node:test';
import {builds} from '../helpers/builds.js';

const load = createRequire(import.meta.url);
const {decode} = load('./codec.cjs');
const fixtures = load('./fixture-server.cjs');

const golden = JSON.parse(readFileSync(new URL('1.0.4.json', import.meta.url), 'utf8'));

// Long enough for a second callback or a late request to show up on the local loop.
const SETTLE_MS = 50;
const MAX_WAIT_MS = 25_000;

const requestLine = request => `${request.method} ${request.path}`;

/*
Each exception names its changelog line and lists the cases it covers by the capture's own case names, then says what 2.0.0
does instead. `answer` replaces the callback's argument; `requests` replaces the request list ('none', the new list, or a check);
`throws` means the call throws that error class, with a message naming the argument, and calls nothing back;
`promise` means the call returns a Promise of that answer instead of calling back.
*/
const EXCEPTIONS = [
  {
    name: 'the answer is always true or false (CHANGELOG: Changed)',
    cases: {'no Content-Type header': {answer: false}, 'empty Content-Type header': {answer: false}},
  },
  {
    name: 'a response that is not 2xx is not an image (CHANGELOG: Changed)',
    cases: {
      '404 with image/png': {answer: false},
      '500 with image/png': {answer: false},
      '302 without a Location header, image type': {answer: false},
    },
  },
  {
    name: 'Content-Type is compared without regard to case (CHANGELOG: Fixed)',
    cases: {'upper-case IMAGE/PNG': {answer: true}},
  },
  {
    name: 'a string is-url accepts but the URL parser refuses answers false instead of throwing (CHANGELOG: Fixed)',
    cases: {
      'protocol-relative URL (is-url accepts it, new URL() does not)': {answer: false, requests: 'none'},
      'protocol-relative URL with an image extension': {answer: false, requests: 'none'},
      'URL with an invalid port': {answer: false, requests: 'none'},
    },
  },
  {
    name: 'the answer comes from the response headers; the body is not downloaded (CHANGELOG: Changed)',
    cases: {'image headers then a stalled body, timeout 300': {answer: true}},
  },
  {
    name: 'a url that is not a string throws a TypeError naming the argument (CHANGELOG: Changed)',
    cases: {
      number: {throws: 'url'},
      true: {throws: 'url'},
      object: {throws: 'url'},
      'array holding an image name': {throws: 'url'},
      'String wrapper object': {throws: 'url'},
    },
  },
  {
    name: 'called without a callback, isAnImageUrl returns a Promise of a boolean (CHANGELOG: Added)',
    cases: {
      // 1.0.4 threw before requesting; the Promise form makes the request.
      'no callback': {promise: true, requests: ['GET /image']},
      'no callback, empty url': {promise: false},
      'callback is null': {promise: true},
    },
  },
  {
    name: 'a callback that is not a function throws a TypeError naming the argument, before any request (CHANGELOG: Changed)',
    cases: {
      'callback is a string, non-URL path': {throws: 'callback'},
      'callback is a string, network path': {throws: 'callback', requests: 'none'},
    },
  },
  {
    name: 'a URL with a user name or password is not requested (CHANGELOG: Security)',
    cases: {
      'user and password in the URL': {requests: 'none'},
      'credentials in the URL, redirected to another host': {requests: 'none'},
    },
  },
  {
    name: 'requests use the platform\'s fetch, which follows 20 redirects where request followed 10 (CHANGELOG: Changed)',
    cases: {
      'redirect loop': {
        requests(lines) {
          assert.equal(lines.length, 21);
          assert.deepEqual(lines, ['GET /redirect-loop', ...Array.from({length: 20}, (_, hop) => `GET /redirect-loop?hop=${hop + 1}`)]);
        },
      },
    },
  },
];

const exceptionFor = entry => {
  for (const exception of EXCEPTIONS) {
    if (Object.hasOwn(exception.cases, entry.name)) {
      return {exception, change: exception.cases[entry.name]};
    }
  }

  return undefined;
};

// What 2.0.0 must do for a case: 1.0.4's recording, with the exception's changes applied.
function expectationFor(entry) {
  const expected = {
    answer: entry.calls.length === 1 ? decode(entry.calls[0].args)[0] : undefined,
    requests: entry.requests.map(request => requestLine(request)),
  };
  const found = exceptionFor(entry);
  if (!found) {
    return expected;
  }

  const {change} = found;
  if ('answer' in change) {
    expected.answer = change.answer;
  }

  if (change.requests === 'none') {
    expected.requests = [];
  } else if (typeof change.requests === 'function' || Array.isArray(change.requests)) {
    expected.requests = change.requests;
  }

  if (change.throws) {
    return {throws: change.throws, requests: expected.requests};
  }

  return 'promise' in change ? {promise: change.promise, requests: expected.requests} : expected;
}

let server;

before(async () => {
  server = await fixtures.start();
});

after(async () => {
  await server.close();
});

function substitute(value) {
  if (typeof value !== 'string') {
    return value;
  }

  return value
    .replaceAll('{{base}}', () => server.base)
    .replaceAll('{{localhost}}', () => `http://localhost:${server.port}`)
    .replaceAll('{{closed}}', () => `http://127.0.0.1:${server.closedPort}`)
    .replaceAll('{{PORT}}', () => String(server.port));
}

const sleep = ms => new Promise(resolve => {
  setTimeout(resolve, ms);
});

// Destroys the server's sockets, then gives the client's connection pool time to see them close. A request sent at once can
// go out on a pooled keep-alive socket that is already dead and fail without reaching the server (seen on Node 20, 22 and 26).
async function dropConnections() {
  server.dropConnections();
  await sleep(30);
}

// Runs one case the way the capture did: the recording callback in place of {$callback: true}, then waits for it.
async function run(lib, args) {
  const outcome = {calls: [], requests: []};
  const seen = server.requests.length;
  let isReturned = false;
  const callback = (...callbackArgs) => {
    outcome.calls.push({sync: !isReturned, args: callbackArgs});
  };

  const realArgs = decode(args).map(value => (value?.$callback === true ? callback : substitute(value)));
  try {
    outcome.returned = lib(...realArgs);
  } catch (error) {
    outcome.threw = error;
  }

  isReturned = true;
  if (outcome.returned instanceof Promise) {
    outcome.resolved = await outcome.returned;
  }

  const started = Date.now();
  while (outcome.calls.length === 0 && !outcome.threw && outcome.returned === undefined && Date.now() - started < MAX_WAIT_MS) {
    await sleep(10);
  }

  await sleep(SETTLE_MS);
  outcome.requests = server.requests.slice(seen).map(request => requestLine(request));
  await dropConnections();
  return outcome;
}

function assertOutcome(outcome, expected) {
  if (typeof expected.requests === 'function') {
    expected.requests(outcome.requests);
  } else {
    assert.deepEqual(outcome.requests, expected.requests, 'the requests (method and path, in order)');
  }

  if (expected.throws) {
    assert.ok(outcome.threw instanceof TypeError, `expected a TypeError, got ${outcome.threw}`);
    assert.match(outcome.threw.message, new RegExp(`^Expected \`${expected.throws}\` to be `, 'u'));
    assert.deepEqual(outcome.calls, []);
    return;
  }

  assert.equal(outcome.threw, undefined);
  if ('promise' in expected) {
    assert.ok(outcome.returned instanceof Promise, 'returns a Promise');
    assert.equal(outcome.resolved, expected.promise);
    assert.deepEqual(outcome.calls, []);
    return;
  }

  // CHANGELOG (Changed): the callback always runs after isAnImageUrl returns. 1.0.4 called it synchronously whenever no
  // request was needed; that flag is the one exception every case shares, so it is asserted here rather than listed.
  assert.equal(outcome.returned, undefined);
  assert.deepEqual(outcome.calls, [{sync: false, args: [expected.answer]}], 'exactly one asynchronous call with a boolean');
  assert.equal(typeof expected.answer, 'boolean');
}

const label = (index, entry) => `#${index} ${entry.name}`;

test('the capture holds 82 cases: 59 kept exactly and 23 named exceptions (plan D1)', () => {
  assert.equal(golden.package, 'is-an-image-url@1.0.4');
  assert.equal(golden.cases.length, 82);
  const counts = EXCEPTIONS.map(exception => golden.cases.filter(entry => exceptionFor(entry)?.exception === exception).length);
  // Every name in the table matches exactly one captured case.
  assert.deepEqual(counts, EXCEPTIONS.map(exception => Object.keys(exception.cases).length));
  assert.equal(counts.reduce((sum, count) => sum + count, 0), 23);
});

for (const {name, lib} of builds) {
  describe(`1.0.4 golden cases, callback form (${name} build)`, () => {
    for (const [index, entry] of golden.cases.entries()) {
      test(label(index, entry), async () => {
        assertOutcome(await run(lib, entry.args), expectationFor(entry));
      });
    }
  });

  describe(`1.0.4 golden cases, the same answers from the Promise form (${name} build)`, () => {
    for (const [index, entry] of golden.cases.entries()) {
      const expected = expectationFor(entry);
      const [url, callback, timeout] = decode(entry.args);
      if (callback?.$callback !== true || typeof expected.answer !== 'boolean') {
        continue;
      }

      test(label(index, entry), async () => {
        // The Promise form takes only a positive number of milliseconds; 1.0.4's fallbacks ('300', -1) mean the default.
        const options = typeof timeout === 'number' && timeout > 0 ? {timeout} : {};
        const seen = server.requests.length;
        const answer = await lib(substitute(url), options);
        await sleep(SETTLE_MS);
        const requests = server.requests.slice(seen).map(request => requestLine(request));
        await dropConnections();
        assert.equal(answer, expected.answer);
        if (typeof expected.requests === 'function') {
          expected.requests(requests);
        } else {
          assert.deepEqual(requests, expected.requests);
        }
      });
    }
  });
}
