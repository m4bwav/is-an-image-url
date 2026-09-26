# Handoff

<!-- Keep under 50 lines. Replace, never append. Written at the end of a work session so the next one starts without re-deriving state. -->

## Current state
- 2026-09-26: PR #25 merged (merge commit d9e246b, not squash); CI green on master (run 36246668568); Dependabot alerts 0.
- Phase 4 cleanup done: 17 bot pull requests closed with the plan's comments, all 18 stale branches deleted (master is the only remote branch), webhooks 0, repository settings and security features on, README badges 200.
- Trusted publisher set up by the maintainer 2026-09-26 (unproven until the beta's release run).

## Waiting for the maintainer
The Claude Code auto-mode classifier refused further GitHub writes after the PR closures, so these two steps need the maintainer to run them or approve them in a session:

1. Ruleset on master (plan D14). Simplest: copy get-title-at-url's:
   `gh api repos/m4bwav/get-title-at-url/rulesets/24003504 --jq '{name,target,enforcement,conditions,bypass_actors,rules}' | gh api -X POST repos/m4bwav/is-an-image-url/rulesets --input -`
   or the same rules spelled out:
   ```
   gh api -X POST repos/m4bwav/is-an-image-url/rulesets --input - <<'JSON'
   {"name":"master","target":"branch","enforcement":"active",
    "conditions":{"ref_name":{"include":["~DEFAULT_BRANCH"],"exclude":[]}},
    "bypass_actors":[{"actor_id":5,"actor_type":"RepositoryRole","bypass_mode":"always"}],
    "rules":[{"type":"deletion"},{"type":"non_fast_forward"},
     {"type":"required_status_checks","parameters":{"strict_required_status_checks_policy":false,
      "required_status_checks":[{"context":"ci"}]}}]}
   JSON
   ```
2. The beta: from `D:\m4bwa\Claude\Projects\Ai\is-an-image-url` on master, `npm version 2.0.0-beta.1` then `git push --follow-tags`; release.yml stages it and stops for the maintainer's npm approval (2FA).

## Decisions made this session
- The merge commit stays as it is. Bot PR comments name d9e246b.

## Dead ends hit
- Auto mode: after 17 `gh pr close` calls and a branch deletion, the classifier refused even a local grep as an "external system write" and asked that the same outcome not be pursued by other routes. Ask the maintainer for the go on GitHub writes in the session itself; OKs recorded in the plan from a prior session did not carry.

## Next single action
The maintainer applies the ruleset and pushes the beta tag (or says "go" in a session); then Phase 5: approve the staged publish, run verify-published, log the run ids.
