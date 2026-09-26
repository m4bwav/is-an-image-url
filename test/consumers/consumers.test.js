/*
Consumer fixtures: install the package into a scratch project outside the repository, and use each published artifact the way a consumer would. Needs the network once to install TypeScript and the Node types into that project (the npm cache usually has them).

- By default the package is the tarball `npm pack` makes from the current dist/; `npm run test:consumers` builds dist/ first. CI builds once on Node 24 and runs this file directly on each Node line, because the build tools need Node 22.18 or later.
- CONSUMER_PACKAGE=is-an-image-url@<version> installs that version from the registry instead of packing; verify-published.yml checks a release this way.
- CONSUMER_RUNTIMES=bun,deno also runs the ES module fixture, the CommonJS fixture (Bun only) and the bin under Bun and Deno; the CI Bun and Deno jobs set it. A runtime it names must be installed.
- The fixtures that make requests talk to test/golden/fixture-server.cjs, which this file starts on 127.0.0.1; nothing here touches the internet after the install.
*/
import assert from 'node:assert/strict';
import {exec, execFile} from 'node:child_process';
import {
  access,
  cp,
  mkdtemp,
  rm,
  writeFile,
} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import path from 'node:path';
import process from 'node:process';
import {after, before, test} from 'node:test';
import {fileURLToPath} from 'node:url';

const load = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../..', import.meta.url));
const fixtures = fileURLToPath(new URL('.', import.meta.url));
const fixtureServer = load('../golden/fixture-server.cjs');

const RUNTIME_FIXTURES = ['esm-node', 'cjs-node'];
const TYPE_FIXTURES = ['ts-nodenext-esm', 'ts-nodenext-cjs', 'ts-bundler', 'ts-node10'];
// TypeScript 5 with esModuleInterop off, the import forms old CommonJS projects write (TypeScript 6 no longer allows turning interop off).
const TYPESCRIPT_5 = '5.9.3';
const TS5_FIXTURE = 'ts5-cjs-interop-off';
const RUNTIME_NAMES = {bun: 'Bun', deno: 'Deno'};

const registryPackage = process.env.CONSUMER_PACKAGE;
const runtimes = new Set((process.env.CONSUMER_RUNTIMES ?? '').split(',').map(name => name.trim()).filter(Boolean));

let workspace;
let server;

function settle(error, stdout, stderr) {
  return {
    code: error ? (error.code ?? 1) : 0, stdout, stderr, output: `${stdout}${stderr}`,
  };
}

// A shell command: npm and npx are .cmd shims on Windows, which only run through a shell.
function shell(command, cwd) {
  return new Promise(resolve => {
    exec(command, {cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024}, (error, stdout, stderr) => {
      resolve(settle(error, stdout, stderr));
    });
  });
}

// An executable run without a shell: node itself, bun, bunx or deno.
function run(file, arguments_, cwd) {
  return new Promise(resolve => {
    execFile(file, arguments_, {cwd, encoding: 'utf8'}, (error, stdout, stderr) => {
      resolve(settle(error, stdout, stderr));
    });
  });
}

function node(arguments_, cwd) {
  return run(process.execPath, arguments_, cwd);
}

async function mustSucceed(step, result) {
  const settled = await result;
  assert.equal(settled.code, 0, `${step} failed:\n${settled.output}`);
  return settled;
}

// Bun and Deno run only when CONSUMER_RUNTIMES asks for them.
function unlessRuntime(name) {
  return runtimes.has(name) ? false : `set CONSUMER_RUNTIMES=${name} to run the fixtures under ${RUNTIME_NAMES[name]}`;
}

before(async () => {
  workspace = await mkdtemp(path.join(tmpdir(), 'is-an-image-url-consumers-'));
  let spec = registryPackage;
  if (spec === undefined) {
    // Pack without lifecycle scripts, so stdout holds only npm's JSON and the tarball holds the dist/ under test.
    const packed = await mustSucceed('npm pack', shell(`npm pack --json --ignore-scripts --pack-destination "${workspace}"`, root));
    const [{filename}] = JSON.parse(packed.stdout);
    spec = `./${filename}`;
  }

  await writeFile(path.join(workspace, 'package.json'), `${JSON.stringify({name: 'consumer-workspace', private: true}, undefined, 2)}\n`);
  const typescript = load('typescript/package.json').version;
  const nodeTypes = load('@types/node/package.json').version;
  // --prefer-offline only for the tarball: a registry install must see a version published minutes ago.
  const offline = registryPackage === undefined ? ' --prefer-offline' : '';
  const packages = `"${spec}" typescript@${typescript} typescript5@npm:typescript@${TYPESCRIPT_5} @types/node@${nodeTypes}`;
  await mustSucceed('npm install', shell(`npm install --no-audit --no-fund${offline} ${packages}`, workspace));

  for (const fixture of [...RUNTIME_FIXTURES, ...TYPE_FIXTURES, TS5_FIXTURE]) {
    await cp(path.join(fixtures, fixture), path.join(workspace, fixture), {recursive: true});
  }

  for (const fixture of TYPE_FIXTURES) {
    await cp(path.join(fixtures, 'types', 'assertions.ts'), path.join(workspace, fixture, 'index.ts'));
  }

  server = await fixtureServer.start();
});

after(async () => {
  await server?.close();
  if (workspace && process.env.KEEP_CONSUMER_WORKSPACE === undefined) {
    await rm(workspace, {recursive: true, force: true});
  } else if (workspace) {
    console.log(`consumer workspace kept at ${workspace}`);
  }
});

test('esm-node: default and named imports from an ES module, both call forms, against the fixture server', async () => {
  const result = await node(['esm-node/index.js', server.base], workspace);
  assert.equal(result.code, 0, result.output);
  assert.equal(result.stdout.trim(), 'esm-node ok');
});

test('cjs-node: require() from a CommonJS module, as the old README showed it', async () => {
  const result = await node(['cjs-node/index.js', server.base], workspace);
  assert.equal(result.code, 0, result.output);
  assert.equal(result.stdout.trim(), 'cjs-node ok');
});

test(`${TS5_FIXTURE}: TypeScript ${TYPESCRIPT_5} with esModuleInterop off compiles import = require(), import * as and the default import, and the output runs`, async () => {
  const tsc = path.join(workspace, 'node_modules', 'typescript5', 'bin', 'tsc');
  const compiled = await node([tsc, '--project', TS5_FIXTURE], workspace);
  assert.equal(compiled.code, 0, compiled.output);
  const result = await node([path.join(TS5_FIXTURE, 'out', 'index.js')], workspace);
  assert.equal(result.code, 0, result.output);
  assert.equal(result.stdout.trim(), `${TS5_FIXTURE} ok`);
});

for (const fixture of TYPE_FIXTURES) {
  test(`${fixture}: the declaration files type-check`, async () => {
    const tsc = path.join(workspace, 'node_modules', 'typescript', 'bin', 'tsc');
    const result = await node([tsc, '--project', fixture], workspace);
    assert.equal(result.code, 0, result.output);
  });
}

test('bin: npx runs the installed is-an-image-url command', async () => {
  if (process.platform === 'win32') {
    await access(path.join(workspace, 'node_modules', '.bin', 'is-an-image-url.cmd'));
  }

  // --no: never download; the command must come from the installed package.
  const image = await shell(`npx --no is-an-image-url ${server.base}/image`, workspace);
  assert.equal(image.code, 0, image.output);
  assert.equal(image.stdout.trim(), 'true');
  const page = await shell(`npx --no is-an-image-url ${server.base}/html`, workspace);
  assert.equal(page.code, 0, page.output);
  assert.equal(page.stdout.trim(), 'false');
});

test('bun: the ES module fixture', {skip: unlessRuntime('bun')}, async () => {
  const result = await run('bun', ['esm-node/index.js', server.base], workspace);
  assert.equal(result.code, 0, result.output);
  assert.equal(result.stdout.trim(), 'esm-node ok');
});

test('bun: the CommonJS fixture', {skip: unlessRuntime('bun')}, async () => {
  const result = await run('bun', ['cjs-node/index.js', server.base], workspace);
  assert.equal(result.code, 0, result.output);
  assert.equal(result.stdout.trim(), 'cjs-node ok');
});

test('bun: bunx runs the installed bin on Bun', {skip: unlessRuntime('bun')}, async () => {
  // --bun: run under Bun despite the node shebang; --no-install: never download.
  const result = await run('bunx', ['--bun', '--no-install', 'is-an-image-url', `${server.base}/image`], workspace);
  assert.equal(result.code, 0, result.output);
  assert.equal(result.stdout.trim(), 'true');
});

// --node-modules-dir=manual: Deno resolves from the node_modules npm created, as Node does.
const DENO_RUN = ['run', '--allow-net', '--allow-read', '--node-modules-dir=manual'];

test('deno: the ES module fixture', {skip: unlessRuntime('deno')}, async () => {
  const result = await run('deno', [...DENO_RUN, 'esm-node/index.js', server.base], workspace);
  assert.equal(result.code, 0, result.output);
  assert.equal(result.stdout.trim(), 'esm-node ok');
});

test('deno: the bin', {skip: unlessRuntime('deno')}, async () => {
  const result = await run('deno', [...DENO_RUN, 'node_modules/is-an-image-url/dist/cli.mjs', `${server.base}/image`], workspace);
  assert.equal(result.code, 0, result.output);
  assert.equal(result.stdout.trim(), 'true');
});
