# is-an-image-url

![A large magnifying glass inspecting a row of sealed envelopes on a desk, one envelope open revealing a small framed landscape painting inside](https://raw.githubusercontent.com/m4bwav/is-an-image-url/master/.github/images/banner.jpg)

[![npm version](https://img.shields.io/npm/v/is-an-image-url)](https://www.npmjs.com/package/is-an-image-url)
[![CI](https://github.com/m4bwav/is-an-image-url/actions/workflows/ci.yml/badge.svg)](https://github.com/m4bwav/is-an-image-url/actions/workflows/ci.yml)
[![npm downloads](https://img.shields.io/npm/dm/is-an-image-url)](https://www.npmjs.com/package/is-an-image-url)

Check whether a URL points to an image, from code or from the command line.

- If the path ends in an image file extension, the answer is `true` with no request.
- Otherwise the URL is requested, and the answer is `true` when the response is 2xx with a `Content-Type` of `image/...`. The body is not downloaded.
- No dependencies: it uses the platform's own `fetch`.
- ES module and CommonJS builds, with TypeScript types for both. Node 20 and newer, Bun and Deno.

## Install

```sh
npm install is-an-image-url
```

## Usage

### With a Promise

```js
import isAnImageUrl from 'is-an-image-url';

if (await isAnImageUrl('https://example.com/cat')) {
  console.log('an image');
}
```

Options: `timeout`, a positive number of milliseconds, is how long to wait for the response headers (default 20000); `signal` is an `AbortSignal` that cancels the check.

```js
await isAnImageUrl(url, {timeout: 5000, signal: controller.signal});
```

The Promise resolves `true` or `false`. A network error, a timeout or a server that says no all mean `false`. It rejects only when an argument has the wrong type (a `TypeError`) or the signal is aborted (with the signal's reason).

### With a callback, as in 1.x

```js
const isAnImageUrl = require('is-an-image-url');

isAnImageUrl(url, isAnImageResult => {
  if (isAnImageResult) {
    console.log('yes, the url was an image');
  } else {
    console.log('no, the url was not an image');
  }
});
```

The callback runs once, always after `isAnImageUrl` returns, with `true` or `false`. A third argument sets the timeout in milliseconds; as in 1.x, anything but a positive number means the default. `require()` returns the function; it also has `.default` and `.isAnImageUrl` pointing to itself.

### TypeScript

The types ship with the package, and cover both forms. The ES module build also exports the `IsAnImageUrlOptions` and `IsAnImageUrlCallback` types. The declarations use the global `AbortSignal`, so the project needs the `dom` lib or `@types/node`.

### Deno and Bun

```ts
import isAnImageUrl from 'npm:is-an-image-url';
```

Deno needs `--allow-net` for URLs that are requested. In Bun, `bun add is-an-image-url` and import it as above.

## How the answer is decided

1. `''`, `null` and `undefined` are `false`.
2. A string that does not look like a URL, such as a file name or a path, is answered from its extension: `photo.png` is `true`, `notes.txt` is `false`.
3. A URL whose path ends in an image extension is `true`, without a request, whatever the server would say. The query string and fragment don't count: `https://example.com/page?file=cat.png` is requested.
4. Other `http:` and `https:` URLs are requested with GET, following redirects. The answer is `true` when the final response has a 2xx status and a `Content-Type` starting with `image/`, in any case.
5. Everything else is `false`: other schemes, URLs with a user name or password (never requested), URLs the URL parser refuses, network errors and timeouts.

The extension list is is-image 3.1.0's, unchanged since 1.x. It has some surprises: `.fs`, `.int`, `.max` and `.raw` count as images, while `.avif` and `.jxl` don't. A URL ending in `.avif` is not answered from the extension; it is requested, and the server's `Content-Type` decides.

## Command line

```sh
npm install --global is-an-image-url
```

```text
$ is-an-image-url --help

  Check whether a URL points to an image.

  Usage
    $ is-an-image-url <url> [--timeout <ms>]

  Options
    --timeout <ms>  Give up after this many milliseconds (default 20000)
    --help, -h      Show this help
    --version, -v   Show the version

  Exit codes
    0  true or false was printed
    2  bad usage
```

It prints `true` or `false` and exits 0 either way. Without installing: `npx is-an-image-url <url>`.

## What it is not

- **Not a content check.** It trusts the server's `Content-Type` and the file extension; it does not read the bytes, so it cannot tell whether an "image" is a valid image.
- **Not a guard for untrusted URLs.** On a server it requests whatever URL it is given, internal addresses such as `127.0.0.1` or cloud metadata endpoints included, and it follows redirects to any host. An allow-list checked on the URL you pass in is therefore not enough, because the server can redirect elsewhere. Don't pass URLs from users unless the network itself stops requests to internal addresses (an egress proxy or firewall).
- **Limited in browsers.** A browser only lets it read the `Content-Type` of another site's response when that site sends CORS headers; otherwise the answer is `false`.

## Upgrading from 1.x

The callback form gives the same answers for everything 1.x got right. The differences are in [CHANGELOG.md](CHANGELOG.md): Node 20 or later, the callback is always asynchronous, 404 pages and responses without a `Content-Type` are `false`, `IMAGE/PNG` counts, and arguments of the wrong type throw a `TypeError`.

## License

MIT © [Mark Rogers](https://www.markdavidrogers.com). The extension list comes from [is-image](https://github.com/sindresorhus/is-image) by Sindre Sorhus and the URL pattern from [is-url](https://github.com/segmentio/is-url), both MIT; their notices are in [LICENSE](LICENSE).
