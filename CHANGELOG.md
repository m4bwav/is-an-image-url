# Changelog

All notable changes to this package are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the package uses [Semantic Versioning](https://semver.org/).

## [2.0.0] - 2026-09-26

**The compatibility promise.** `require('is-an-image-url')` still returns the function, and `isAnImageUrl(url, callback)` calls back with the same answer 1.0.4 gave, as `true` or `false`, in every case 1.0.4 got right. The test suite checks this against 82 calls recorded from the published 1.0.4 against a local test server, on both builds and every supported Node line. The cases where 2.0.0 answers differently are listed under Changed and Fixed; each one was a wrong answer or a crash.

### Changed (breaking)

- Needs Node 20 or later. The package has an `exports` map, so deep imports such as `is-an-image-url/index.js` no longer resolve; import the package by its name.
- The callback always runs after `isAnImageUrl` returns. 1.0.4 called it before returning whenever no request was needed (a file name, a URL with an image extension, an empty url).
- The answer is always `true` or `false`. 1.0.4 called back with `undefined` for a response without a `Content-Type` header and with `''` for an empty one.
- A response that is not 2xx is not an image. 1.0.4 answered `true` for a 404 or 500 error page served with an image type, and for a redirect without a `Location` header.
- The answer comes from the response headers, and the body is not downloaded. 1.0.4 read every image to the end before answering, and answered `false` when the headers arrived but the body stalled past the timeout.
- A url that is not a string (and not empty), or a callback that is not a function, throws a `TypeError` naming the argument, before any request. 1.0.4 threw Node's own error from `path.extname` for the first, and for the second threw a `TypeError` or, after a request, crashed the process with an uncaught exception.
- A file path is read the POSIX way on every platform: only `/` separates folders. 1.0.4 used Node's `path` module, which on Windows also split on backslashes, so there `foo.png\` was an image and `dir\.png` was not; 2.0.0 answers both as 1.0.4 did on Linux and macOS.
- A redirect to a URL with a user name or password answers `false`: `fetch` refuses to follow it. 1.0.4 followed it.
- Requests use the platform's `fetch`: its request headers, and up to 20 redirects where `request` followed 10. `HTTP_PROXY` and `HTTPS_PROXY` are no longer read by default; Node reads them for `fetch` only when told to (`--use-env-proxy` or `NODE_USE_ENV_PROXY=1` on the Node lines that have them).

### Fixed

- The command-line tool works again: `is-an-image-url <url>` prints `true` or `false`, as 1.0.3 did. It had failed on every call since 1.0.4, `--help` included, because meow 5 no longer accepted its help text.
- `Content-Type` is compared without regard to case: `IMAGE/PNG` is an image.
- A string that looks like a URL but that the URL parser refuses (`//example.com/cat.png`, a port above 65535) answers `false`. 1.0.4 threw `TypeError: Invalid URL` from inside the call.

### Security

- A URL with a user name or password is answered `false` without a request. 1.0.4 sent the credentials, and on a redirect to another host it sent them to that host in the `Referer` header.
- No runtime dependencies. 1.x depends on the deprecated `request` package, whose tree carries a critical and two high advisories.

### Added

- Called without a callback, `isAnImageUrl(url, {timeout, signal})` returns a Promise of `true` or `false`. It rejects only for an argument of the wrong type, or with the reason of an aborted `signal`.
- ES module build with a default export and the named export `isAnImageUrl`; the CommonJS function also carries `.default` and `.isAnImageUrl`, both pointing to itself.
- TypeScript declarations for both builds.
- `--timeout <ms>`, `--help` and `--version` for the command-line tool; bad usage exits 2.
- Runs in Bun, Deno, workers and (for servers that allow it with CORS) browsers: the library uses only `fetch`, `URL`, `AbortController` and timers.
- Published from GitHub Actions through npm trusted publishing, with provenance.

### Kept

- A string that is not a URL, or a URL whose path ends in an image extension, is answered from the extension alone, without a request, whatever the server would say.
- The extension list is is-image 3.1.0's, unchanged: `.heic` and `.fs` count as images, `.avif` and `.jxl` do not (a URL ending in them is answered by the server instead).
- `''`, `null`, `undefined`, `0`, `NaN` and `false` answer `false`.
- Redirects are followed, to other hosts too; only `http:` and `https:` URLs are requested.
- The callback form's `timeout` argument is in milliseconds and defaults to 20 seconds; `0`, negative numbers, `Infinity` and strings mean the default. (The Promise form's `timeout` option rejects such values with a `TypeError`.) Timeouts longer than 2147483647 ms (about 24.8 days) are cut to that; 1.0.4 answered `false` at once for them.

## [1.0.4] - 2019-11-28

The last 1.x release: one CommonJS file on `request`, `is-image`, `is-url` and `meow`, with a command-line tool that fails on every call.

## [1.0.3] - 2017-08-18

[2.0.0]: https://github.com/m4bwav/is-an-image-url/compare/v1.0.4...HEAD
[1.0.4]: https://www.npmjs.com/package/is-an-image-url/v/1.0.4
[1.0.3]: https://www.npmjs.com/package/is-an-image-url/v/1.0.3
