# Handoff

<!-- Keep under 50 lines. Replace, never append. Written at the end of a work session so the next one starts without re-deriving state. -->

## Current state
- Phases 0 and 1 of the package-modernize run are done (2026-09-25) and committed locally on `master`; **nothing is pushed** and nothing on GitHub or npm was changed.
- Survey, baseline, dependents, capture findings and the fetch probe: [notes/2026-09-25-phase-0-survey-baseline-and-dependents.md](notes/2026-09-25-phase-0-survey-baseline-and-dependents.md).
- Golden capture of the published 1.0.4: `test/golden/1.0.4.json` (82 cases, 11 CLI runs) with `capture-1.0.4.cjs`, `codec.cjs`, `fixture-server.cjs`; `fetch-probe.cjs` is evidence only.
- The plan: [plans/2026-09-25-modernization-and-v2-release.md](plans/2026-09-25-modernization-and-v2-release.md); the decision record: [decisions/2026-09-25-v2-promise-api-fetch-fixes-named-exceptions.md](decisions/2026-09-25-v2-promise-api-fetch-fixes-named-exceptions.md).
- everlast: mode repo, sync **off** for this no-push run (switch to push after the review).

## In progress
- The plan review: the maintainer rules on the decisions table.

## Decisions made this session
- All proposed, none ruled: keep 1.0.4's callback answers except eleven named fixes (D1), add a Promise form (D6), zero dependencies with fetch (D5), callable require() (D2), restore the CLI (D6), 2.0.0 then deprecate 1.x (D4).

## Dead ends hit
- The old suite cannot run on Node 24 (xo 0.25 and nyc 14 crash); ava 2 alone passes but uses google.com.
- The published CLI cannot be used as a baseline: it crashes on every call; 1.0.3's CLI shows the intended contract.

## Next single action
The maintainer rules on D1, D3b, D4 and D6 and gives or refuses the OKs in D10 (18 branch deletions), D11 (3 webhooks) and D14 (settings, everlast sync push); then push master, create branch `v2`, and write the golden test first.
