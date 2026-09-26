// A TypeScript 5 consumer with an old CommonJS config: esModuleInterop off, node10 resolution. It type-checks the three import
// forms such projects write against the published declaration, then runs the compiled JavaScript.
import assert = require('node:assert/strict');
import isAnImageUrl = require('is-an-image-url');
import * as namespace from 'is-an-image-url';
import defaultImport, {isAnImageUrl as named} from 'is-an-image-url';

async function main(): Promise<void> {
  const results: boolean[] = await Promise.all([
    isAnImageUrl('photo.png'),
    isAnImageUrl.default('photo.png'),
    isAnImageUrl.isAnImageUrl('photo.png'),
    namespace('photo.png'),
    namespace.default('photo.png'),
    defaultImport('photo.png'),
    named('photo.png'),
  ]);

  assert.deepEqual(results, Array.from({length: 7}, () => true));
  isAnImageUrl('notes.txt', (isAnImage: boolean) => {
    assert.equal(isAnImage, false);
    console.log('ts5-cjs-interop-off ok');
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
