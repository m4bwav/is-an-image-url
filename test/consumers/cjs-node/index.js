// A consumer written in CommonJS: require() of the installed package, used exactly as 1.0.4's README showed it.
// This fixture proves the require() promise of plan D2: the module is the function, with .default and the named property.
// Its argument is the base URL of the fixture server the runner started.
'use strict';

const assert = require('node:assert/strict');
const process = require('node:process');
const isAnImageUrl = require('is-an-image-url');
// Destructuring, the named-import habit in CommonJS.
const {isAnImageUrl: named} = require('is-an-image-url');

const base = process.argv[2];

assert.match(require.resolve('is-an-image-url'), /[/\\]dist[/\\]index\.cjs$/u, 'require resolves to the CommonJS build');
assert.equal(typeof isAnImageUrl, 'function');
assert.equal(isAnImageUrl.default, isAnImageUrl);
assert.equal(isAnImageUrl.isAnImageUrl, isAnImageUrl);
assert.equal(named, isAnImageUrl);

assert.throws(() => isAnImageUrl(42, () => {}), TypeError);

// The old README's call, with a callback.
isAnImageUrl(`${base}/image`, isAnImageResult => {
  assert.equal(isAnImageResult, true);
  isAnImageUrl(`${base}/html`, isPageAnImage => {
    assert.equal(isPageAnImage, false);
    console.log('cjs-node ok');
  });
});
