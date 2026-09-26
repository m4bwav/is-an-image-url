---
title: "Phase 0 survey: registry, repository, baseline, capture and dependents of 1.0.4"
kind: note
status: active
date: 2026-09-25
verified: 2026-09-25
stale_after: 2027-03-25
tags: [survey, baseline, v2, dependents, dead-services, tarball, golden, cli, fetch]
aliases: [survey, baseline, markdown-plain-link-replacer, cli.js, meow, request, webhooks, fixture server]
summary: "read before the plan or the cleanup: what 1.0.4 is and ships, the CLI that crashes on every call since 1.0.4, the old suite's result on Node 24, the one dependent that calls it, the dead services with their webhook ids, what the golden capture found, how Node's fetch differs from request, and the raw survey-npm.sh and image-check output"
---

# Phase 0 survey: is-an-image-url 1.0.4

## Summary

One CommonJS function with a callback, published 2017 to 2019, four runtime dependencies (one deprecated), 27 downloads a month, one dependent that really calls it (the maintainer's own markdown-plain-link-replacer). The library works; **the CLI has crashed on every invocation since 1.0.4** (meow 5 no longer accepts `help` as an array), which the survey and the inventory did not know. The old tests pass under ava alone but only against the live internet; xo and nyc crash on Node 24. Three dead webhooks, 95 alerts (all from the old lockfile and the request, meow and snyk trees), 17 open bot pull requests, 18 stale branches, no leaked credentials.

Surveyed on 2026-09-25 (the script stamps UTC, 2026-09-26T04:21Z) with the package-modernize skill's `scripts/survey-npm.sh is-an-image-url m4bwav/is-an-image-url`, Node 24.18.0 and npm 11.16.0. The raw output is at the end. The behaviour of the published 1.0.4 is in [../../test/golden/1.0.4.json](../../test/golden/1.0.4.json) (82 function cases, 11 CLI cases); what it means is in the plan, [../plans/2026-09-25-modernization-and-v2-release.md](../plans/2026-09-25-modernization-and-v2-release.md).

## The package

- Five versions: 1.0.0 (2017-06-21), 1.0.1 (2017-06-25), 1.0.2 (2017-07-20), 1.0.3 (2017-08-18), 1.0.4 (2019-11-28); `latest` is 1.0.4; one maintainer, `markrogers`. One registry signature (the 2022 re-signing), no attestation. Git tags v1.0.1 to v1.0.4, no GitHub Releases.
- Downloads: 27 in the last month; 4 to 77 a month over the past year.
- `index.js` (68 lines): `module.exports = isAnImageUrl(url, callback, timeout)`. No callback: throws `Error('Callback must be set ...')`. A falsy `url`: `callback(false)`. A string that is-url 1.2.4 does not accept as a URL: `callback(isImage(url))` by file extension. A URL: `new URL(url).pathname` checked by extension first (true without a request), else `request.get(url, {timeout: timeout || 20000})` and `callback(contentType && contentType.search(/^image\//) !== -1)`.
- `cli.js` (24 lines, `bin: is-an-image-url`): `meow({help: [ ... ]})`, then `isAnImageUrl(cli.input[0], result => console.log(result))`.
- Runtime dependencies of the published 1.0.4: `is-image ^3.0.0` (a fresh install resolves 3.1.0; latest 4.0.0 is ESM-only), `is-url ^1.2.4` (latest, unchanged since 2017), `meow ^5.0.0` (latest 14.1.0), `request ^2.88.0` (resolves 2.88.2; deprecated since 2020). The repository's `package.json` says `meow ^6.1.0`: Snyk's pull request #5 (2020-03-21) changed it after 1.0.4 was published, and nothing was published since.
- devDependencies: `ava ^2.4.0`, `codecov.io`, `coveralls`, `execa`, `nyc ^14.1.1`, `snyk ^1.251.2`, `xo ^0.25.3`. Scripts: `test: xo && nyc ava`, `coverage` and `travis-after-success` pipe to coveralls. No `engines`, `types` or `exports`; `files: [index.js, cli.js, lib]` (there is no `lib`).
- The tarball (2,957 bytes, 5 files: LICENSE, README.md, cli.js, index.js, package.json) matches the repository at 1.0.4 except `meow ^5.0.0`, and every file in it has CRLF line endings (published from Windows; the repository is LF). The npm description is the long "originally created as an async replacement for is-image-url ..." paragraph, which meow prints as the help text's first paragraph.

## The CLI: broken since 1.0.4 (refutes "It has a CLI (meow)")

- Published 1.0.4 with meow 5.0.0: every invocation, `--help` and `--version` included, exits 1 with `TypeError: (options.help || "").replace is not a function` (golden `cli` cases, all 11).
- The repository's master with meow 6.1.0 (the baseline clone): the same TypeError.
- Published 1.0.3 with meow 3.7.0 (scratch install, 2026-09-25): works; `cat.png` prints `true`, `--help` prints the package description, then the Usage and Example lines. That is the CLI contract the README describes, last shipped in 2017.
- So the CLI in the README has not worked for anyone who installed since 2019-11-28, and no issue was ever filed.

## The repository

- `master`, created 2017-05-26, last push 2025-06-12 (a Snyk branch); 48 commits across four author names (the maintainer twice, dependabot, snyk-bot). No workflows, rulesets, secrets, variables or environments.
- Branches besides master (18): 13 `dependabot/npm_and_yarn/*` and 4 `snyk-fix-*` behind the open pull requests, and `mime-issue` (two commits of 2020-01-05, "Npm audit fix" and "some more fix attempts", touching only `package-lock.json`; no pull request).
- Issues: none ever. Pull requests: 24 in all; open 17: Dependabot #7, #8, #10 to #17, #19, #20, #21 (13); Snyk #9 (snyk-bot, meow 6.1.0 to 8.0.0), #22 and #24 (request 2.88.0 to 2.88.2, opened by the Snyk integration under the maintainer's account), #23 (meow 6.1.0 to 12.1.0, the same). Closed: #1 (gitter-badger badge, 2017), #18 (Dependabot, superseded). Merged: #2 to #6 (2019 and 2020 lockfile bumps and the meow 6 upgrade).
- Forks: `adrian-hintze/is-image-url-async` (diverged, 22 commits ahead, last push 2018-10-07; its own package `is-image-url-async` 1.4.0 that always requests and returns the extension; nothing to take back), `gitter-badger/is-an-image-url` (only the closed #1).
- Dependabot alerts: 95 open. Runtime scope (through request and meow): ajv (2 medium), uuid, tough-cookie, request, qs (medium and high), semver (high), json-schema (critical). The rest are development scope, mostly the snyk CLI's tree, handlebars, minimist, lodash, parse-url.
- Security features: Dependabot security updates on; secret scanning, push protection and validity checks off. Default workflow permissions write, and Actions may approve pull requests. Wiki and projects on; delete-branch-on-merge off; homepage empty; the description is the long 2017 paragraph with typos ("synchronisis").
- Leaked credentials: none. `.travis.yml` holds no token; `git log --all -p` has no token, secret, key or password strings outside lockfile package names.

## Dead services

| Service | Badge | Config file | Webhook | App |
|---|---|---|---|---|
| Travis CI | Build Status (shields, says "not found") | `.travis.yml` | 77226418 (notify.travis-ci.org, active) | check github.com/settings/applications |
| Snyk | Known Vulnerabilities; the README's "snyk security scanner" link | `.synk` (a misspelled `.snyk` policy file, empty; the survey script's file check missed it) | 14564187 and 278447878 (snyk.io, active) | OAuth app revoked 2026-09-25 (overlay) |
| Coveralls | Coverage Status | `coverage` and `travis-after-success` scripts, `coveralls` devDependency | none | check |
| codecov | none | `codecov.io` devDependency | none | none known |
| David | Dependency Status (says "not found") | none | none | none |
| Gitter | Gitter badge | none | none | none |
| nodei.co | the npm package card | none | none | none |

## README images and badges

`node scripts/check-readme-images.mjs` on the repository README and on package/README.md from the 1.0.4 tarball: the same nine images (the two READMEs differ only in line endings), exit 1, six to fix: nodei.co (unmaintained), Travis (dead, "not found"), David (shut down, "not found"), Coveralls, Snyk, Gitter. Fine: the shields npm version badge (with a meaningless `?branch=master`), shields total downloads, the XO code style badge. No screenshots, no relative paths. Output at the end.

## Baseline: the old suite as it is (scratch clone, Node 24.18.0)

- `npm ci` with the 2020 lockfile: 1,406 packages in 11 s, 19 deprecation warnings (request, uuid, hawk, snyk 1.251.2, eslint 6, core-js 2 and 3), and npm 11.16's `allowScripts` warning for core-js's postinstall.
- `npm --script-shell "C:/Program Files/Git/bin/bash.exe" test` (`xo && nyc ava`): exit 1 at xo; xo 0.25.3 crashes with `TypeError: util.isDate is not a function` (eslint-plugin-ava through core-assert).
- `npx nyc ava` alone: nyc 14.1.1 crashes on Node 24 (`ERR_INVALID_ARG_TYPE: The "mod" argument must be an instance of Module`).
- `npx ava --verbose` alone (ava 2.4.0): 5 tests passed. Two of them reach www.google.com over the internet (the "not an image" and "404" cases); one never touches the network (the image URL ends in `.png`, so the extension answers); one checks the missing-callback throw.
- So the old suite cannot run as written on Node 24, and the part that runs depends on google.com. The golden capture replaces it as the baseline.

## Dependents

- The registry counts 1. `gh search code` finds `package.json` files naming it in three repositories besides this one:
  - `m4bwav/markdown-plain-link-replacer` (the maintainer's, `^1.0.3`, last push 2026-02-15): lib/parse-urls-from-markdown-and-filter.js calls `isAnImageUrl(currentUrl, result => ...)` inside a bluebird `new Promise` executor for every URL `url-regex` finds in markdown, and only tests the result for truthiness. A synchronous throw from `isAnImageUrl` (a protocol-relative match such as `//host/x`) would reject its `Promise.all`, so its callback would never run; a non-boolean falsy answer is harmless to it.
  - `wise-team/engrave` (10 stars, last push 2021-05-11): `"is-an-image-url": "1.0.3"` pinned exactly in eleven service `package.json` files; code search finds no call site. Unaffected by any new release.
  - `pbadilla/brands` (last push 2023-10-15): `^1.0.4` in MapBrandApp/package.json among a dozen image-check packages; no call site found. The caret excludes 2.x.

## What the golden capture found (published 1.0.4, is-image 3.1.0, is-url 1.2.4, meow 5.0.0, request 2.88.2, Node 24.18.0)

Every network case ran against `test/golden/fixture-server.cjs` on 127.0.0.1 (and `localhost` as a second host); nothing touched the internet. Two runs wrote identical files. Case numbers index `cases` in the JSON.

- Requests: `GET` with exactly two headers, `host` and `Connection: keep-alive`; no User-Agent, no Accept (45).
- The Content-Type decides, compared case-sensitively (`IMAGE/PNG` is false, 48); the status is ignored (404, 500 and 204 with an image type are true, 54 to 56; a 302 without Location but with an image type is true, 64).
- The answer is not always a boolean: no Content-Type calls back `undefined` (51), an empty one `''` (52).
- The callback runs synchronously for every answer that needs no request (0 to 26, 37 to 39, 43, 44, 70, 71) and asynchronously otherwise.
- The file extension wins over the network: a URL whose path ends in an image extension is true with no request, even where the server would 404 (37 to 39); `ftp:` and `javascript:` URLs too (43, 44). The extension in a query or fragment does not count (40, 41).
- Not-a-URL strings go by extension: `photo.png`, `C:\pictures\cat.gif`, example.com/cat.png, and `http://exa mple.com/cat.png` (is-url refuses the space) are true; `cat.png?size=large` is false (6 to 8). IPv6 literal URLs are never fetched: is-url refuses them (9, 10).
- is-image 3.1.0's list: `.fs`, `.int`, `.max`, `.raw` count as images (13 to 16); `.avif` and `.jxl` do not (11, 12); `.PI1` is listed upper-case and looked up lower-case, so it never matches (17). is-image 3.0.0 (what the 2019 lockfile had) differs only in `.heic` and `.heif` (false there, true in 3.1.0; quirks).
- Throws synchronously: a truthy non-string url (Node's `ERR_INVALID_ARG_TYPE` from `path.extname`, 27 to 31); a missing or null callback (32 to 34); a string callback on a non-network path (35); a protocol-relative URL or an invalid port (`TypeError: Invalid URL`, 72 to 74). A string callback on a network path throws later, as an uncaught exception that would crash a process (36).
- Redirects: followed, across hosts too (60 to 63); a loop stops after 10 hops, 11 requests, false (66); a redirect to `file:` is false (65).
- Credentials in the URL are sent as `authorization: Basic ...`; on a cross-host redirect request drops the header but sends a `referer` carrying `user:secret` to the other host (59, 67).
- Timeouts: the third argument is request's connect-and-idle timeout; `0`, a negative number and a numeric string all fall back to or are ignored in favour of 20 s (79, 80; quirks `defaultTimeout`: 20 s for none and for 0). Image headers followed by a stalled body time out as false, because request waits for the whole body (78); an 8 MiB image body is downloaded in full before the answer (81, quirks `bigImage`).
- request honours HTTP_PROXY, HTTPS_PROXY and NO_PROXY; the capture ran with none set.

## Node's fetch on the same routes (probe, 2026-09-25, Node 24.18.0; not part of the golden file)

A scratch script (`fetch-probe.cjs` beside the capture) fetched the fixture routes with `AbortSignal.timeout(3000)` and cancelled each body after the headers:

- Headers sent: host, connection, `accept: */*`, `accept-language: *`, `sec-fetch-mode: cors`, `user-agent: node`, `accept-encoding: gzip, deflate`.
- A URL with credentials: `TypeError: Request cannot be constructed from a URL that includes credentials: <the URL, credentials included>`, no request made. Any error text surfaced to callers must not echo it.
- A 302 without Location: returned as status 302 with its image type.
- Redirect loop: "redirect count exceeded" after 21 requests (request stopped at 11).
- Redirect to `file:`: "URL scheme must be a HTTP(S) scheme"; an `ftp:` URL: "unknown scheme", no request.
- Stalled body and 8 MiB body: answered from the headers; cancelling the body stopped the 8 MiB transfer at 320 KiB.
- `HEAD` works on the fixture; real servers vary, so the plan keeps `GET`.
- Node's fetch ignores HTTP_PROXY unless `NODE_USE_ENV_PROXY=1` or `--use-env-proxy` is set (from recall, not probed; re-verify in Phase 2 before the changelog says so).

## Raw output

The survey, the image checks and the baseline commands follow, as run, except that npm scope prefixes are written (at)scope/ so the doc lint does not read them as social handles.

Related: builds on [../plans/2026-09-25-modernization-and-v2-release.md](../plans/2026-09-25-modernization-and-v2-release.md); see also [../decisions/2026-09-25-v2-promise-api-fetch-fixes-named-exceptions.md](../decisions/2026-09-25-v2-promise-api-fetch-fixes-named-exceptions.md).


### survey-npm.sh

```text
# npm survey: is-an-image-url (2026-09-26T04:21Z)

## Registry metadata
$ npm view is-an-image-url name version dist-tags time.created time.modified license author repository.url homepage main module types exports bin engines dependencies peerDependencies deprecated
name = 'is-an-image-url'
version = '1.0.4'
dist-tags = { latest: '1.0.4' }
time.created = '2017-06-21T02:40:46.697Z'
time.modified = '2022-06-19T02:36:21.982Z'
license = 'MIT'
author = 'Mark Rogers (http://www.markdavidrogers.com/)'
repository.url = 'git+https://github.com/m4bwav/is-an-image-url.git'
homepage = 'https://github.com/m4bwav/is-an-image-url#readme'
main = 'index.js'
bin = { 'is-an-image-url': 'cli.js' }
dependencies = {
  'is-image': '^3.0.0',
  'is-url': '^1.2.4',
  meow: '^5.0.0',
  request: '^2.88.0'
}

## All published versions with dates
$ npm view is-an-image-url time --json
{
  "modified": "2022-06-19T02:36:21.982Z",
  "created": "2017-06-21T02:40:46.697Z",
  "1.0.0": "2017-06-21T02:40:46.697Z",
  "1.0.1": "2017-06-25T01:26:19.958Z",
  "1.0.2": "2017-07-20T00:36:02.928Z",
  "1.0.3": "2017-08-18T02:58:58.471Z",
  "1.0.4": "2019-11-28T02:54:23.609Z"
}

## Attestations and signatures on the latest version
$ npm view is-an-image-url dist.attestations dist.signatures --json
[
  {
    "keyid": "SHA256:jl3bwswu80PjjokCgh0o2w5c2U4LhQAE57gj9cz1kzA",
    "sig": "MEUCIGeVWcqr4XXnr6RdCwZpNrGSR++YTK+/vXZ+y7/uLExFAiEAmwXLKNtq6etrOw3BI4MaMPPz+eCw/PgpQMvqSIsM5zg="
  }
]

## Maintainers (emails masked)
$ npm view is-an-image-url maintainers --json | sed -E 's/ <[^>]*>/ <email>/'
[
  "markrogers <email>"
]

## Downloads, last month
$ curl -s https://api.npmjs.org/downloads/point/last-month/is-an-image-url
{"downloads":27,"start":"2026-08-26","end":"2026-09-24","package":"is-an-image-url"}
## Downloads, last year by month
$ curl -s "https://api.npmjs.org/downloads/range/last-year/is-an-image-url" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const m={};for(const {day,downloads} of JSON.parse(s).downloads){const k=day.slice(0,7);m[k]=(m[k]||0)+downloads}console.log(m)})'
{
  '2025-09': 4,
  '2025-10': 49,
  '2025-11': 15,
  '2025-12': 9,
  '2026-01': 27,
  '2026-02': 22,
  '2026-03': 24,
  '2026-04': 34,
  '2026-05': 40,
  '2026-06': 42,
  '2026-07': 77,
  '2026-08': 25,
  '2026-09': 18
}

## Dependents (registry search; npmjs.com shows the list)
$ curl -s "https://registry.npmjs.org/-/v1/search?text=is-an-image-url&size=1" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const r=JSON.parse(s);console.log(JSON.stringify({total:r.total, first:r.objects[0]?.package?.name, dependents: r.objects[0]?.dependents ?? "(see https://www.npmjs.com/browse/depended/is-an-image-url)"}))})'
{"total":1593051,"first":"is-an-image-url","dependents":"1"}

## Dependents by name: public repositories whose package.json names it (the registry gives only a count)
$ gh search code "\"is-an-image-url\"" --filename package.json --json repository --jq '.[].repository.nameWithOwner' --limit 50 2>&1 | sort -u
m4bwav/is-an-image-url
m4bwav/markdown-plain-link-replacer
pbadilla/brands
wise-team/engrave

## Tarball file list of the published version
$ npm pack is-an-image-url --dry-run --json 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const [p]=JSON.parse(s);console.log(p.size+" bytes, "+p.entryCount+" files");for(const f of p.files)console.log(" "+f.path+" "+f.size)})'
2957 bytes, 5 files
 LICENSE 1089
 README.md 2509
 cli.js 471
 index.js 1457
 package.json 1540

## Runtime dependencies: how far behind
$ npm view <dep> version time.modified deprecated
is-image: wanted ^3.0.0, latest 4.0.0 (modified 2023-07-25)
is-url: wanted ^1.2.4, latest 1.2.4 (modified 2023-04-08)
meow: wanted ^5.0.0, latest 14.1.0 (modified 2026-02-20)
request: wanted ^2.88.0, latest 2.88.2 (modified 2026-07-17), DEPRECATED: request has been deprecated, see https://github.com/request/request/issues/3142

# GitHub side (m4bwav/is-an-image-url)
# GitHub survey: m4bwav/is-an-image-url (2026-09-26T04:22Z)

## Repository
$ gh repo view m4bwav/is-an-image-url --json name,description,defaultBranchRef,pushedAt,createdAt,licenseInfo,stargazerCount,forkCount,isArchived,homepageUrl --jq '{name,description,defaultBranch:.defaultBranchRef.name,pushedAt,createdAt,license:.licenseInfo.key,stars:.stargazerCount,forks:.forkCount,archived:.isArchived,homepage:.homepageUrl}'
{"archived":false,"createdAt":"2017-05-26T02:42:23Z","defaultBranch":"master","description":"This package was originally created as an async replacement for is-image-url.  I was using that one but my sync security scanner said there was issue with one of the dependencies.  I posted a pull request but it hasn't been reviewed, so onward and upward.  The other lib was synchronisis, I figured I'd make an async version.","forks":2,"homepage":"","license":"mit","name":"is-an-image-url","pushedAt":"2025-06-12T09:13:09Z","stars":2}

## Settings and security features
$ gh api repos/m4bwav/is-an-image-url --jq '{delete_branch_on_merge, has_wiki, has_projects, allow_squash_merge, web_commit_signoff_required, security_and_analysis}'
{"allow_squash_merge":true,"delete_branch_on_merge":false,"has_projects":true,"has_wiki":true,"security_and_analysis":{"dependabot_security_updates":{"status":"enabled"},"secret_scanning":{"status":"disabled"},"secret_scanning_non_provider_patterns":{"status":"disabled"},"secret_scanning_push_protection":{"status":"disabled"},"secret_scanning_validity_checks":{"status":"disabled"}},"web_commit_signoff_required":false}

## Default workflow permissions
$ gh api repos/m4bwav/is-an-image-url/actions/permissions/workflow
{"default_workflow_permissions":"write","can_approve_pull_request_reviews":true}
## Branches
$ gh api repos/m4bwav/is-an-image-url/branches --paginate --jq '.[].name'
dependabot/npm_and_yarn/ajv-6.12.6
dependabot/npm_and_yarn/decode-uri-component-0.2.2
dependabot/npm_and_yarn/degenerator-and-snyk--removed
dependabot/npm_and_yarn/handlebars-4.7.7
dependabot/npm_and_yarn/hosted-git-info-2.8.9
dependabot/npm_and_yarn/ini-1.3.8
dependabot/npm_and_yarn/json5-2.2.3
dependabot/npm_and_yarn/jszip-3.10.1
dependabot/npm_and_yarn/lodash-4.17.21
dependabot/npm_and_yarn/path-parse-1.0.7
dependabot/npm_and_yarn/snyk-go-plugin-and-snyk--removed
dependabot/npm_and_yarn/tree-kill-1.2.2
dependabot/npm_and_yarn/y18n-3.2.2
master
mime-issue
snyk-fix-9cc31a81c7af3a5a37c29626aab5e3de
snyk-fix-5675d563b07d359bfa31d832a394409b
snyk-fix-b991226de82bcdcc8e2e67932610153b
snyk-fix-d70163327019af50ea4f6a6ad33f62dd

## Rulesets and branch protection
$ gh api repos/m4bwav/is-an-image-url/rulesets --jq '.[] | "\(.id) \(.name) \(.enforcement)"'; gh api repos/m4bwav/is-an-image-url/branches/$(gh repo view m4bwav/is-an-image-url --json defaultBranchRef --jq .defaultBranchRef.name)/protection --jq . 2>/dev/null || echo '(no classic branch protection)'
{"message":"Branch not protected","documentation_url":"https://docs.github.com/rest/branches/branch-protection#get-branch-protection","status":"404"}(no classic branch protection)

## Issues (all states)
$ gh issue list -R m4bwav/is-an-image-url --state all --limit 100 --json number,title,state,author,createdAt,closedAt --jq '.[] | "#\(.number) \(.state) \(.createdAt[:10]) \(.author.login): \(.title)"'

## Pull requests (all states)
$ gh pr list -R m4bwav/is-an-image-url --state all --limit 100 --json number,title,state,author,headRefName,createdAt --jq '.[] | "#\(.number) \(.state) \(.createdAt[:10]) \(.author.login) [\(.headRefName)]: \(.title)"'
#24 OPEN 2025-06-12 m4bwav [snyk-fix-d70163327019af50ea4f6a6ad33f62dd]: [Snyk] Security upgrade request from 2.88.0 to 2.88.2
#23 OPEN 2024-09-09 m4bwav [snyk-fix-9cc31a81c7af3a5a37c29626aab5e3de]: [Snyk] Security upgrade meow from 6.1.0 to 12.1.0
#22 OPEN 2024-02-03 m4bwav [snyk-fix-5675d563b07d359bfa31d832a394409b]: [Snyk] Security upgrade request from 2.88.0 to 2.88.2
#21 OPEN 2023-01-05 app/dependabot [dependabot/npm_and_yarn/json5-2.2.3]: Bump json5 from 2.1.1 to 2.2.3
#20 OPEN 2022-12-04 app/dependabot [dependabot/npm_and_yarn/decode-uri-component-0.2.2]: Bump decode-uri-component from 0.2.0 to 0.2.2
#19 OPEN 2022-10-06 app/dependabot [dependabot/npm_and_yarn/snyk-go-plugin-and-snyk--removed]: Bump snyk-go-plugin and snyk
#18 CLOSED 2022-10-06 app/dependabot [dependabot/npm_and_yarn/snyk-1.996.0]: Bump snyk from 1.251.2 to 1.996.0
#17 OPEN 2022-09-26 app/dependabot [dependabot/npm_and_yarn/degenerator-and-snyk--removed]: Bump degenerator and snyk
#16 OPEN 2022-09-08 app/dependabot [dependabot/npm_and_yarn/jszip-3.10.1]: Bump jszip from 3.2.2 to 3.10.1
#15 OPEN 2022-02-12 app/dependabot [dependabot/npm_and_yarn/ajv-6.12.6]: Bump ajv from 6.10.2 to 6.12.6
#14 OPEN 2021-08-11 app/dependabot [dependabot/npm_and_yarn/path-parse-1.0.7]: Bump path-parse from 1.0.5 to 1.0.7
#13 OPEN 2021-05-11 app/dependabot [dependabot/npm_and_yarn/hosted-git-info-2.8.9]: Bump hosted-git-info from 2.4.2 to 2.8.9
#12 OPEN 2021-05-10 app/dependabot [dependabot/npm_and_yarn/lodash-4.17.21]: Bump lodash from 4.17.19 to 4.17.21
#11 OPEN 2021-05-08 app/dependabot [dependabot/npm_and_yarn/handlebars-4.7.7]: Bump handlebars from 4.5.3 to 4.7.7
#10 OPEN 2021-03-31 app/dependabot [dependabot/npm_and_yarn/y18n-3.2.2]: Bump y18n from 3.2.1 to 3.2.2
#9 OPEN 2021-03-27 snyk-bot [snyk-fix-b991226de82bcdcc8e2e67932610153b]: [Snyk] Security upgrade meow from 6.1.0 to 8.0.0
#8 OPEN 2020-12-12 app/dependabot [dependabot/npm_and_yarn/ini-1.3.8]: Bump ini from 1.3.4 to 1.3.8
#7 OPEN 2020-09-06 app/dependabot [dependabot/npm_and_yarn/tree-kill-1.2.2]: Bump tree-kill from 1.2.1 to 1.2.2
#6 MERGED 2020-07-18 app/dependabot [dependabot/npm_and_yarn/lodash-4.17.19]: Bump lodash from 4.17.15 to 4.17.19
#5 MERGED 2020-03-21 snyk-bot [snyk-fix-94333e0c8f30cdf357ba10799634379d]: [Snyk] Security upgrade meow from 5.0.0 to 6.1.0
#4 MERGED 2020-03-14 app/dependabot [dependabot/npm_and_yarn/acorn-7.1.1]: Bump acorn from 7.1.0 to 7.1.1
#3 MERGED 2019-11-28 app/dependabot [dependabot/npm_and_yarn/tough-cookie-2.4.3]: Bump tough-cookie from 2.3.2 to 2.4.3
#2 MERGED 2019-11-28 app/dependabot [dependabot/npm_and_yarn/stringstream-0.0.6]: Bump stringstream from 0.0.5 to 0.0.6
#1 CLOSED 2017-06-25 gitter-badger [gitter-badge]: Add a Gitter chat badge to README.md

## Open Dependabot alerts by severity, package and scope
$ gh api "repos/m4bwav/is-an-image-url/dependabot/alerts?state=open&per_page=100" --paginate --jq '.[] | "\(.security_advisory.severity) \(.dependency.package.name) \(.dependency.scope)"' | sort | uniq -c | sort -rn
      3 medium parse-url development
      3 high js-yaml development
      3 high handlebars development
      3 high ansi-regex development
      3 critical handlebars development
      2 medium minimist development
      2 medium lodash development
      2 medium jszip development
      2 medium js-yaml development
      2 medium bl development
      2 medium ajv runtime
      2 high y18n development
      2 high snyk development
      2 high qs development
      2 high lodash development
      2 critical parse-url development
      2 critical minimist development
      1 medium yargs-parser development
      1 medium xml2js development
      1 medium uuid runtime
      1 medium tunnel-agent development
      1 medium tough-cookie runtime
      1 medium snyk-sbt-plugin development
      1 medium snyk-python-plugin development
      1 medium snyk-mvn-plugin development
      1 medium snyk-gradle-plugin development
      1 medium snyk-docker-plugin development
      1 medium snyk development
      1 medium request runtime
      1 medium request development
      1 medium qs runtime
      1 medium qs development
      1 medium picomatch development
      1 medium netmask development
      1 medium handlebars development
      1 medium got development
      1 medium decode-uri-component development
      1 medium (at)snyk/snyk-cocoapods-plugin development
      1 low tmp development
      1 low snyk development
      1 low ip development
      1 low handlebars development
      1 low (at)babel/core development
      1 high tree-kill development
      1 high toml development
      1 high tmp development
      1 high snyk-php-plugin development
      1 high snyk-gradle-plugin development
      1 high snyk-go-plugin development
      1 high semver runtime
      1 high qs runtime
      1 high parse-url development
      1 high parse-path development
      1 high pac-resolver development
      1 high nconf development
      1 high minimatch development
      1 high lodash.set development
      1 high json5 development
      1 high ip development
      1 high ini development
      1 high hoek development
      1 high form-data development
      1 high flatted development
      1 high dot-prop development
      1 high degenerator development
      1 high decode-uri-component development
      1 high braces development
      1 high brace-expansion development
      1 critical tree-kill development
      1 critical netmask development
      1 critical json-schema runtime
      1 critical form-data development
      1 critical (at)babel/traverse development

## Open Dependabot alerts, count
$ gh api "repos/m4bwav/is-an-image-url/dependabot/alerts?state=open&per_page=100" --paginate --jq length
95

## Webhooks (dead services leave these)
$ gh api repos/m4bwav/is-an-image-url/hooks --jq '.[] | "\(.id) \(.config.url) active=\(.active) events=\(.events|join(","))"'
14564187 https://snyk.io/webhook/github active=true events=pull_request,push
77226418 https://notify.travis-ci.org active=true events=create,delete,issue_comment,member,public,pull_request,push,repository
278447878 https://snyk.io/webhook/github/f0acc162-f093-4e61-aaca-455ef8c2a7f2 active=true events=pull_request,push

## Actions secrets (count) and variables
$ gh api repos/m4bwav/is-an-image-url/actions/secrets --jq '{total_count, names:[.secrets[].name]}'; gh api repos/m4bwav/is-an-image-url/actions/variables --jq '{total_count, names:[.variables[].name]}'
{"names":[],"total_count":0}
{"names":[],"total_count":0}

## Environments
$ gh api repos/m4bwav/is-an-image-url/environments --jq '.environments[]? | "\(.name) reviewers=\([.protection_rules[]? | select(.type=="required_reviewers") | .reviewers[]?.reviewer.login] | join(","))"'

## Workflows
$ gh api repos/m4bwav/is-an-image-url/actions/workflows --jq '.workflows[] | "\(.name) \(.path) \(.state)"'

## Forks
$ gh api repos/m4bwav/is-an-image-url/forks --jq '.[] | "\(.full_name) pushed=\(.pushed_at[:10])"'
adrian-hintze/is-image-url-async pushed=2018-10-07
gitter-badger/is-an-image-url pushed=2017-06-25

## Releases and tags
$ gh release list -R m4bwav/is-an-image-url --limit 20; gh api repos/m4bwav/is-an-image-url/tags --jq '.[].name' | head -30
v1.0.4
v1.0.3
v1.0.2
v1.0.1

## Dead-service files in the default branch
$ gh api repos/m4bwav/is-an-image-url/git/trees/HEAD?recursive=1 --jq '.tree[].path' | grep -Ei '^(\.travis\.yml|\.snyk|\.sonarcloud\.properties|sonar-project\.properties|\.coveralls\.yml|codecov\.yml|\.codecov\.yml|appveyor\.yml|\.circleci/|\.npmignore|\.nuspec|\.vscode/)' || echo '(none)'
.travis.yml

## Badges in the README
$ gh api repos/m4bwav/is-an-image-url/readme --jq .content | base64 -d 2>/dev/null | grep -Eo 'https?://[^ )]*(shields\.io|travis-ci|david-dm|snyk\.io|coveralls|codecov|gitter|sonarcloud|nodei\.co|badgen|badge)[^ )]*' | sort -u || echo '(none)'
https://badges.gitter.im/m4bwav/is-an-image-url.svg
https://coveralls.io/github/m4bwav/is-an-image-url?branch=master
https://david-dm.org/m4bwav/is-an-image-url
https://gitter.im/m4bwav/is-an-image-url?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge
https://img.shields.io/badge/code_style-XO-5ed9c7.svg
https://img.shields.io/coveralls/m4bwav/is-an-image-url/master.svg
https://img.shields.io/david/m4bwav/is-an-image-url.svg
https://img.shields.io/npm/dt/is-an-image-url.svg
https://img.shields.io/npm/v/is-an-image-url.svg?branch=master
https://img.shields.io/travis/m4bwav/is-an-image-url/master.svg
https://nodei.co/npm/is-an-image-url.png?downloads=true&downloadRank=true&stars=true
https://nodei.co/npm/is-an-image-url/
https://snyk.io
https://snyk.io/test/npm/is-an-image-url
https://snyk.io/test/npm/is-an-image-url/badge.svg?style=flat-square
https://travis-ci.org/m4bwav/is-an-image-url

## Things only the maintainer can see
- Installed GitHub Apps and authorized OAuth apps: github.com/settings/installations and github.com/settings/applications (the API refuses the gh token).
- Whether a token in history is still live: revoke it at the provider regardless.

## Next: in the clone
- Read every source and test file, package.json, the build config, the README and every dotfile.
- Leaked credentials: .travis.yml, .npmrc, .env, workflows, and history (git log -S TOKEN_NAME).
- Run the old build and tests as they are (Windows: npm --script-shell "C:/Program Files/Git/bin/bash.exe" test for ./node_modules/.bin scripts).
- Then the golden capture from the PUBLISHED version in a scratch project (scripts/golden-capture-npm.template.cjs).
```

### check-readme-images.mjs, repository README (the tarball README gives the same nine lines)

```text
9 image(s) in README.md, checked for npm
FIX  [npm package] https://nodei.co/npm/is-an-image-url.png?downloads=true&downloadRank=true&stars=true
       - dead service (nodei.co (unmaintained)): replace with shields.io npm version and downloads badges
ok   [NPM Version] https://img.shields.io/npm/v/is-an-image-url.svg?branch=master
ok   [downloads] https://img.shields.io/npm/dt/is-an-image-url.svg
FIX  [Build Status] https://img.shields.io/travis/m4bwav/is-an-image-url/master.svg
       - dead service (Travis CI): replace with the GitHub Actions badge: https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg
       - the badge itself says "not found"
FIX  [Dependency Status] https://img.shields.io/david/m4bwav/is-an-image-url.svg
       - dead service (David (shut down)): replace with nothing; Dependabot covers dependency freshness
       - the badge itself says "not found"
FIX  [Coverage Status] https://img.shields.io/coveralls/m4bwav/is-an-image-url/master.svg
       - dead service (Coveralls): replace with nothing, unless the plan keeps a coverage service
FIX  [Known Vulnerabilities] https://snyk.io/test/npm/is-an-image-url/badge.svg?style=flat-square
       - dead service (Snyk): replace with nothing; Dependabot alerts and the registry audit in CI
ok   [XO code style] https://img.shields.io/badge/code_style-XO-5ed9c7.svg
FIX  [Gitter] https://badges.gitter.im/m4bwav/is-an-image-url.svg
       - dead service (Gitter): replace with nothing, or a link to GitHub Discussions if it is switched on
6 image(s) to keep-replace-or-remove
```

### Baseline, key lines (scratch clone; stacks trimmed)

```text
$ npm --script-shell "C:/Program Files/Git/bin/bash.exe" test
> is-an-image-url@1.0.4 test
> xo && nyc ava
TypeError: util.isDate is not a function
exit 1
$ npx --no-install xo
TypeError: util.isDate is not a function
$ npx --no-install nyc ava --verbose
TypeError [ERR_INVALID_ARG_TYPE]: The "mod" argument must be an instance of Module. Received an instance of Module
$ npx --no-install ava --verbose
  √ Should work with a valid image url
  √ Won't work with an invalid url
  √ Won't work without a callback
  √ Google.com should not be an image (101ms)
  √ Shouldn't work with a 404 (147ms)
  5 tests passed
```
