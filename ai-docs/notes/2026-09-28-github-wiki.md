---
title: GitHub wiki written and published for 2.0.0
kind: note
date: 2026-09-28
verified: 2026-09-29
stale_after: 2027-03-28
tags: [wiki, docs, 2.0.0, github, wikiwright, golden]
summary: "the ten wiki pages, where their git working copy is, how every example was verified against the published 2.0.0 with a local fixture server (the script and its output beside this note), how the golden capture of 1.0.4 was replayed for Versions and upgrading, the facts the README lacks, the inaccuracies in the shipped docs, and how to update the wiki; read before touching the wiki, the README's CLI help block or Promise-rejection sentence, or the CHANGELOG's compare link"
---

# GitHub wiki for 2.0.0

## Summary

Mark asked for the repository wiki (https://github.com/m4bwav/is-an-image-url/wiki) as the third real run of the wikiwright skill (m4bwav/wikiwright, released as 0.3.0 from this run). Ten pages plus sidebar and footer were written from:

- the 2.0.0 source, README, CHANGELOG, AGENTS.md, HANDOFF, log and the Phase 0 survey note;
- the CI workflows, the tags and releases (no issues exist) and the npm registry;
- the golden capture under `test/golden/`, replayed against 1.0.4 and 2.0.0.

Every output on the wiki was printed by `2026-09-28-wiki-verify.mjs` (next to this note) against `is-an-image-url@2.0.0` installed from npm, with a local fixture server and a local stand-in proxy; no request went to the internet. Its full output, with the fixture ports replaced by `<port>`, is `2026-09-28-wiki-verify.out.txt`.

Published on 2026-09-28 as wiki commit `8861236`. Results:

- `wikiwright.py live`: 10 pages, 0 failures; sidebar and footer rendered.
- `wikiwright.py check`: 0 errors, 0 warnings.
- `wikiwright.py outputs`: 40 outputs checked, 0 missing (wikiwright 0.3.0; 0.2.0's checker saw 30 of them).
- Everwrite checker: 0 strong findings, 11 weak (long sentences, judged fine).

Pages: Home, Getting started, API reference, How the answer is decided, Commands, Edge cases and errors, Recipes, Versions and upgrading, FAQ, Development.

## Where the pages are

`D:\m4bwa\Claude\Projects\Ai\is-an-image-url.wiki` (a sibling of this clone, outside this repository), branch `master`, remote `origin` = `https://github.com/m4bwav/is-an-image-url.wiki.git`. Files: `Home.md`, `Getting-Started.md`, `API-Reference.md`, `How-The-Answer-Is-Decided.md`, `Commands.md`, `Edge-Cases-and-Errors.md`, `Recipes.md`, `Versions-and-Upgrading.md`, `FAQ.md`, `Development.md`, `_Sidebar.md`, `_Footer.md`. Plain markdown links between pages (`[Recipes](Recipes)`), no wikilinks, LF line endings.

## How it was published

The wiki repository already held GitHub's placeholder (commit `83823de`, "Initial Home page", saved by Mark earlier on 2026-09-28). `wikiwright.py preflight m4bwav/is-an-image-url --enable --clone <wiki dir>` reported `STATE: placeholder`. The pages were committed on the cloned placeholder and pushed as a plain fast-forward (`83823de..8861236`). `wikiwright.py live`: 10 pages, 0 failures.

## Updating the wiki later

1. `git -C D:\m4bwa\Claude\Projects\Ai\is-an-image-url.wiki pull --ff-only`, then edit the pages.
2. Re-verify in a scratch folder outside the repository:
   - `npm init -y`, then `npm install is-an-image-url@<new> typescript@6 @types/node@24 is-image@3.1.0 is-image-300@npm:is-image@3.0.0`, and copy in `2026-09-28-wiki-verify.mjs` with `VERSION` changed. The script changes to its own folder, so no `cd` is needed.
   - In more scratch folders: `is-an-image-url@1.0.4` with `is-image-300@npm:is-image@3.0.0`, `is-an-image-url@1.0.3`, and the npm packages `deno` and `bun`.
   - Run `node wiki-verify.mjs > out.txt` with `RT=<deno and bun folder> PM=1 V104=<folder> V103=<folder> GOLDEN=<this clone's test/golden> BASH=<Git Bash's bash.exe>`. Without them the runtime, package-manager, old-version, golden and shell sections are missing. It takes about three minutes; the callback-timeout case waits out 20-second timeouts at the end.
   - Replace `127.0.0.1:<digits>` with `127.0.0.1:<port>` and diff with `2026-09-28-wiki-verify.out.txt`. Two runs on 2026-09-28 were identical, so every difference is a behaviour change or a new tool version (the package managers print their versions). Save the new output over the old.
3. `python <wikiwright>/scripts/wikiwright.py outputs <wiki dir> out.txt` must report 0 missing (wikiwright 0.3.0 or later). Then `wikiwright.py check <wiki dir> --version <new>` and the everwrite checker.
4. Commit, `git push`, `wikiwright.py live m4bwav/is-an-image-url <wiki dir>`.

Pages that name the version: Home (last line), Getting started (the Deno import, the tool versions), Commands (`--version` output and the first paragraph), Versions and upgrading (the table, downloads, the replay results), Development (the test count), the footer. A new major also changes the golden replay's comparison section.

## Updated 2026-09-29: the Node 20 run

The oldest Node line in `engines` (`>=20`) had not been run (wikiwright L-106 `oldest-node-run`). The saved script ran unchanged, with every optional section (`RT`, `PM=1`, `V104`, `V103`, `GOLDEN`, `BASH`), on Node 24.18.0 and on Node 20.20.2 (from `npx -y -p node@20`; its `node.exe` copied alone into a scratch folder put first on PATH, because the npm package's `bin` folder also holds a text file named `node` that makes Git Bash skip the folder). Wiki commit `c6d5f1b` (`8861236..c6d5f1b`).

**diffout against the saved output.** Node 24.18.0: 85 sections, 85 same (the saved output was left as it was). Node 20.20.2: 79 same, 6 changed; saved as `2026-09-28-wiki-verify.node20.out.txt` (ports as `<port>`, the scratch path in the bad-option line as `<scratch>`). The changes:

1. `installed`: Node v20.20.2.
2. The proxy recipe: `NODE_USE_ENV_PROXY=1` printed `false` and the stand-in proxy received nothing; `node --use-env-proxy` printed `bad option: --use-env-proxy`, exit 9. Node 20 has neither switch.
3. The golden replay of 2.0.0: 65 same answers (68 on Node 24), 45 same timing, 64 same request lines (77). The replay of 1.0.4 was identical on both lines. Cause, found by bisecting the capture: `capture-1.0.4.cjs` calls `server.dropConnections()` after every case, and Node 20.20.2's `fetch` sent the next request on the destroyed keep-alive connection, failing with `ECONNRESET` (13 calls, every second request); 2.0.0 answers `false` for any failed request. Node 24.18.0's `fetch` did not reuse the closed connection. A small script with the capture's fixture server reproduced it with `dropConnections()` after each call (Node 20: 2 of 6 calls false with `ECONNRESET`; Node 24: none) and not without it, with pauses up to 26 s, callback or Promise form. So it is Node 20's `fetch` meeting a server that closes idle connections, not a change in 2.0.0. The repository already knew this: `test/functional/is-an-image-url.test.js` waits 30 ms after `server.dropConnections()` for the same reason ("seen on Node 20, 22 and 26" in its comment). The capture script, which only ever ran on Node 24, does not wait; a `sleep(30)` after its `dropConnections()` would make the Node 20 replay comparable (not tried: the golden files were only read).

Everything else (both module systems, the TypeScript cases, the command line, Deno 2.9.6 and Bun 1.4.2, pnpm, both Yarns, the bash loop, 1.0.4 and 1.0.3, the request headers) printed the same on Node 20.20.2.

**Page claims.** Two were wrong or unscoped on Node 20 and were fixed: Recipes, "Through a proxy", told readers to turn proxy support on with the two switches (now "On Node 24.18.0 ..." and a closing sentence with the Node 20.20.2 results), and FAQ, "How do I use a proxy?" (now adds "Both worked on Node 24.18.0; Node 20.20.2 has neither"). Versions and upgrading now says the replays ran on Node 24.18.0 and what Node 20.20.2 gave, with the cause. Getting started says a second run on Node 20.20.2 printed the same apart from those two. Footer date 2026-09-29. The request headers on How the answer is decided (Node 24.18) were the same on Node 20.20.2, so they need no scope.

**Checks.** `wikiwright.py outputs` with the saved Node 24 output: 40 checked, 0 missing (with the Node 20 output: 2 missing, the proxy's `CONNECT` block and the 2.0.0 replay block, both now scoped to Node 24.18.0 on the pages). `check --version 2.0.0`: 0 errors, 0 warnings. Everwrite: 0 strong, 11 weak. `live`: 10 pages, 0 failures, sidebar and footer rendered.

**Next time.** Run the script on Node 20 as well and diff with `2026-09-28-wiki-verify.node20.out.txt`; set `PYTHONIOENCODING=utf-8` for `wikiwright.py diffout` on Windows when outputs hold characters outside cp1252.

## How the examples were verified

Everything ran on Windows 11 with Node 24.18.0 and npm 11.16.0, in a scratch project with `is-an-image-url@2.0.0` and `typescript@6.0.3`:

- **Fixture server.** An in-process HTTP server on 127.0.0.1 with one route per behaviour (image, page, 404 image, no type, redirects, a loop, slow and never-answering routes, an 8 MiB body). A second server on a port just closed stands for a refused connection. The pages show the fixture as `https://example.com`.
- **Proxy.** A stand-in proxy that answers `CONNECT` by handing the socket to the fixture server. Node 24.18 tunnels even `http:` targets with `CONNECT` under `NODE_USE_ENV_PROXY=1` or `--use-env-proxy`; the host `images.invalid` never resolves, so nothing left the machine.
- **Module systems, runtimes and package managers.** ESM, CommonJS, Deno 2.9.6 (with and without `--allow-net`) and Bun 1.4.2 from npm; pnpm 12.6.0, Yarn 1.22.22 and Yarn 4.18.1 through corepack, and `bun add`, each installing 2.0.0 into an empty project and running the Home example.
- **Types.** `tsc --strict --module nodenext` on an ESM file, a CommonJS file, a file with a wrong option type, and a file compiled without `@types/node` or the `dom` library.
- **Command line.** The published `dist/cli.mjs`, spawned asynchronously (the fixture server shares the process), and `npx is-an-image-url` in the project; a bash loop over the bin in Git Bash.
- **Old versions.** 1.0.4 and 1.0.3 from npm: their command line tools and 1.0.4's callback on five fixture URLs.
- **Golden capture.** `test/golden/capture-1.0.4.cjs`, run unchanged against 1.0.4 installed today: 82 of 82 calls and 11 of 11 CLI runs identical to `1.0.4.json`. Run against 2.0.0 with two lines patched (the CLI path `dist/cli.mjs`, and a dependency lookup that tolerates packages 2.0.0 does not have): 68 of 82 calls with the same answer, 45 with the same timing, 77 with the same request lines, 0 of 11 CLI runs identical. The 14 different answers and 5 different request lists are each a CHANGELOG line. The golden file was only read.
- **How the capture's fixture server fits.** The capture script brings its own `fixture-server.cjs` and `codec.cjs` and starts the server itself, so the wiki script copies the three files next to each installed version and runs the capture as a child process, one version after the other (it has timing cases). It is a separate server from the wiki's fixture: the capture keeps its own routes and records, and the wiki script only compares the JSON it prints with `1.0.4.json`.
- **The repository's own tests.** `npm test` on a `git archive` export of master: 377 tests in 8 suites, 377 passed.

Not run: browsers (the FAQ says so), a global install, `npx` without a local install, Node lines other than 24.18.0, and timeouts above 2,147,483,647 ms (from the CHANGELOG).

## Facts verified while writing (not in the README)

- In the Promise form, a second argument that is neither a function, an object, `null` nor `undefined` throws synchronously (`isAnImageUrl('cat.png', 'yes')`); a bad `url` or option rejects. `null` as options is accepted.
- `AbortSignal.timeout(200)` as `signal` rejects with `TimeoutError: The operation was aborted due to timeout`, while `{timeout: 200}` resolves `false`. An already-aborted signal rejects even for a file name.
- `urls.map(isAnImageUrl)` throws ``Expected `callback` to be a function (or an options object), got number``.
- `util.promisify(isAnImageUrl)` rejects with `true` for an image and resolves `undefined` for a page.
- Deno 2.9.6 without `--allow-net`, with no terminal, prints `false` for requested URLs and no error.
- The ES module and CommonJS builds are separate copies of the function.
- A deep import (`is-an-image-url/index.js`) fails with `ERR_PACKAGE_PATH_NOT_EXPORTED`.
- Without `@types/node` or the `dom` lib, TypeScript reports `TS2304: Cannot find name 'AbortSignal'` from `dist/index.d.mts` (the README says a lib is needed; the error text is new).
- Request headers from Node 24.18's `fetch`: `accept: */*`, `accept-language: *`, `sec-fetch-mode: cors`, `user-agent: node`, `accept-encoding: gzip, deflate`, `connection: keep-alive`. A URL fragment is not sent.
- A redirect loop makes 21 requests (1.0.4 made 11).
- For an 8 MiB image the server's write never finished: the body is cancelled after the headers.
- Node's environment proxy support tunnels `http:` URLs with `CONNECT`, so a proxy must allow `CONNECT` to port 80.
- 1.0.4 without a callback throws `Error: Callback must be set to receive the result of the image check.`; its CLI fails every call with `TypeError: (options.help || "").replace is not a function`, exit 1. 1.0.3's CLI works and its help is a paragraph of history with no options.
- Registry, read 2026-09-28: 7 versions; only `latest` (2.0.0) as a dist-tag; 1.0.0 to 1.0.4 deprecated with the corrected message; downloads in the week to 2026-09-27: 583 (2.0.0 309, 2.0.0-beta.3 158, 1.0.4 80, older 36); month 610; year 967. 2.0.0: 11 files, 75,295 bytes unpacked, with an attestation. The published README and CHANGELOG are identical to master's.

## Inaccuracies found in the docs

Numbered. 1 to 3 are in files that ship in the package (README, CHANGELOG), so a fix reaches npm only with a release; not fixed. 4 and 5 are repository files.

1. README, "Command line": the help text shown is a shortened copy. The real `--help` also has the paragraph "Prints true or false. A file name or a URL whose path ends in an image extension is answered without a request; ..." and an "Example" section. Paste the real output or say it is an excerpt.
2. README, "With a Promise": "It rejects only when an argument has the wrong type (a `TypeError`) or the signal is aborted". For a second argument of the wrong type (a string, a number) it does not reject: it throws synchronously, before any Promise exists. The CHANGELOG's Added line ("It rejects only for an argument of the wrong type") has the same gap. Suggested: "It throws a `TypeError` when the second argument is neither a callback nor options, and otherwise rejects only when ...".
3. CHANGELOG, link references: `[2.0.0]: https://github.com/m4bwav/is-an-image-url/compare/v1.0.4...HEAD` still points at `HEAD`; the tag `v2.0.0` exists, so it should be `v1.0.4...v2.0.0`.
4. ai-docs/HANDOFF.md said "`next` still points to 2.0.0-beta.3". On 2026-09-28 npm showed only `latest`. Corrected in HANDOFF with this note.
5. AGENTS.md, "What this is": "1.0.4 ... is the published version until 2.0.0 ships" and "Until branch `v2` merges, `master` holds the 1.0.4 code" are out of date since 2.0.0 shipped on 2026-09-26. Not shipped in the package; left for Mark.

Worth adding at the next README change (omissions): Deno answering `false` without `--allow-net`; `AbortSignal.timeout` rejecting where `timeout` resolves `false`; the `map` and `promisify` traps; the `CONNECT` tunnelling behind a proxy.

## Gotchas

- Node 24.18's environment proxy support sends `CONNECT` even for `http:` URLs. A stand-in proxy without a `connect` handler leaves the child process hanging; answer `CONNECT` and emit `connection` on the fixture server.
- Yarn through corepack without a `packageManager` field is Yarn 1.22.22, which prints a header and a `Done in 0.12s.` timing; run it with `--silent`. Yarn 4 needs `packageManager: "yarn@4.18.1"` and `yarn node` (Plug'n'Play).
- The golden capture's two replays have timing cases (300 ms timeouts): run them one after the other, not in parallel.
- `tsc --types ''` is refused (`TS6044`); point `--typeRoots` at an empty folder to leave out `@types/node`.

Related: see also [../HANDOFF.md](../HANDOFF.md), [../log.md](../log.md), [2026-09-25-phase-0-survey-baseline-and-dependents.md](2026-09-25-phase-0-survey-baseline-and-dependents.md).
