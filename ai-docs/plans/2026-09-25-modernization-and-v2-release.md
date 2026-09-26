---
title: Modernization and v2 release
kind: plan
status: active
date: 2026-09-25
verified: 2026-09-25
stale_after: never
tags: [v2, plan, npm, github-actions, tests, release, golden, fetch, cli]
summary: "the living plan for is-an-image-url 2.0.0: survey, what 1.0.4 gets wrong (a CLI that crashes since 2019, non-boolean answers, status ignored, sync throws), decisions D1-D16, the v2 API with a Promise form, build and test strategy with a local fixture server, phases 0-7 with checkboxes, dispositions of 17 pull requests and 18 branches, security, verification checklist"
---

# Modernization and v2.0.0 release plan: is-an-image-url

The second run of the package-modernize skill (github.com/m4bwav/package-modernize, skills/package-modernize/SKILL.md and references/npm.md) and the first on a package that makes network requests. Models: replace-string-at-position 2.0.0 (the last finished run, for the callable CommonJS shape and the golden codec) and get-title-at-url 3.0.0 (for replacing `request` with the platform's `fetch`, a local fixture server and a CLI). Evidence goes to [../log.md](../log.md); the survey is [../notes/2026-09-25-phase-0-survey-baseline-and-dependents.md](../notes/2026-09-25-phase-0-survey-baseline-and-dependents.md); the capture of the published 1.0.4 is `test/golden/1.0.4.json` (82 function cases and 11 CLI cases, recorded against `test/golden/fixture-server.cjs`). Where the skill was silent or wrong, the fix went into the skill the same day and a line into the log.

## Status

Released: 2.0.0 on npm under latest, 2026-09-26; only the 1.x deprecation remains. Phases 0 and 1 done on 2026-09-25. **Plan review done 2026-09-26: the maintainer accepted every recommendation** (confirmed in the session): D1 fixes in both forms, D3b is-image 3.1.0's list exactly, D4 2.0.0 then deprecate 1.x, D6 restore the CLI with exit 0 for `false`; OKs given for D10 (18 branch deletions), D11 (3 webhooks) and D14 (settings, everlast sync push). Phase 2 started 2026-09-26.

## Goal

- `require('is-an-image-url')` still returns the function and the 2019 callback call `isAnImageUrl(url, callback)` gives 1.0.4's answer for every case where that answer was right; `import` works too, with types for both.
- Calling it without a callback returns a Promise of a boolean: the modern form, with an options object (timeout, AbortSignal).
- The CLI in the README works again (it has crashed on every call since 1.0.4).
- Zero runtime dependencies: the platform's `fetch` replaces the deprecated `request`, and the two tiny checks (is-url's pattern, is-image's extension list) are inlined with their MIT notices; the CLI uses `node:util` `parseArgs` instead of meow. `npm test` never touches the network.
- Released through npm trusted publishing in staged mode, approved by the maintainer, verified from the registry.

## Where it stands (survey 2026-09-25)

| Fact | Value | Evidence |
|---|---|---|
| Published version, date, downloads a month, dependents | 1.0.4, 2019-11-28; 27 last month (4 to 77 over the year); registry count 1; found by name: markdown-plain-link-replacer (the maintainer's, calls it), wise-team/engrave (pins 1.0.3, no call site), pbadilla/brands (`^1.0.4`, no call site) | survey note |
| Source, build, tests, language level | `index.js` (68 lines) and `cli.js` (24 lines), ES2019 CommonJS (optional catch binding), no build; `test.js` with 5 ava 2 tests, two of them against www.google.com; xo 0.25, nyc 14, snyk, coveralls, codecov.io | survey note |
| Entry points and how the old README says to call it | `main: index.js`, `module.exports = isAnImageUrl`; `bin: is-an-image-url` → `cli.js`; README: `var isAnImageUrl = require('is-an-image-url'); isAnImageUrl(url, function (isAnImageResult) {...})` and a global CLI | survey note, capture quirks |
| Runtime dependencies and distance from current | published: is-image ^3.0.0 (3.1.0 resolves; 4.0.0 ESM-only), is-url ^1.2.4 (current), meow ^5.0.0 (14.1.0 current), request ^2.88.0 (deprecated); master says meow ^6.1.0 (unpublished) | survey |
| Issues, pull requests (by author and kind), forks | 0 issues; 17 open pull requests: 13 Dependabot (#7, #8, #10 to #17, #19 to #21), 4 Snyk (#9 snyk-bot; #22, #23, #24 through the Snyk integration under the maintainer's name); 18 stale branches (those 17 plus `mime-issue`); forks adrian-hintze/is-image-url-async (its own package) and gitter-badger | survey |
| Dependabot alerts, webhooks, secrets, security features | 95 open alerts (runtime scope: ajv, uuid, tough-cookie, request, qs, semver, json-schema); webhooks Snyk 14564187 and 278447878, Travis 77226418; no secrets; scanning and push protection off; workflow permissions write | survey |
| Dead services (badge, config, webhook, app for each) | Travis, Snyk (with a misspelled `.synk` file), Coveralls, codecov, David, Gitter, nodei.co; table in the survey note | survey note |
| README images and badges | 9 images, the same in the repository and the tarball; 6 to fix (nodei.co, Travis, David, Coveralls, Snyk, Gitter), 3 fine (npm version, total downloads, XO) | survey note, `check-readme-images.mjs` |
| Leaked credentials | none in files or history | survey note |
| Baseline: old build and tests as they are | `npm test` exits 1 (xo 0.25 crashes on Node 24); nyc 14 crashes; ava 2.4 alone passes 5 of 5, using the internet | survey note |
| Golden capture: cases, quirks, claims confirmed or refuted | 82 cases and 11 CLI runs from the published 1.0.4 on Node 24.18.0 against a local fixture server; two runs identical. Refuted: "it has a CLI (meow)" (the CLI crashes on every call since 1.0.4); "meow ^5" is right for the published version but the repository says ^6.1.0. Confirmed: downloads, 17 pull requests (13 and 4), 95 alerts, dead Snyk (2 webhooks) and Travis, two forks | `test/golden/1.0.4.json` |

## What the old version gets wrong, confirmed, and what v2 does

Case numbers index `cases` in `test/golden/1.0.4.json`; C numbers index `cli`.

1. **The CLI crashes on every call** (C0 to C10): `TypeError: (options.help || "").replace is not a function`, because meow 5 takes `help` as a string and cli.js passes an array (meow 3.7.0 in 1.0.3 accepted it). v2: a new CLI on `parseArgs` that prints `true` or `false` as 1.0.3 did (D6). Changelog: "Fixed: the command line tool works again; it had failed on every call since 1.0.4."
2. **The answer is not always a boolean.** No Content-Type calls back `undefined` (51), an empty one `''` (52). v2: `false`. Changelog: "Changed: the answer is always `true` or `false`."
3. **The HTTP status is ignored.** A 404 or 500 with an image type is `true` (54, 55), and so is a 302 without a Location header (64). The old test "Shouldn't work with a 404" shows the intent was the opposite. v2: only a 2xx final response can be an image; 204 with an image type stays `true` (56, 2xx). Changelog: "Changed: a response that is not 2xx is not an image."
4. **Media types compared case-sensitively.** `IMAGE/PNG` is `false` (48); media types are case-insensitive. v2: `true`. Changelog: "Fixed: `Content-Type` is compared without regard to case."
5. **The callback sometimes runs synchronously**: every answer that needs no request (0 to 26, 37 to 39, 43, 44, 70, 71). v2: always asynchronously (a microtask). The values stay the same. Changelog: "Changed: the callback always runs after `isAnImageUrl` returns."
6. **Some URLs throw instead of answering.** Protocol-relative URLs and invalid ports throw `TypeError: Invalid URL` synchronously (72 to 74), which would reject the dependent's `Promise.all`. v2: `false`. Changelog: "Fixed: a string is-url accepts but the URL parser refuses answers `false` instead of throwing."
7. **A non-function callback crashes the process** on the network path (36, an uncaught exception after the request) and throws a TypeError on the others (35). v2: a TypeError before anything else. Changelog line with item 9.
8. **The whole body is downloaded, and a stalled body turns an image into `false`.** An 8 MiB image is read to the end before the answer (81, quirks `bigImage`); image headers followed by a stalled body time out as `false` (78). v2: answers from the headers and cancels the body, so 78 becomes `true`. Changelog: "Changed: the answer comes from the response headers; the body is not downloaded."
9. **No callback throws**, even for an empty url (32 to 34). v2: no callback returns a Promise (D6). Changelog: "Added: called without a callback, `isAnImageUrl` returns a Promise of a boolean."
10. **Truthy non-strings throw Node's own error** from `path.extname` (27 to 31, `ERR_INVALID_ARG_TYPE`). v2: a TypeError with the package's message (class kept, message changed). Same changelog line as 7: "Changed: a url that is not a string, or a callback that is not a function, throws a TypeError naming the argument."
11. **Credentials in the URL are sent, and leak on redirect**: request sends `authorization: Basic ...`, and on a cross-host redirect it sends `referer: http://user:secret@...` to the other host (59, 67). Both answer `false` in the capture (the route is not an image). v2: the platform's `fetch` refuses such URLs, so the answer is `false` with no request; the answer is unchanged, the request list is a named exception. Changelog: "Security: a URL with a user name or password is not requested (1.0.4 sent the credentials, and leaked them in the Referer header on a redirect to another host)."
12. **Requests differ** (every network case): fetch sends `accept`, `accept-language`, `sec-fetch-mode`, `user-agent: node` and `accept-encoding` where request sent only `host` and `connection`; a redirect loop stops after 21 requests instead of 11 (66). v2: accepted; the golden test compares each case's method and path sequence and names 66, 59 and 67 as exceptions. Changelog: "Changed: requests use the platform's fetch (its headers, 20 redirects)." HTTP_PROXY is no longer read unless Node is told to (recheck in Phase 2).
13. **Kept, and documented:** the extension check runs first and wins over the network (37 to 39, 43, 44); non-URL strings go by extension (0 to 8, 20); IPv6 literal URLs are never requested (9, 10); is-image 3.1.0's extension list exactly, `.fs`, `.int`, `.max` and `.raw` in, `.avif`, `.jxl` and `.pi1` out (11 to 17, D3b); falsy urls answer `false` (21 to 26); redirects are followed, across hosts too (60 to 63); the timeout argument (default 20 s; `0`, negative and string values fall back to it, 79, 80); `ftp:`, `file:` and `javascript:` URLs (43, 44, 65, 70, 71).

## Decisions (recommendation first; the maintainer rules in the plan review, silence means the recommendation stands)

| # | Question | Recommendation | Why | Alternative |
|---|---|---|---|---|
| D1 | The compatibility promise | The callback form gives 1.0.4's answer, as a boolean, for every captured case except the named exceptions in items 2 to 11 above: 51, 52 (non-boolean), 54, 55, 64 (status), 48 (case), 72 to 74 (invalid URLs), 78 (stalled body), 27 to 36 (argument errors: class kept where 1.0.4 threw a TypeError). The golden suite asserts every other case's value exactly on both builds, and every network case's method and path sequence except 59, 66 and 67. The synchronous-callback flag is one global exception. A later fix that would change a kept answer goes under a new name or option. | These are the answers a caller can have relied on; the exceptions are answers nobody wants (`undefined`, a 404 page counted as an image, a crash). The one real dependent only tests truthiness and passes strings from `url-regex`. | Keep every captured answer exact in the callback form and put the fixes only in the new Promise form (two behaviours behind one name; the code carries both paths for one major). |
| D2 | Export shape | CommonJS: `require()` returns the function, which also carries `.default` and `.isAnImageUrl` pointing to itself (the replace-string-at-position recipe: two tsdown configs, hand-written entry points, the `'use strict'` banner, a TypeScript 5.9 interop-off fixture). ESM: a default export and the named export. Types: overloads for the callback and the Promise forms, `.d.cts` with `export =`, `.d.mts` with both exports; attw green in all four modes. | Keeps the 2017 call pattern; the recipe is verified. | ESM named export only and `require()` returning a namespace: breaks every existing caller for no gain. |
| D3 | Behaviour at the edges, per case | a) The fixes in items 2 to 11, each a changelog line. b) Keep is-image 3.1.0's extension list exactly, inlined, `.avif` and `.jxl` included as not-images (they are answered by the network when the URL is fetched). c) A URL with credentials: `false`, no request. d) Timeout: a positive finite number of milliseconds; anything else means 20 s, as 1.0.4 did; it bounds the whole wait for the response headers (request's covered connect and idle time). e) Redirects: follow with fetch's limit; only `http:` and `https:` are requested. | a is the table in D1; b keeps the golden file exact and a list change is a feature for a minor with its own golden file; c is what fetch does and closes the credential leak; d keeps every captured timeout answer. | b: add `.avif` and `.jxl` in 2.0.0 (cases 11 and 12 become exceptions) and drop the false positives `.fs`, `.int`, `.max`. c: strip the credentials and request anyway. |
| D4 | Whether a major is warranted, and what a patch could do instead | 2.0.0. The package shape changes (exports map, ESM, types, Node floor), the callback no longer runs synchronously, and D1's exceptions change answers. No 1.x release. After 2.0.0 is verified, you deprecate 1.x: `npm deprecate is-an-image-url@"<2" "1.x depends on the deprecated request package and its CLI is broken; use 2.x"` (2FA, your hands). | A patch, 1.0.5, could ship meow's `help` as a string (the CLI works again) and request 2.88.2; it would still carry request's seven runtime alerts and a second release pipeline. 1.x's runtime tree has a critical (json-schema) and high (qs, semver) advisory that no 1.x fix removes, which is the case for the deprecation. | No deprecation: markdown-plain-link-replacer and pbadilla/brands keep installing 1.0.4 silently. |
| D5 | Runtime dependencies | None. `fetch` and `URL` replace request; is-url's two-level pattern (MIT, segmentio, 20 lines) and is-image 3.1.0's extension list (MIT, Sindre Sorhus) are inlined in `src/` with a `/*!` notice the build keeps and both licences appended to LICENSE; the CLI uses `node:util` `parseArgs`. | Every dependency here is either deprecated (request), ESM-only in its next major (is-image 4), or a few lines; zero dependencies ends the alert stream. | Keep is-url as a dependency (current, unchanged since 2017, CommonJS only). |
| D6 | Names | Keep `isAnImageUrl(url, callback, timeout?)`. Add the Promise form on the same name: `isAnImageUrl(url, options?)` returns `Promise<boolean>`, options `{timeout?: number, signal?: AbortSignal}`; one sentence of why: callbacks are the 2017 idiom and every current caller awaits. Restore the CLI: `is-an-image-url <url>` prints `true` or `false` and exits 0 either way, as 1.0.3 did; `--help`, `--version`, `--timeout <ms>`; no input prints the usage to stderr and exits 2. | The README has documented the CLI since 2017; it is a few lines on `parseArgs`, and get-title-at-url's CLI tests are the model. | Drop the CLI (nobody noticed it was broken for six years; replace-string-at-position dropped its own). Exit 1 for `false` so shells can branch (a change from 1.0.3's output contract). |
| D7 | Errors | The callback form and the Promise form never report a network failure as an error: it is `false`. Programmer errors throw synchronously (callback form) or reject (Promise form) with a TypeError naming the argument: a url that is not a string (falsy values still answer `false`), a callback that is not a function, an options value of the wrong type. An aborted `signal` rejects with the signal's reason (Promise form only). Error text never includes the URL (fetch's own message echoes credentials). | Matches 1.0.4 (false on every request error) and fixes its crashes. | Reject the Promise on network errors with a typed error (more information, but a second way to say "not an image"). |
| D8 | Node floor and the CI matrix | `engines.node >=20`; Node 20, 22, 24, 26 on Linux, Node 24 on Windows and macOS, Bun, Deno. | The skill's default until Node 22 reaches end of life (2027-04-30); fetch, `AbortSignal.timeout` and `parseArgs` are all in Node 20. | |
| D9 | Language, build, lint, tests, coverage | The npm defaults: TypeScript ~6.0.3, tsdown 0.23.0 pinned, xo ^5.0.1, node:test against `dist/`, c8 95 and 90, publint, attw, consumer fixtures; plus the fixture server from the capture as test/helpers/fixture-server.js for the golden, functional and CLI suites, and the template's optional `live.yml` (weekly smoke against real hosts, never in `npm test`). | Same toolchain as the finished runs; get-title-at-url is the model for a network package with a CLI. | Skip `live.yml` (one fewer workflow; the fixture server covers the logic). |
| D10 | Lockfile and the old bot pull requests | A new `package-lock.json` (lockfileVersion 3). After the merge, with the alert count at 0, close the 17 bot pull requests with one comment each naming the merge commit and the removed tool (`gh pr close N --delete-branch`), and delete the `mime-issue` branch (**needs your OK**: 18 branch deletions on GitHub). | The lockfile regeneration removes every package they bump; merging them one by one would churn a file that is being replaced. | Leave the branches (they are harmless but clutter `git ls-remote`). |
| D11 | Dead services, and each README badge and image | Remove the Travis, Snyk, Coveralls, David, Gitter and nodei.co images and the XO badge; the README gets the three standard badges (below). Remove `.travis.yml`, `.synk`, the coverage scripts and the snyk, coveralls, codecov.io devDependencies. Delete webhooks 14564187, 278447878 (Snyk) and 77226418 (Travis) (**needs your OK**). You check github.com/settings/applications for Travis CI and Coveralls grants (Snyk's was revoked on 2026-09-25). | The services are gone or unused; each hook fires on every push. | Keep the XO badge (true, but not useful to a user). |
| D12 | Old files to remove | `index.js`, `cli.js`, `test.js`, `.travis.yml`, `.synk`, `package-lock.json` (regenerated); `.gitignore` replaced by the template's. | Replaced by `src/`, `test/` and the templates. | |
| D13 | Release and version, rehearsal | `2.0.0-beta.1` under `next` through `release.yml`, you approve, verify-published (with the npx CLI steps from get-title-at-url); then `2.0.0` under `latest` the same way. Trusted publisher: owner `m4bwav`, repository `is-an-image-url`, workflow `release.yml`, no environment, "Allow npm publish" unticked, publishing access "Require two-factor authentication and disallow bypass 2fa tokens". | The standing ritual. | |
| D14 | Default branch and optional extras | Keep `master`. Ruleset (deletion and non-fast-forward blocked, required check `ci`, admin bypass). Settings through `gh`: description "Checks whether a URL points to an image: by its file extension, else by the Content-Type of the response.", homepage the npm page, topics, wiki and projects off, delete-branch-on-merge, secret scanning, push protection, private vulnerability reporting, workflow permissions read (**your OK for applying them**). No JSR. Everlast sync: registered `off` for this no-push run; switch to `push` (the overlay's standing choice) when you rule. | The overlay's standing decisions. | |
| D15 | Dependents: what the next run can rely on | markdown-plain-link-replacer's run can move to `^2.0.0` and rely on: `require()` returns the function; `isAnImageUrl(url, callback)` answers a boolean asynchronously, the same value 1.0.4 gave for every string `url-regex` can produce, except that a 404 image, a missing Content-Type and an invalid URL are `false` (where 1.0.4 said `true`, `undefined` or threw), and a protocol-relative match no longer rejects its `Promise.all`. It can also drop bluebird and await the Promise form. wise-team/engrave (pinned 1.0.3) and pbadilla/brands (`^1.0.4`, no call site) are unaffected. | | |
| D16 | Browser and SSRF limits | Say in the README what the package is not: in a browser the answer depends on the server's CORS headers (a cross-origin image without them is `false`); on a server it requests whatever URL it is given, internal addresses included, so do not pass untrusted URLs without your own allow-list. No option to restrict hosts. | Honest limits instead of a feature nobody asked for. | Add an `allowPrivateHosts: false` option (DNS resolution per request; a real feature, a minor later if wanted). |

## Proposed public API (v2)

```ts
/*
Checks whether `url` points to an image. A string that is not a URL, or a URL whose path ends in an image file extension,
is answered from the extension alone, with no request. Any other http or https URL is requested with GET; the answer is
true when the final response (after redirects) has a 2xx status and a Content-Type starting with image/, compared without
regard to case. The body is not downloaded. Network failures, timeouts and non-http URLs answer false.

Callback form: the callback always runs asynchronously, once, with true or false. `timeout` is in milliseconds (default 20000).
Promise form: resolves true or false; rejects only for an argument of the wrong type or an aborted signal.
Throws a TypeError when url is truthy and not a string, or a callback is given that is not a function.
*/
declare function isAnImageUrl(url: string | null | undefined, callback: (isAnImage: boolean) => void, timeout?: number): void;
declare function isAnImageUrl(url: string | null | undefined, options?: {timeout?: number; signal?: AbortSignal}): Promise<boolean>;
export default isAnImageUrl;
export {isAnImageUrl};
```

CommonJS: `module.exports = isAnImageUrl`, with `isAnImageUrl.default` and `isAnImageUrl.isAnImageUrl` set to itself. Old name to v2 name: unchanged. The CLI: `is-an-image-url [--timeout <ms>] <url>`, `--help`, `--version`.

## Build and package specifics

- src/is-an-image-url.ts (the function), src/url-pattern.ts (is-url's pattern with its notice), src/image-extensions.ts (is-image 3.1.0's list with its notice), src/index.ts (ESM entry), src/require.ts (CommonJS entry), src/cli.ts (Node only: `parseArgs`, `process`). tsdown: two library configs as in replace-string-at-position, plus the CLI entry as in get-title-at-url (dist/cli.mjs with the shebang, LF).
- `package.json` from the template: `type: module`, hand-written `exports` with `import` and `require` plus `./package.json`, `main`, `module`, `types`, `bin: {"is-an-image-url": "dist/cli.mjs"}`, `sideEffects: false`, `files: [CHANGELOG.md, dist]` (excluding maps of the library if the template does), `engines >=20`, the author line from the overlay (https), homepage the npm page, description rewritten in one sentence.
- The portability grep allows `fetch`, `URL`, `AbortSignal`, `queueMicrotask`, `setTimeout`; forbids `process`, `Buffer`, `require`, `node:` in dist/index.* (only dist/cli.mjs may use them).
- The golden test starts `test/golden/fixture-server.cjs` (the capture's own server, unchanged) and substitutes `{{base}}`, `{{localhost}}`, `{{closed}}` and `{{PORT}}` as the capture did.

## Phases

### Phase 0: survey and baseline (2026-09-25, no package code changed)
- [x] Cloned to `D:\m4bwa\Claude\Projects\Ai\is-an-image-url`; survey output in the survey note
- [x] Old build and tests run as they are: `npm test` exit 1 (xo 0.25 crash), nyc 14 crash, ava alone 5 of 5 against the internet; logged
- [x] Golden capture from the published 1.0.4 committed under `test/golden/` with its script, `codec.cjs` and `fixture-server.cjs`
- [x] everlast registered (mode repo; sync off for this no-push run, push after the review); AGENTS.md, CLAUDE.md (import line first), Copilot pointer
### Phase 1: plan
- [x] Rulings 2026-09-26: every recommendation stands, all OKs given
- [x] This plan and the decision record [../decisions/2026-09-25-v2-promise-api-fetch-fixes-named-exceptions.md](../decisions/2026-09-25-v2-promise-api-fetch-fixes-named-exceptions.md). **Stop**: the maintainer rules on the table; questions: D1 (fixes in both forms or only the Promise form), D3b (`.avif`), D4 (deprecating 1.x), D6 (restore or drop the CLI), D10 branch deletions, D11 webhook deletion, D14 settings and the everlast sync.
### Phase 2: rewrite on branch v2
- [x] Remove the D12 files; add the templates; deny dev-only install scripts (2026-09-26; `allowScripts` unrs-resolver false)
- [x] Golden test first, green on the first build (309 tests: 59 kept exactly, 23 named exceptions, Promise-form parity); then src/, the rest of test/, README, CHANGELOG, SECURITY.md, AGENTS.md (2026-09-26)
- [x] Verified on Node 20, 22, 24, 26 (368 of 368 each) and from a fresh clone (log)
- [x] Workflows and Dependabot added, actionlint 1.7.12 and zizmor clean (2026-09-26)
- [x] Pushed; pull request #25 opened with a "For review" list (2026-09-26). **Stop.**
### Phase 3: review
- [x] Independent read-only review with a differential run (about 130 inputs); 8 findings, 7 fixed and 1 answered; summary on #25 (2026-09-26)
### Phase 4: CI, settings, merge, cleanup
- [x] CI green (runs 36245467641, 36246369400 on #25; 36246668568 on master after the merge); merged by the maintainer 2026-09-26 as a merge commit, not a squash (d9e246b)
- [x] Ruleset on master, 24042507 (copied from get-title-at-url's 24003504: deletion and non-fast-forward blocked, required check `ci`, admin bypass), after the maintainer's "go" (2026-09-26)
- [x] Alerts 0; 17 bot pull requests closed with one comment each naming d9e246b; all 18 branches deleted (master is the only remote branch); webhooks removed; repo settings; secret scanning and push protection; private vulnerability reporting; workflow permissions read (2026-09-26); README badges all 200
### Phase 5: release rehearsal
- [x] The maintainer adds the trusted publisher (fields in D13), reported 2026-09-26
- [x] Beta tagged and staged: 2.0.0-beta.3 (beta.1 and beta.2 failed in release.yml on the changelog heading and its link; never staged), run 36248115597, stage id 516120e1-4155-4e48-8ca7-20c5de8a7fbf (2026-09-26)
- [x] Approved by the maintainer; verified from the registry: dist-tags next 2.0.0-beta.3, signature and attestation verified, verify-published run 36249497972 green after the Bun step fix (2026-09-26)
### Phase 6: release
- [x] Changelog dated; 2.0.0 tagged and staged (release run 36249691630, stage id fa2f0209-6448-4188-aaee-2c76b7bbe2c9, 2026-09-26)
- [x] Approved by the maintainer; verified from the registry (latest 2.0.0, signature and attestation, verify-published run 36251363432), GitHub Release v2.0.0 (2026-09-26)
- [ ] The maintainer deprecates 1.x (D4; needs npm 2FA)
### Phase 7: wrap-up
- [x] HANDOFF.md around standing work; inventory row; lessons into the skill (C-20260926-1 to -5, L-022 to L-030); what the kickoff prompt got wrong (log 2026-09-25 correction: the CLI had been broken since 1.0.4) (2026-09-26)

## Test strategy: every artifact, every runtime, and the behaviour itself

| Layer | What it proves | How | Runs where |
|---|---|---|---|
| Golden | D1: every kept case's answer exact, as a boolean, asynchronously; each exception named once with its changelog line; method and path sequences | test/golden/golden.test.js over `1.0.4.json` with `fixture-server.cjs`, both builds | Node 20 to 26, three OSes |
| Unit | Extension and URL checks (the inlined list and pattern, table-driven against the capture's cases 0 to 20), argument errors, timeout parsing | test/unit/*.test.js | same |
| Functional | Promise and callback forms against the fixture server: statuses, types, redirects, loops, credentials, timeouts, `signal` abort, body cancelled (the server records bytes written), exactly one callback | test/functional/is-an-image-url.test.js | same |
| CLI | `true`, `false`, `--help`, `--version`, `--timeout`, no input exits 2, never a stack trace | test/cli/cli.test.js spawning dist/cli.mjs against the fixture server | same, and Windows |
| Package shape | exports map, pack list exactly `CHANGELOG.md`, `LICENSE`, `README.md`, `package.json` and `dist/` files, the bin with an LF shebang; no Node or DOM references in the library; the CommonJS build runs in a bare `node:vm` context with `fetch` injected | test/package/shape.test.js, publint, attw | Node 24 |
| Consumers | `require()` returns the function; `.default` and the named export; `import`; four TypeScript resolution modes plus TypeScript 5.9 interop off; the installed bin | `test/consumers/` from the tarball | Node 24; Bun and Deno in CI |
| Live | a real image URL and a real page answer as expected | `live.yml`, weekly and on demand, never in `npm test` | Linux, Node 24 |
| From the registry | the published version, the same fixtures, npx CLI, signatures and attestation | `verify-published.yml` | after each approval |

| Artifact | Runtime lines | Other OSes | Other runtimes | Bare engine |
|---|---|---|---|---|
| dist/index.mjs | Node 20, 22, 24, 26 | Windows, macOS on 24 | Bun, Deno | |
| dist/index.cjs | Node 20, 22, 24, 26 | Windows, macOS on 24 | Bun | `node:vm` with `fetch` passed in |
| dist/cli.mjs | Node 20, 22, 24, 26 | Windows, macOS on 24 | Bun, Deno (npx equivalents in verify-published) | |
| dist/index.d.mts, `.d.cts` | TypeScript node10, node16 (cjs and esm), bundler; 5.9 interop off | | | |

## Pull requests, issues and forks: disposition

All closing happens in Phase 4, after the v2 merge and with alerts at 0. `<SHA>` is the merge commit.

| Item | What it is | Disposition | Comment to post |
|---|---|---|---|
| #7, #8, #10, #11, #12, #13, #14, #15, #16, #17, #19, #20, #21 | Dependabot bumps of tree-kill, ini, y18n, handlebars, lodash, hosted-git-info, path-parse, ajv, jszip, degenerator and snyk, snyk-go-plugin and snyk, decode-uri-component, json5 in the 2020 lockfile | close, delete branch | "Closed by the 2.0.0 rewrite (<SHA>): the lockfile was regenerated and the tools that brought this package in (snyk, ava 2, nyc 14, xo 0.25, request, meow) are gone. Dependabot alerts: 0." |
| #9 | snyk-bot, meow 6.1.0 to 8.0.0 | close, delete branch | "Closed by the 2.0.0 rewrite (<SHA>): meow is no longer a dependency; the CLI uses node:util parseArgs. Snyk is no longer used on this repository." |
| #22, #24 | Snyk integration (under the maintainer's name), request 2.88.0 to 2.88.2 | close, delete branch | "Closed by the 2.0.0 rewrite (<SHA>): request is no longer a dependency; 2.0.0 uses the platform's fetch. Snyk is no longer used on this repository." |
| #23 | Snyk integration, meow 6.1.0 to 12.1.0 | close, delete branch | as #9 |
| branch `mime-issue` | two lockfile commits of 2020-01-05, no pull request | delete (with the OK) | none |
| #1, #18 and merged #2 to #6 | closed or merged long ago | nothing | none |
| fork adrian-hintze/is-image-url-async | a diverged fork published as its own package (always requests, returns the extension) | nothing | none |
| fork gitter-badger/is-an-image-url | carried #1 only | nothing | none |
| issues | none ever | nothing | none |

## Security

- No tokens leaked, in files or history; nothing to revoke.
- Webhooks: three dead ones, deleted with the OK (D11). OAuth apps of Travis CI and Coveralls: the maintainer checks and revokes; Snyk's was revoked on 2026-09-25.
- Alerts: 95 now, 0 after the lockfile regeneration; `npm audit signatures` and `npm audit --omit=dev` in CI.
- 1.x's runtime tree carries a critical and two high advisories through request; D4 deprecates 1.x after 2.0.0 ships.
- Credentials in URLs: 1.0.4 sent them and leaked them in a Referer header on a cross-host redirect; 2.0.0 does not request such URLs, and no error text echoes a URL.
- Workflows from the templates: `permissions: contents: read`, id-token set to write only in the publish job, `persist-credentials: false`, actions pinned to SHAs, actionlint and zizmor clean. Default workflow permissions set to read.
- Publishing: npm 2FA with no bypass tokens, trusted publishing bound to `release.yml`, staged mode, the maintainer approves.
- The library: one GET per call plus redirects, body cancelled after the headers, bounded by the timeout; no filesystem, `eval` or prototype-touching merges. README says what it is not (D16: no SSRF guard, CORS-bound in browsers).
- SECURITY.md with private vulnerability reporting, which is switched on.

## Badges and images: disposition

| Image or badge | What it shows now | Decision | New URL or reason |
|---|---|---|---|
| nodei.co npm card | an unmaintained service's image | remove | replaced by the three badges below |
| NPM Version (shields, `?branch=master`) | the version, with a meaningless parameter | replace | `https://img.shields.io/npm/v/is-an-image-url` linking to the npm page |
| downloads (shields, total) | total downloads | replace | `https://img.shields.io/npm/dm/is-an-image-url` (monthly, the template's) |
| Build Status (Travis) | "not found" | replace | `https://github.com/m4bwav/is-an-image-url/actions/workflows/ci.yml/badge.svg` linking to the workflow |
| Dependency Status (David) | "not found"; service shut down | remove | Dependabot covers it |
| Coverage Status (Coveralls) | a service not kept | remove | c8 thresholds in CI instead (D9) |
| Known Vulnerabilities (Snyk) | a service not kept | remove | Dependabot alerts and `npm audit` in CI |
| XO code style | true but not useful to users | remove | the three-badge default |
| Gitter | a room nobody answers | remove | issues and private vulnerability reporting |

## Verification checklist (what "done" means)

| Claim | Command or place | Expected |
|---|---|---|
| Installs clean | `npm ci` in a fresh clone | no deprecation warnings, 0 vulnerabilities |
| Zero runtime dependencies | `npm ls --omit=dev --all` | nothing under the package |
| Old behaviour kept | `npm test`, CI, verify-published | every kept golden case exact; exceptions named; both builds; every Node line |
| Old call pattern works | `node -e "require('is-an-image-url')('cat.png', console.log)"` against the tarball | prints `true` |
| CLI works | `npx is-an-image-url@2 cat.png` and `--help` | `true`; the usage text; exit 0 |
| Dual output is correct | `npx publint`, `npx attw --pack .` | no errors in any mode |
| Portable | the shape test | no Node or DOM references in `dist/index.*`; the bare-engine run passes |
| No network in tests | `npm test` with the network off | green |
| Published with provenance | `npm view is-an-image-url dist.attestations`; `npm audit signatures` in a project that installed it | present and verified |
| Release exists | `gh release view v2.0.0` | notes from the changelog |
| No alerts | `gh api "repos/m4bwav/is-an-image-url/dependabot/alerts?state=open" --jq length` | `0` |
| Repo tidy | `gh pr list`, `git ls-remote --heads origin`, `gh api repos/m4bwav/is-an-image-url/hooks --jq length` | no open pull requests, only `master`, 0 webhooks |
| Badges and images work | `node scripts/check-readme-images.mjs README.md`, and on the README of the published tarball | exit 0 |
| Scanning on | `gh api repos/m4bwav/is-an-image-url --jq .security_and_analysis` | secret scanning and push protection enabled |

## Risks and open points

- The callable CommonJS recipe plus a third tsdown entry (the CLI) has not been combined before; get-title-at-url built a CLI with named exports only. Fallback: build the CLI in its own config.
- Bun's and Deno's `fetch` send other headers and may differ on redirects and cancelled bodies; the golden suite runs on Node only (the codec's note), and the functional suite asserts answers, not headers, on the other runtimes.
- Browsers are supported only for CORS-enabled servers (D16); no browser test runs in CI.
- The golden file records Node 24.18.0 error text for cases 27 to 36; the exceptions assert the class only.
- Found in Phase 2: fetch can send a request on a pooled keep-alive socket the server has just closed, and then fails without reaching the server (the answer is `false`). The suites hit it on Node 20, 22 and 26 when the fixture server destroyed its sockets between cases, and now wait 30 ms after doing so. In production it needs a server closing an idle connection at the moment of the next request to the same host; no retry was added (a retry would double the requests of failing cases). Revisit if a user reports spurious `false` answers.

## Appendix: cleanup commands (all paths absolute)

```bash
# After the OK in the plan review, and after the v2 merge with alerts at 0:
for n in 7 8 9 10 11 12 13 14 15 16 17 19 20 21 22 23 24; do gh pr close $n -R m4bwav/is-an-image-url --delete-branch --comment "<the disposition table's comment>"; done
gh api -X DELETE repos/m4bwav/is-an-image-url/git/refs/heads/mime-issue
gh api -X DELETE repos/m4bwav/is-an-image-url/hooks/14564187
gh api -X DELETE repos/m4bwav/is-an-image-url/hooks/278447878
gh api -X DELETE repos/m4bwav/is-an-image-url/hooks/77226418
gh repo edit m4bwav/is-an-image-url --description "Checks whether a URL points to an image: by its file extension, else by the Content-Type of the response." --homepage https://www.npmjs.com/package/is-an-image-url --enable-wiki=false --enable-projects=false --delete-branch-on-merge --add-topic image,url,content-type,fetch,cli,typescript,esm,commonjs
gh api -X PATCH repos/m4bwav/is-an-image-url -f 'security_and_analysis[secret_scanning][status]=enabled' -f 'security_and_analysis[secret_scanning_push_protection][status]=enabled'
gh api -X PUT repos/m4bwav/is-an-image-url/private-vulnerability-reporting
gh api -X PUT repos/m4bwav/is-an-image-url/actions/permissions/workflow -f default_workflow_permissions=read -F can_approve_pull_request_reviews=false
python D:/m4bwa/Claude/Projects/Ai/everlast-protocol/scripts/everlast.py project register D:/m4bwa/Claude/Projects/Ai/is-an-image-url --mode repo --sync push
```

## Next single action

The maintainer rules on the decisions table (at least D1, D3b, D4 and D6, and the OKs in D10, D11 and D14); then push the Phase 0 and 1 commits, create branch `v2` and write the golden test first.
