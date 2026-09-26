/*
The command line tool, run as a child process from dist/cli.mjs against the local fixture server. 1.0.4's CLI crashed on every
call (golden `cli` records); 2.0.0 prints true or false as 1.0.3 did and exits 0 either way (plan D6).
*/
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import process from 'node:process';
import {after, before, test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {version} from '../helpers/builds.js';

const fixtures = createRequire(import.meta.url)('../golden/fixture-server.cjs');
const cli = fileURLToPath(new URL('../../dist/cli.mjs', import.meta.url));

let server;

before(async () => {
  server = await fixtures.start();
});

after(async () => {
  await server.close();
});

function run(...arguments_) {
  return new Promise(resolve => {
    execFile(process.execPath, [cli, ...arguments_], {encoding: 'utf8'}, (error, stdout, stderr) => {
      resolve({code: error ? error.code : 0, stdout, stderr});
    });
  });
}

test('the first line of dist/cli.mjs is the shebang, with LF line endings', async () => {
  const text = await readFile(cli, 'utf8');
  assert.equal(text.split('\n', 1)[0], '#!/usr/bin/env node');
  assert.ok(!text.includes('\r'), 'no carriage returns');
});

test('prints true for an image and false for anything else, and exits 0 either way', async () => {
  for (const [input, expected] of [
    ['cat.png', 'true'],
    ['notes.txt', 'false'],
    ['123', 'false'],
    [`${server.base}/image`, 'true'],
    [`${server.base}/html`, 'false'],
    [`${server.base}/not-found-image`, 'false'],
    [`http://127.0.0.1:${server.closedPort}/image`, 'false'],
  ]) {
    const {code, stdout, stderr} = await run(input);
    assert.equal(code, 0, input);
    assert.equal(stdout, `${expected}\n`, input);
    assert.equal(stderr, '', input);
  }
});

test('--timeout bounds the wait', async () => {
  const started = Date.now();
  const {code, stdout} = await run('--timeout', '200', `${server.base}/never-responds`);
  assert.equal(code, 0);
  assert.equal(stdout, 'false\n');
  assert.ok(Date.now() - started < 5000);
  server.dropConnections();
  const slow = await run('--timeout=2000', `${server.base}/slow-image?ms=100`);
  assert.equal(slow.stdout, 'true\n');
});

test('no URL prints the usage on stderr and exits 2', async () => {
  const {code, stdout, stderr} = await run();
  assert.equal(code, 2);
  assert.equal(stdout, '');
  assert.match(stderr, /^error: a URL is required\n/u);
  assert.match(stderr, /Usage/u);
});

test('two URLs, an unknown option, or a bad --timeout exit 2 without a stack trace', async () => {
  const two = await run('cat.png', 'notes.txt');
  assert.equal(two.code, 2);
  assert.match(two.stderr, /^error: give one URL at a time\n/u);
  const unknown = await run('--foo', 'cat.png');
  assert.equal(unknown.code, 2);
  assert.match(unknown.stderr, /--foo/u);
  for (const timeout of ['--timeout=abc', '--timeout=0', '--timeout=-5']) {
    const bad = await run(timeout, 'cat.png');
    assert.equal(bad.code, 2, timeout);
    assert.match(bad.stderr, /--timeout takes a positive number of milliseconds/u);
  }

  for (const result of [two, unknown]) {
    assert.doesNotMatch(result.stderr, /\n[\t ]+at /u, 'no stack trace');
  }
});

test('--help and -h print the usage on stdout and exit 0', async () => {
  for (const flag of ['--help', '-h']) {
    const {code, stdout, stderr} = await run(flag);
    assert.equal(code, 0);
    assert.match(stdout, /Usage\n\s+\$ is-an-image-url <url>/u);
    assert.equal(stderr, '');
  }
});

test('--version and -v print the package version', async () => {
  for (const flag of ['--version', '-v']) {
    const {code, stdout} = await run(flag);
    assert.equal(code, 0);
    assert.equal(stdout, `${version}\n`);
  }
});
