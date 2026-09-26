# AGENTS.md

Rules for any AI agent (Claude Code, Copilot, Cursor, Codex) working in this repository. `CLAUDE.md` and `.github/copilot-instructions.md` only point here.

## What this is

The npm package `is-an-image-url`: checks whether a URL points to an image, by its file extension or else by the Content-Type of the response, with a command line tool. On npm since 2017; 1.0.4 (2019-11-28, one CommonJS file on request, is-image, is-url and meow, no build) is the published version until 2.0.0 ships. Version 2 is TypeScript in `src/`, built by tsdown into ESM and CommonJS with a declaration file for each, with no runtime dependencies. The plan is `ai-docs/plans/2026-09-25-modernization-and-v2-release.md`; start with `ai-docs/HANDOFF.md` to see how far it has got. Until branch `v2` merges, `master` holds the 1.0.4 code, whose `npm test` cannot run on Node 24 (see the survey note); the commands below are version 2's.

## Rules

- **The callback answers of 1.0.4 stay, except the named fixes.** `isAnImageUrl(url, callback)` gives 1.0.4's answer, as a boolean, for every case in `test/golden/1.0.4.json` except the exceptions the plan's D1 lists (non-boolean answers, non-2xx responses, case-sensitive media types, URLs the parser refuses, a stalled body, argument errors, the synchronous callback, credential URLs), each named once in the golden test with its changelog line. `require()` still returns the function. The golden file was captured from the published 1.0.4 by `test/golden/capture-1.0.4.cjs` with `codec.cjs` against `fixture-server.cjs`, in a scratch project; never regenerate it from this repository. Any other change to an old answer needs a decision entry in `ai-docs/decisions/` and a changelog line.
- **Availability.** The package must stay usable from `import` and `require`, ship types for both, and support every Node line in `engines`. The library stays free of Node and DOM APIs (`process`, `Buffer`, `require`, `__dirname`, `node:` imports, `window`, `document`); it uses only `fetch`, `URL`, `AbortSignal` and timers, so it runs in Bun, Deno, workers and (for CORS-enabled servers) browsers. Only the CLI entry may use Node APIs. No runtime dependency without a decision entry in `ai-docs/decisions/`.
- **Tests cover every artifact, not just the code.** The plan's test strategy is the contract: golden, unit, functional and CLI against the local fixture server, package shape (`publint`, `@arethetypeswrong/cli`), consumer fixtures for ESM, CJS and the type files, Bun and Deno, and post-publish verification from the registry. A behaviour change lands with its test. `npm test` never touches the network; only `live.yml` does.
- **Nothing reaches npm without the maintainer.** Never run `npm publish` or `npm stage publish` from a machine, never create or store an npm token, and never approve anything on npmjs.com. Releases go through `release.yml`, which only stages; the maintainer approves each version with 2FA.
- **Releases follow one ritual.**
  1. Update `CHANGELOG.md`. A release's heading carries its date; `release.yml` refuses "Unreleased" for a release, and a prerelease uses the section of the release it leads to.
  2. Run `npm version <major|minor|patch>`, then `git push --follow-tags`.
  3. `release.yml` builds, tests, stages the npm publish through trusted publishing and creates the GitHub Release.
  4. The maintainer approves the staged version on npmjs.com.
  5. Run the `verify-published` workflow with the version.
- **Dependencies.** Dependabot opens weekly pull requests (npm and GitHub Actions); merge when the `ci` check is green, and read the release notes for a major first. Actions are pinned to commit SHAs with the version in a comment; keep it that way. When npm warns that a package's install script is not covered by `allowScripts`, check that lint, typecheck and the build pass after `npm ci --ignore-scripts`, then add the package to `allowScripts` as `false`.
- **Research beats recall.** Node, npm and tool versions change; the notes under `ai-docs/notes/` carry the date each fact was verified. Re-verify any version number older than three months before relying on it.
- **Document for handoff.** Anything learned, decided or built goes into `ai-docs/` (at minimum a line in `ai-docs/log.md`) before you finish. Rewrite `ai-docs/HANDOFF.md` when work is left unfinished. A fresh session in any tool must be able to continue from disk alone.
- **No AI attribution anywhere**: no Co-Authored-By trailers, no "generated with" lines in commits, pull requests or files.
- **Windows note.** Write files with an editor tool, not shell heredocs (they lose backslashes). Check line endings by counting byte 13 with node; Git Bash's grep cannot see carriage returns. Spawn npm and npx through a shell from Node; they are `.cmd` shims. `.gitattributes` keeps the repository LF (the 1.0.4 tarball was published with CRLF files).

## Commands

```bash
npm ci
npm run build          # tsdown -> dist/ (index.mjs, index.cjs, index.d.mts, index.d.cts, cli.mjs, maps)
npm test               # build, then node --test: golden, unit, functional, CLI, package shape (local fixture server only)
npm run test:dist      # the same suites against the dist/ already built, without building
npm run test:consumers # build, pack, install the tarball into a scratch project, run the ESM, CJS, type and bin fixtures
                       # CONSUMER_RUNTIMES=bun,deno adds Bun and Deno; CONSUMER_PACKAGE=is-an-image-url@<version> installs from npm instead
npm run coverage       # c8 over the suites, mapped back to src/; fails under 95% lines or 90% branches
npm run lint           # xo (config and every rule override, with its reason, in xo.config.js)
npm run typecheck      # tsc --noEmit
npm run check          # publint, attw --pack ., npm pack --dry-run
```

tsdown needs Node 22.18+ or 24 to build; the built output and the tests run on Node 20 and up.

## Layout and traps

- Planned `src/` (plan, "Build and package specifics"): the function, the inlined is-url pattern and is-image 3.1.0 extension list (each with its MIT notice), an ESM entry, a CommonJS entry that makes `require()` return the function (the replace-string-at-position recipe), and `cli.ts` on `node:util` `parseArgs`, the only file that may use Node APIs.
- `test/golden/1.0.4.json` was captured from the published 1.0.4 by the capture script beside it, in a scratch project, against `test/golden/fixture-server.cjs`, which the golden test starts too. Case arguments hold `{{base}}`, `{{localhost}}`, `{{closed}}` and `{{PORT}}` placeholders; requests are recorded with the port as `{{port}}`. `fetch-probe.cjs` beside them recorded how Node's fetch behaves on the same routes; it is evidence, not a test. Never regenerate the golden file from this repository's code. Lint ignores the golden files and the capture scripts, which are kept as they were run.
- Tests import `dist/`, never `src/`, and run against both builds (`test/helpers/builds.js`). The npm scripts name every test file, because plain `node --test` would also run the fixtures and the capture scripts.
- `xo --fix` rewrites code: stage your work first and read the diff it makes to `src/`.
- CI (`.github/workflows/ci.yml`) installs and builds on Node 24 in every job, because tsdown cannot run on Node 20. It then switches to the job's Node line and runs `npm run test:dist` and the consumer fixtures. The ruleset on `master` requires only the final `ci` job, which passes when every other job passed.
- The npm trusted publisher names `release.yml`, so renaming the file breaks publishing. Its `publish` job, the only one with `id-token` and `contents` set to write, stages the tarball the `build` job tested and runs no dependency code. Within 24 hours of a publish, Deno needs `--minimum-dependency-age=0` to install the new version.

## everlast (session knowledge, load on demand)

- `ai-docs/INDEX.md` lists what past sessions learned here (solutions with verified commands, decisions with reasons, plans). At the start of a task, scan it and open only the entries whose title or tags match; no line matches: `everlast.py search "<key terms>"` before concluding nothing was recorded. Read `ai-docs/HANDOFF.md` when continuing unfinished work (everlast-resume skill).
- Before acting on an entry marked `(recheck due)`, run `everlast.py recheck <entry>`, re-run its Verified-by command only when that is read-only or safe (a build, a test, a version query), then record `everlast.py verify <entry>` or `verify <entry> --failed "what broke"`; a fix that changed is superseded, never reused blindly.
- Before finishing a task that hit a dead end, verified a non-obvious command, made a design choice, or taught you something about the user, record it (everlast-capture skill, or `everlast.py note` / `handoff`); rewrite `HANDOFF.md` when work is left unfinished. Say "nothing to record" when that is true.
- Anything naming a person, an internal host or name, a credential, or an opinion about people goes to the private sidecar (`--private`), never here. Lessons about the user or this machine go to the user tier (`--user`).
- Rules go in this file, system layout in CODEMAP.md; the doc set holds only what could not be re-derived from the code in a minute.
- Link documents together with relative markdown links: every markdown folder is reachable from an index whose lines say when to read each file (`ai-docs/INDEX.md` is generated from frontmatter; give entries a one-line `summary`), and an entry links the entries it relates to on a typed `Related:` line (`supersedes`, `contradicts`, `builds on`, `see also`). The set then reads as a graph for people in Obsidian and for agents alike. No wikilinks in the repo.
