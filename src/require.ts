// The CommonJS entry. 1.0.4 did `module.exports = isAnImageUrl`, so require() still returns the function. It also carries
// `.default` and `.isAnImageUrl`, the two shapes transpiled callers and named-import habits reach for.
// A default export is this entry's only export, so the build writes it as `module.exports =` (tsdown's cjsDefault).
import {isAnImageUrl} from './is-an-image-url.js';

type IsAnImageUrl = typeof isAnImageUrl & {
  default: typeof isAnImageUrl;
  isAnImageUrl: typeof isAnImageUrl;
};

const callable: IsAnImageUrl = Object.assign(isAnImageUrl, {
  default: isAnImageUrl,
  isAnImageUrl,
});

export default callable;
