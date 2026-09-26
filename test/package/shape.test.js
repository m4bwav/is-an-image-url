/*
The package-shape suite. Every assertion here guards a promise the plan made: what ships, that the builds are portable, and
that require() returns the function (plan D2) while import sees a default and a named export.
*/
import assert from 'node:assert/strict';
import {exec} from 'node:child_process';
import {access, readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const root = fileURLToPath(new URL('../..', import.meta.url));
const read = file => readFile(new URL(`../../${file}`, import.meta.url), 'utf8');
const packageJson = JSON.parse(await read('package.json'));

// Exactly what `npm pack` may contain: the CLI ships without its map (`files` excludes it).
const PUBLISHED_FILES = [
  'CHANGELOG.md',
  'LICENSE',
  'README.md',
  'dist/cli.mjs',
  'dist/index.cjs',
  'dist/index.cjs.map',
  'dist/index.d.cts',
  'dist/index.d.mts',
  'dist/index.mjs',
  'dist/index.mjs.map',
  'package.json',
];

// Set from the first build and written in the plan; the two source maps are usually most of it.
const TARBALL_BUDGET = 25_000;

test('the tarball holds exactly the built files and the docs, and stays under the size budget', async () => {
  // --ignore-scripts: prepack would rebuild dist/ while the other test files are reading it.
  const stdout = await new Promise((resolve, reject) => {
    exec('npm pack --dry-run --json --ignore-scripts', {cwd: root, encoding: 'utf8'}, (error, output) => {
      if (error) {
        reject(error);
      } else {
        resolve(output);
      }
    });
  });
  const [packed] = JSON.parse(stdout);
  assert.deepEqual(new Set(packed.files.map(file => file.path)), new Set(PUBLISHED_FILES));
  assert.ok(packed.size < TARBALL_BUDGET, `the tarball is ${packed.size} bytes`);
});

test('package.json: entry points exist, no runtime dependencies, the Node floor', async () => {
  assert.equal(packageJson.type, 'module');
  assert.deepEqual(packageJson.exports, {
    '.': {import: './dist/index.mjs', require: './dist/index.cjs'},
    './package.json': './package.json',
  });
  assert.equal(packageJson.main, './dist/index.cjs');
  assert.equal(packageJson.module, './dist/index.mjs');
  assert.equal(packageJson.types, './dist/index.d.cts');
  assert.deepEqual(packageJson.bin, {'is-an-image-url': './dist/cli.mjs'});
  for (const file of ['dist/index.mjs', 'dist/index.cjs', 'dist/index.d.mts', 'dist/index.d.cts', 'dist/cli.mjs']) {
    await access(new URL(`../../${file}`, import.meta.url));
  }

  // A runtime dependency needs a decision entry; the default is none.
  assert.deepEqual(packageJson.dependencies ?? {}, {});
  assert.equal(packageJson.engines.node, '>=20');
  assert.equal(packageJson.sideEffects, false);
  // Trusted publishing matches this URL exactly.
  assert.equal(packageJson.repository.url, 'git+https://github.com/m4bwav/is-an-image-url.git');
});

test('the builds use nothing Node-specific or browser-specific, so they run in browsers, Deno, Bun and workers', async () => {
  for (const file of ['dist/index.mjs', 'dist/index.cjs']) {
    const code = await read(file);
    assert.doesNotMatch(code, /\bnode:/u, `${file} imports a node: module`);
    assert.doesNotMatch(code, /\brequire\(/u, `${file} calls require()`);
    assert.doesNotMatch(code, /\bprocess\./u, `${file} uses process`);
    assert.doesNotMatch(code, /\bBuffer\b/u, `${file} uses Buffer`);
    assert.doesNotMatch(code, /\b__(?:dirname|filename)\b/u, `${file} uses __dirname or __filename`);
    assert.doesNotMatch(code, /\b(?:window|document)\b/u, `${file} uses a browser global`);
  }
});

test('the CommonJS build runs in a bare ECMAScript context given only fetch, URL, AbortController and timers', async () => {
  const requested = [];
  const fakeFetch = async url => {
    requested.push(url);
    return new Response(null, {status: 200, headers: {'content-type': 'image/png'}});
  };

  const context = vm.createContext({
    module: {exports: {}},
    fetch: fakeFetch,
    URL,
    AbortController,
    setTimeout,
    clearTimeout,
    queueMicrotask,
  });
  context.exports = context.module.exports;
  vm.runInContext(await read('dist/index.cjs'), context);
  const library = context.module.exports;
  assert.equal(typeof library, 'function');
  assert.equal(library.default, library);
  assert.equal(await library('photo.png'), true);
  assert.equal(await library('https://example.invalid/cat'), true);
  assert.deepEqual(requested, ['https://example.invalid/cat']);
  assert.equal(await new Promise(resolve => {
    library('notes.txt', resolve);
  }), false);
});

test('the declaration files need no Node types', async () => {
  for (const file of ['dist/index.d.mts', 'dist/index.d.cts']) {
    const types = await read(file);
    assert.doesNotMatch(types, /\bNodeJS\.|\bBuffer\b|node:|reference types=/u, file);
    assert.doesNotMatch(types, /sourceMappingURL/u, `${file} points at a declaration map that is not published`);
  }
});

test('the declaration files describe the two shapes: default and named in ESM, the callable `export =` in CommonJS', async () => {
  const [esm, cjs] = await Promise.all([read('dist/index.d.mts'), read('dist/index.d.cts')]);
  for (const signature of [
    'function isAnImageUrl(url: string | null | undefined, callback: IsAnImageUrlCallback, timeout?: number): void;',
    'function isAnImageUrl(url: string | null | undefined, options?: IsAnImageUrlOptions): Promise<boolean>;',
  ]) {
    assert.ok(esm.includes(`declare ${signature}`), esm);
    assert.ok(cjs.includes(`declare ${signature}`), cjs);
  }

  assert.match(esm, /export \{ .*isAnImageUrl as default.* \};/u);
  assert.match(esm, /IsAnImageUrlOptions/u);
  assert.match(cjs, /\nexport = callable;/u);
  assert.doesNotMatch(cjs, /\nexport (?:\{|default|declare)/u, 'the CommonJS declaration has no ESM-style exports');
});
