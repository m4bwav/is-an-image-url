# Handoff

<!-- Keep under 50 lines. Replace, never append. Written at the end of a work session so the next one starts without re-deriving state. -->

## Current state
- 2026-09-26: Phases 0 to 5 done. 2.0.0-beta.3 is live under `next`, verified from the registry (signature, attestation, verify-published run 36249497972 on every Node line, OS, Bun and Deno).
- Phase 6: 2.0.0 staged under `latest` (release run 36249691630, stage id fa2f0209-6448-4188-aaee-2c76b7bbe2c9); CHANGELOG dated 2026-09-26.
- Ruleset 24042507 on master; admin pushes bypass the required `ci` check (the version commits go straight to master).
- beta.1 and beta.2 tags exist but never reached npm (changelog heading, then its link definition).

## In progress
- Stop: the maintainer approves the staged 2.0.0 on npmjs.com (Staged Packages, 2FA). That is the only step that needs the maintainer.

## After the approval (the agent runs all of it)
1. `npm view is-an-image-url dist-tags` (latest 2.0.0), `gh workflow run verify-published.yml -f version=2.0.0`, `npm audit signatures` in a scratch install, `gh release view v2.0.0`, `npm view is-an-image-url dist.attestations`; log the ids.
2. D4: deprecating 1.x needs the maintainer's npm 2FA: `npm deprecate is-an-image-url@"<2" "1.x depends on the deprecated request package and its CLI is broken; use 2.x"`. Ask for it as the maintainer's one step, or run it if the maintainer gives an OTP.
3. Phase 7: HANDOFF around standing work, inventory row, lessons into the skill, what the kickoff prompt got wrong. Next package in the inventory order.

## Decisions made this session
- The merge commit stays. The CHANGELOG section is `## [2.0.0] - 2026-09-26` with link `[2.0.0]:`.

## Dead ends hit
- `## [Unreleased]` is not found by release.yml; the renamed heading left an unused link that xo fails. Lint before every tag.
- actionlint without shellcheck passed a truncated `[` test in verify-published.yml; package-modernize's scripts/check-workflow-shell.py catches it.
- The maintainer wants commands run by the agent, never handed over.

## Next single action
When the maintainer says 2.0.0 is approved: step 1 above.
