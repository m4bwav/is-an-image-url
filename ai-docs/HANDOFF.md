# Handoff

<!-- Keep under 50 lines. Replace, never append. Written at the end of a work session so the next one starts without re-deriving state. -->

## Current state
- 2026-09-26: Phase 4 complete (PR #25 merged as d9e246b, bot PRs closed, branches deleted, alerts 0, ruleset 24042507, settings on).
- Phase 5: 2.0.0-beta.3 staged on npm under `next` with provenance: release run 36248115597, stage id 516120e1-4155-4e48-8ca7-20c5de8a7fbf, GitHub prerelease v2.0.0-beta.3. The trusted publisher works.
- beta.1 and beta.2 tags exist but their release runs failed before staging (changelog heading, then its link definition); they were never on npm.
- `npm view is-an-image-url dist-tags` is still `latest: 1.0.4` until the approval.

## In progress
- Stop: the maintainer approves the staged 2.0.0-beta.3 on npmjs.com (Staged Packages, 2FA). That step needs the maintainer's 2FA; everything else the agent runs itself.

## Decisions made this session
- The merge commit stays as it is. Bot PR comments name d9e246b.
- The CHANGELOG section is `## [2.0.0] - Unreleased` with link `[2.0.0]:`; date it for the 2.0.0 release.

## Dead ends hit
- `## [Unreleased]` is not found by release.yml's notes step; renaming it left an unused link definition that xo fails. Lint before every tag.
- Auto mode refused the tag push twice until the maintainer said explicitly to run it. The maintainer wants commands run, not handed over.

## Next single action
After the approval: `npm view is-an-image-url dist-tags` (next = 2.0.0-beta.3), `gh workflow run verify-published.yml -f version=2.0.0-beta.3`, `npm audit signatures` in a scratch install; log the run ids; then Phase 6 (date the changelog, `npm version 2.0.0`, push).
