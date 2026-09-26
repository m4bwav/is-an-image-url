# Handoff

<!-- Keep under 50 lines. Replace, never append. Written at the end of a work session so the next one starts without re-deriving state. -->

## Current state
- 2026-09-26: **2.0.0 released** under `latest` and verified from the registry: provenance (SLSA v1), 1 verified signature and 1 verified attestation, GitHub Release v2.0.0, verify-published run 36251363432 green on Node 20 to 26 (Linux, Windows, macOS), Bun and Deno.
- `next` still points to 2.0.0-beta.3 (harmless; moving it is optional).
- Ruleset 24042507 on master; Dependabot and CI run weekly; 0 alerts, 0 open pull requests, master is the only branch.

## Standing work
1. D4: 1.x is deprecated (2026-09-26) but its message is literally "..." (a placeholder the agent wrote in chat; the maintainer ran it verbatim). Fix, after the maintainer says "run it" (the maintainer stays logged in to npm on this PC; npm answers 2FA with a browser link): `npm deprecate is-an-image-url@"<2" "1.x depends on the deprecated request package and its CLI is broken; use 2.x"`, then `npm view is-an-image-url@1.0.4 deprecated`. Optional: `npm dist-tag add is-an-image-url@2.0.0 next`.
2. Dependents: markdown-plain-link-replacer's run moves to `^2.0.0` (plan D15 says what it can rely on).
3. Dependabot pull requests: review and merge as they come; `live.yml` runs weekly against real hosts.
4. Revisit the pooled-socket `false` (plan Risks) only if a user reports spurious `false` answers.

## Decisions made this session
- The merge commit stays. The CHANGELOG section is `## [2.0.0] - 2026-09-26`.

## Dead ends hit
- `## [Unreleased]` is not found by release.yml; lint before every tag (beta.1 and beta.2 never reached npm).
- actionlint without shellcheck passed a truncated `[` test in verify-published.yml; package-modernize's scripts/check-workflow-shell.py catches it.

## Next single action
Fix the 1.x deprecation message (standing work 1) after the maintainer's "run it".
