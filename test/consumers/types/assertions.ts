/*
Compile-time checks on the published declaration files. The runner copies this file into each TypeScript fixture as index.ts, so
it is checked under that fixture's module and resolution settings (ESM and CommonJS under nodenext, bundler, node10).
Under nodenext CommonJS and node10 the declaration is the `export =` form; the default import then relies on esModuleInterop,
which those fixtures leave to TypeScript's default for their module setting.
*/
import isAnImageUrl, {isAnImageUrl as named} from 'is-an-image-url';

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;

// Compiles only when the argument is assignable to T.
declare function expectType<T>(value: T): void;

expectType<(url: string, callback: (isAnImage: boolean) => void, timeout?: number) => void>(isAnImageUrl);
expectType<(url: string, options?: {timeout?: number; signal?: AbortSignal}) => Promise<boolean>>(named);

const promised = isAnImageUrl('https://example.com/cat', {timeout: 5000, signal: AbortSignal.timeout(10_000)});
const called = isAnImageUrl('https://example.com/cat', (isAnImage: boolean) => {
  expectType<boolean>(isAnImage);
}, 5000);

export type Checks = [
  Expect<Equal<typeof promised, Promise<boolean>>>,
  Expect<Equal<typeof called, void>>,
];

export const fromNull: Promise<boolean> = named(null);

// A wrapper passing a callback it may not have: the union overload accepts it.
declare const maybeCallback: ((isAnImage: boolean) => void) | undefined;
export const wrapped: void | Promise<boolean> = isAnImageUrl('cat.png', maybeCallback);

// @ts-expect-error -- the url must be a string
isAnImageUrl(42, () => undefined);

// @ts-expect-error -- the callback receives a boolean, not a string
isAnImageUrl('cat.png', (isAnImage: string) => isAnImage);

// @ts-expect-error -- timeout in the options must be a number
isAnImageUrl('cat.png', {timeout: '5000'});
