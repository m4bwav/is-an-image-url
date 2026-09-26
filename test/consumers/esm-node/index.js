// A consumer written as an ES module: default and named imports of the installed package. Runs under Node, Bun and Deno.
// Its argument is the base URL of the fixture server the runner started (test/golden/fixture-server.cjs).
import assert from 'node:assert/strict';
import process from 'node:process';
import isAnImageUrl, {isAnImageUrl as named} from 'is-an-image-url';

const base = process.argv[2];

assert.equal(typeof isAnImageUrl, 'function');
assert.equal(isAnImageUrl, named, 'the default export is the named export');
if (typeof import.meta.resolve === 'function') {
  assert.match(import.meta.resolve('is-an-image-url'), /\/dist\/index\.mjs$/u, 'import resolves to the ESM build');
}

// Answered from the extension alone.
assert.equal(await isAnImageUrl('photo.png'), true);
assert.equal(await isAnImageUrl('notes.txt'), false);
assert.equal(await isAnImageUrl(`${base}/missing.png`), true);

// Answered by the fixture server, through this runtime's fetch.
assert.equal(await isAnImageUrl(`${base}/image`), true);
assert.equal(await isAnImageUrl(`${base}/html`), false);
assert.equal(await isAnImageUrl(`${base}/not-found-image`), false);
assert.equal(await isAnImageUrl(`${base}/redirect-to-image`), true);
assert.equal(await isAnImageUrl(`${base}/image-uppercase-type`, {timeout: 5000}), true);
assert.equal(await isAnImageUrl(`${base}/never-responds`, {timeout: 200}), false);

// The callback form, always asynchronous.
let isReturned = false;
const answer = await new Promise(resolve => {
  isAnImageUrl('photo.png', isImage => {
    assert.ok(isReturned, 'the callback runs after isAnImageUrl returns');
    resolve(isImage);
  });
  isReturned = true;
});
assert.equal(answer, true);

await assert.rejects(isAnImageUrl(42), TypeError);

console.log('esm-node ok');
