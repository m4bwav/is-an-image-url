/*
Live smoke tests against real sites. Opt-in: they run under `npm run test:live` or with LIVE_TESTS=1, never in `npm test`,
because a site changing what it serves is not a bug in this package.
*/
import assert from 'node:assert/strict';
import process from 'node:process';
import {test} from 'node:test';
import isAnImageUrl from '../../dist/index.mjs';

const isEnabled = process.env.LIVE_TESTS === '1' || process.env.npm_lifecycle_event === 'test:live';

const SITES = [
  // An image served without a file extension: the Content-Type decides.
  ['https://avatars.githubusercontent.com/u/9919?v=4', true],
  ['https://example.com/', false],
  // The site 1.x's tests used.
  ['https://www.google.com/', false],
];

for (const [url, expected] of SITES) {
  test(`live: ${url}`, {skip: isEnabled ? false : 'live tests are opt-in: npm run test:live, or LIVE_TESTS=1'}, async () => {
    assert.equal(await isAnImageUrl(url, {timeout: 20_000}), expected);
  });
}
