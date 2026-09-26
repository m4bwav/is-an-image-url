# Handoff

<!-- Keep under 50 lines. Replace, never append. Written at the end of a work session so the next one starts without re-deriving state. -->

## Current state
- Rulings 2026-09-26: the maintainer accepted every recommendation (confirmed first-hand); OKs for D10, D11, D14 given. everlast sync is push.
- Phases 2 and 3 done on branch `v2`: PR #25 (https://github.com/m4bwav/is-an-image-url/pull/25). 377 tests; CI green on every job (runs 36245467641 and 36246369400); review summary posted as a PR comment.
- Done in Phase 4 already: the three dead webhooks deleted (0 left); repository settings, secret scanning, push protection, private vulnerability reporting, read-only workflow permissions.
- Trusted publisher: set up by the maintainer 2026-09-26.

## In progress
- Stop: the maintainer reviews and merges PR #25 (squash).

## Decisions made this session
- POSIX path handling on every platform (1.0.4 on Windows split on backslashes); documented in CHANGELOG.
- Long timeouts are clamped to 2147483647 ms; the CommonJS declaration exports no type names (answered in the review comment).

## Dead ends hit
- Node 20, 22, 26: fetch reused a pooled socket the fixture server had just destroyed; the suites wait 30 ms after dropConnections().
- `xo --fix` removed `| null` from the public types; restored with a reasoned disable.

## Next single action
After the merge: confirm Dependabot alerts are 0, close the 17 bot PRs with the plan's comments (`gh pr close N --delete-branch`), delete `mime-issue`, add the ruleset on master, check the README CI badge, then `npm version 2.0.0-beta.1` and `git push --follow-tags`; stop for the maintainer's approval on npm.
