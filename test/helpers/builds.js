import {createRequire} from 'node:module';

const load = createRequire(import.meta.url);

const esm = await import('../../dist/index.mjs');
const cjs = load('../../dist/index.cjs');

/**
Both published builds, so each suite runs in full against the ESM and the CommonJS output. `lib` is the function each one
hands a caller: the default export of the ES module, and what require() returns.
*/
export const builds = [
  {name: 'esm', lib: esm.default, module: esm},
  {name: 'cjs', lib: cjs, module: cjs},
];

export const {version} = load('../../package.json');
