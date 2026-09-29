# Handoff

<!-- Keep under 50 lines. Replace, never append. Written at the end of a work session so the next one starts without re-deriving state. -->

## Current state
- 2026-09-26: **2.0.0 released** under `latest` and verified from the registry: provenance (SLSA v1), 1 verified signature and 1 verified attestation, GitHub Release v2.0.0, verify-published run 36251363432 green on Node 20 to 26 (Linux, Windows, macOS), Bun and Deno.
- `latest` (2.0.0) is the only dist-tag (npm, 2026-09-28; this line said `next` still pointed to 2.0.0-beta.3).
- GitHub wiki (2026-09-28): ten pages at https://github.com/m4bwav/is-an-image-url/wiki (wiki commit 8861236, working copy `D:\m4bwa\Claude\Projects\Ai\is-an-image-url.wiki`). How to update it, the verification script and its saved output, and five doc inaccuracies (three in the README and CHANGELOG): notes/2026-09-28-github-wiki.md.
- Wiki on Node 20 (2026-09-29, wiki commit c6d5f1b): the script ran on Node 20.20.2 too, output saved as notes/2026-09-28-wiki-verify.node20.out.txt. Only the proxy switches (absent on Node 20; Recipes and FAQ now scoped) and the golden replay of 2.0.0 (13 ECONNRESET calls because capture-1.0.4.cjs drops connections without the functional test's 30 ms wait) differed. Note section "Updated 2026-09-29".
- Ruleset 24042507 on master; Dependabot and CI run weekly; 0 alerts, 0 open pull requests, master is the only branch.
- D4 done: 1.0.0 to 1.0.4 are deprecated with "1.x depends on the deprecated request package and its CLI is broken; use 2.x" (the maintainer replaced the "..." placeholder; read back 2026-09-26); 2.0.0 is not deprecated.

## Standing work
1. None on the registry.
2. Dependents: markdown-plain-link-replacer's run moves to `^2.0.0` (plan D15 says what it can rely on).
3. Dependabot pull requests: review and merge as they come; `live.yml` runs weekly against real hosts.
4. Revisit the pooled-socket `false` (plan Risks) only if a user reports spurious `false` answers.

## Decisions made this session
- The merge commit stays. The CHANGELOG section is `## [2.0.0] - 2026-09-26`.

## Dead ends hit
- `## [Unreleased]` is not found by release.yml; lint before every tag (beta.1 and beta.2 never reached npm).
- actionlint without shellcheck passed a truncated `[` test in verify-published.yml; package-modernize's scripts/check-workflow-shell.py catches it.

## Next single action
None; the run is finished. Merge Dependabot pull requests as they come.
