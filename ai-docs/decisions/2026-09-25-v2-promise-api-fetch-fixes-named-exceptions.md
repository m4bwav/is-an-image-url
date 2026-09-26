---
title: "v2 shape: keep the callback answers, add a Promise form, fetch instead of request, fix the wrong answers as named exceptions, restore the CLI"
kind: decision
status: proposed
date: 2026-09-25
verified: 2026-09-25
stale_after: never
tags: [v2, api, errors, esm, cjs, golden, compatibility, fetch, cli]
summary: "read before changing what the function answers, how it requests, or how it is exported: why 2.0.0 keeps 1.0.4's callback answers except eleven named fixes, returns a Promise without a callback, drops all four dependencies for fetch and inlined checks, keeps require() callable, restores the CLI and deprecates 1.x after release"
---

# Decision: v2 keeps the callback answers, adds a Promise form, uses fetch, fixes the wrong answers by name, restores the CLI

Date: 2026-09-25. Status: proposed, waiting for the maintainer's plan review. Each point maps to a row of the plan's decisions table in [../plans/2026-09-25-modernization-and-v2-release.md](../plans/2026-09-25-modernization-and-v2-release.md).

## Context

is-an-image-url 1.0.4 (2019-11-28) is one CommonJS function, `isAnImageUrl(url, callback, timeout)`, that answers by file extension (is-image 3) when the string is not a URL (is-url) or its path ends in an image extension, and otherwise by the Content-Type of a `request` GET. The capture of the published version (`test/golden/1.0.4.json`: 82 cases against a local fixture server, 11 CLI runs) shows it answers correctly for ordinary inputs and wrongly or dangerously at the edges: `undefined` or `''` instead of `false`, 404 and 500 image responses counted as images, case-sensitive media types, synchronous throws for URLs the URL parser refuses, a crash for a non-function callback, whole bodies downloaded, credentials sent and leaked in a Referer header. Its CLI has crashed on every call since 1.0.4 (meow 5 no longer takes `help` as an array). Its one real dependent, the maintainer's markdown-plain-link-replacer, passes strings from `url-regex` and tests the answer for truthiness. The survey is [../notes/2026-09-25-phase-0-survey-baseline-and-dependents.md](../notes/2026-09-25-phase-0-survey-baseline-and-dependents.md).

## Decision

1. **The callback answers stay (D1)**, as booleans, for every captured case except eleven named fixes: non-boolean answers become `false`; non-2xx responses and a 302 without Location are not images; media types compare without case; URLs the parser refuses answer `false` instead of throwing; a stalled body after image headers is `true`; argument errors are TypeErrors naming the argument; the callback always runs asynchronously; URLs with credentials are not requested. Each is one line in the golden test's exception list and one changelog line.
2. **A Promise form on the same name (D6)**: without a callback, `isAnImageUrl(url, {timeout, signal})` returns `Promise<boolean>`; it rejects only for argument errors or an aborted signal (D7).
3. **Zero runtime dependencies (D5)**: the platform's `fetch` with the body cancelled after the headers, is-url's pattern and is-image 3.1.0's extension list inlined with their MIT notices, `node:util` `parseArgs` for the CLI.
4. **`require()` returns the function (D2)**, carrying `.default` and `.isAnImageUrl`; ESM has default and named exports; types overload both forms.
5. **The CLI comes back (D6)**, printing `true` or `false` as 1.0.3 did.
6. **2.0.0 only, then 1.x deprecated by the maintainer (D4).**

## Reasons

- The kept answers are the ones a caller can have relied on; the fixed ones are answers nobody wants, and the one real dependent is better off with every fix (a protocol-relative URL no longer rejects its `Promise.all`).
- `request` is deprecated and carries the runtime alerts; `fetch` is in every supported runtime, answers from the headers and refuses credential URLs by itself.
- The major is needed anyway (exports map, ESM, types, Node floor, asynchronous callback), so the fixes cost no extra break.
- Restoring the CLI is a few lines and matches the README; get-title-at-url's CLI and tests are the model.

## Rejected alternatives

- A packaging-only 2.0.0 that keeps all 82 answers exact, `undefined` included: safe but carries every bug into a new major.
- Fixes only in the Promise form, the callback form exact (the D1 alternative): two behaviours behind one name for one major; the maintainer may prefer it.
- A 1.0.5 patch that fixes the CLI's help string: still ships request and its advisories through a second pipeline.
- Dropping the CLI (as replace-string-at-position did): that CLI was never installable; this one was documented, installed and worked until 2019.
- HEAD instead of GET: fewer bytes, but servers answer HEAD inconsistently; GET with the body cancelled costs a few kilobytes.

Related: builds on [../plans/2026-09-25-modernization-and-v2-release.md](../plans/2026-09-25-modernization-and-v2-release.md); see also [../notes/2026-09-25-phase-0-survey-baseline-and-dependents.md](../notes/2026-09-25-phase-0-survey-baseline-and-dependents.md).
