/*
The public API without a network: the export shapes, argument errors in both call forms, the options, and the two inlined
checks (is-image 3.1.0's extension list and is-url 1.2.4's pattern), table-driven. Every case here is answered without a
request; the fixture server is not started.
*/
import assert from 'node:assert/strict';
import {describe, test} from 'node:test';
import {builds} from '../helpers/builds.js';

// Answers the extension decides, for strings that are not URLs (or URLs is-url refuses), with no request.
const EXTENSION_ANSWERS = [
  ['photo.png', true],
  ['PHOTO.JPG', true],
  ['cat.GiF', true],
  ['archive.tar.gz', false],
  ['notes.txt', false],
  ['no-extension', false],
  ['.png', false],
  ['..png', true],
  ['folder.png/', true],
  ['folder.png/readme', false],
  ['a/b/c.webp', true],
  [String.raw`C:\pictures\cat.gif`, true],
  // POSIX paths on every platform (CHANGELOG: Changed): a backslash is part of the name. 1.0.4 on Windows answered these three the other way.
  ['foo.png\\', false],
  [String.raw`dir\.png`, true],
  ['c:.png', true],
  ['cat.png?size=large', false],
  ['example.com/cat.png', true],
  ['photo.avif', false],
  ['photo.jxl', false],
  ['program.fs', true],
  ['degas.PI1', false],
  ['degas.pi1', false],
  ['photo.heic', true],
  ['icon.svg', true],
  ['😀.png', true],
  // Is-url refuses these (a space, an IPv6 literal, a host without a dot), so the extension decides.
  ['http://exa mple.com/cat.png', true],
  ['http://[::1]/cat.png', true],
  ['http://[::1]/cat', false],
  ['http://intranet/cat', false],
];

// URLs answered without a request: an image extension in the path wins; other schemes, credentials and unparsable URLs are false.
const NO_REQUEST_ANSWERS = [
  ['https://example.invalid/cat.png', true],
  ['https://example.invalid/cat.PNG?w=10#top', true],
  ['ftp://example.invalid/cat.png', true],
  // eslint-disable-next-line no-script-url -- a string to check, never run: 1.0.4 answered it from the extension
  ['javascript://example.invalid/cat.png', true],
  ['ftp://example.invalid/cat', false],
  ['file://example.invalid/etc/passwd', false],
  ['//example.invalid/cat.png', false],
  ['http://127.0.0.1:99999/image', false],
  ['https://user:secret@example.invalid/cat', false],
  ['https://user@example.invalid/cat', false],
  ['https://:secret@example.invalid/cat', false],
];

for (const {name, lib, module} of builds) {
  describe(`API (${name} build)`, () => {
    test('the exports: the function, its default and named forms', () => {
      assert.equal(typeof lib, 'function');
      assert.equal(lib.name, 'isAnImageUrl');
      if (name === 'esm') {
        assert.deepEqual(new Set(Object.keys(module)), new Set(['default', 'isAnImageUrl']));
        assert.equal(module.isAnImageUrl, lib);
      } else {
        assert.equal(lib.default, lib);
        assert.equal(lib.isAnImageUrl, lib);
      }
    });

    test('file names and paths are answered by the extension (is-image 3.1.0\'s list)', async () => {
      for (const [input, expected] of EXTENSION_ANSWERS) {
        assert.equal(await lib(input), expected, input);
      }
    });

    test('some URLs are answered without a request', async () => {
      for (const [input, expected] of NO_REQUEST_ANSWERS) {
        assert.equal(await lib(input, {timeout: 1000}), expected, input);
      }
    });

    test('falsy urls answer false in both forms', async () => {
      for (const input of ['', undefined, null, 0, NaN, false]) {
        assert.equal(await lib(input), false);
        assert.equal(await new Promise(resolve => {
          lib(input, resolve);
        }), false);
      }
    });

    test('callback form: a url that is not a string throws a TypeError at once, naming its type', () => {
      for (const [input, type] of [[123, 'number'], [true, 'boolean'], [{}, 'object'], [['cat.png'], 'array'], [new Object('cat.png'), 'object']]) {
        assert.throws(() => lib(input, () => assert.fail('no callback')), {name: 'TypeError', message: `Expected \`url\` to be a string, got ${type}`});
      }
    });

    test('Promise form: a url that is not a string rejects with a TypeError', async () => {
      await assert.rejects(lib(123), {name: 'TypeError', message: 'Expected `url` to be a string, got number'});
    });

    test('a second argument that is neither a function nor an object throws a TypeError at once', () => {
      for (const [input, type] of [['not a function', 'string'], [5, 'number'], [true, 'boolean']]) {
        assert.throws(() => lib('cat.png', input), {name: 'TypeError', message: `Expected \`callback\` to be a function (or an options object), got ${type}`});
      }
    });

    test('options: wrong types reject with a TypeError naming the option', async () => {
      await assert.rejects(lib('cat.png', ['timeout']), {name: 'TypeError', message: 'Expected `options` to be an object, got array'});
      for (const timeout of [0, -1, NaN, Infinity, '300', null]) {
        await assert.rejects(lib('cat.png', {timeout}), {name: 'TypeError', message: /^Expected `options.timeout` to be a positive number of milliseconds, got /u});
      }

      await assert.rejects(lib('cat.png', {signal: {}}), {name: 'TypeError', message: 'Expected `options.signal` to be an AbortSignal, got object'});
      await assert.rejects(lib('cat.png', {signal: 'abort'}), {name: 'TypeError', message: 'Expected `options.signal` to be an AbortSignal, got string'});
    });

    test('options: null and an empty object mean the defaults', async () => {
      assert.equal(await lib('cat.png', null), true);
      assert.equal(await lib('cat.png', {}), true);
      assert.equal(await lib('cat.png', {timeout: 5, signal: new AbortController().signal}), true);
    });

    test('an already-aborted signal rejects with its reason, even for an answer that needs no request', async () => {
      const reason = new Error('stop');
      await assert.rejects(lib('cat.png', {signal: AbortSignal.abort(reason)}), error => error === reason);
    });

    test('the callback runs once, after the call returns, even when no request is needed', async () => {
      const calls = [];
      let isReturned = false;
      lib('cat.png', isImage => {
        calls.push({isImage, returned: isReturned});
      });
      isReturned = true;
      await new Promise(resolve => {
        setTimeout(resolve, 20);
      });
      assert.deepEqual(calls, [{isImage: true, returned: true}]);
    });

    test('the callback form returns undefined and the Promise form a Promise', () => {
      assert.equal(lib('cat.png', () => undefined), undefined);
      assert.ok(lib('cat.png') instanceof Promise);
    });
  });
}
