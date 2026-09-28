// wiki-verify for is-an-image-url@2.0.0: runs every example on the wiki against the PUBLISHED
// package, never the working tree. The repository keeps this file as
// ai-docs/notes/2026-09-28-wiki-verify.mjs and its output as 2026-09-28-wiki-verify.out.txt
// (fixture ports replaced by <port>), so the next release can run it again and diff.
//
// Run it from a scratch folder outside the repository:
//   npm init -y
//   npm install is-an-image-url@2.0.0 typescript@6 @types/node@24 is-image@3.1.0 is-image-300@npm:is-image@3.0.0
//   node wiki-verify.mjs > out.txt
// (is-image and is-image-300 are only for the golden replay.)
//
// Optional environment, each adding a section:
//   RT=<folder with the npm packages deno and bun installed>
//       runs the Home example in Deno and Bun, and Deno without --allow-net
//   PM=1   installs 2.0.0 with pnpm and yarn (through corepack) and bun, each in a new folder
//          under ./pm, and runs the Home example there
//   V104=<folder with is-an-image-url@1.0.4 and is-image-300@npm:is-image@3.0.0 installed>
//   V103=<folder with is-an-image-url@1.0.3 installed>
//       the old versions, for Versions and upgrading
//   GOLDEN=<the clone's test/golden folder> (with V104)
//       replays capture-1.0.4.cjs against 1.0.4 today and against 2.0.0 (two lines patched),
//       and compares each with test/golden/1.0.4.json case by case; the golden file is only read
//   BASH=<bash executable> runs the shell recipe (Git Bash on Windows)
//
// Every case prints "## <label>" and then exactly what the code on the page prints. Pages show
// the fixture server's address http://127.0.0.1:<port> as https://example.com. Nothing here
// touches the internet: every request goes to the local fixture server or the local proxy.

import http from 'node:http';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync} from 'node:fs';
import path from 'node:path';
import util from 'node:util';
import {setTimeout as sleep} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';

// Everything runs in this file's folder, so no shell needs to change directory first.
process.chdir(path.dirname(fileURLToPath(import.meta.url)));

const PACKAGE = 'is-an-image-url';
const VERSION = '2.0.0';
const require = createRequire(import.meta.url);
const here = process.cwd();
const {RT, PM, V104, V103, GOLDEN, BASH} = process.env;
const DISPLAY = 'https://example.com';

function show(label, value) {
	console.log(`## ${label}`);
	console.log(typeof value === 'string' ? value : util.inspect(value));
	console.log();
}

// The fixture address as the pages show it.
const display = text => String(text).replaceAll(base, DISPLAY);

// Runs a page's example in this process and prints what its console.log calls printed.
async function example(label, fn) {
	const lines = [];
	const original = console.log;
	console.log = (...args) => lines.push(util.format(...args));
	try {
		await fn();
	} catch (error) {
		lines.push(`Uncaught ${error?.name}: ${error?.message}`);
	} finally {
		console.log = original;
	}

	show(label, display(lines.join('\n')));
}

// How a call ends: resolved value, rejection or synchronous throw, as the pages quote it.
async function outcome(fn) {
	let promise;
	try {
		promise = fn();
	} catch (error) {
		return `throws ${error.name}: ${error.message}`;
	}

	try {
		return `resolves ${util.inspect(await promise)}`;
	} catch (error) {
		return `rejects ${error?.name ?? typeof error}: ${error?.message ?? util.inspect(error)}`;
	}
}

// A child process, asynchronously (spawnSync would block the fixture server in this process, L-007).
function run(file, args, {cwd = here, env = {}, shell = false, input} = {}) {
	return new Promise(resolve => {
		const child = spawn(file, args, {cwd, env: {...process.env, ...env}, shell});
		let stdout = '';
		let stderr = '';
		child.stdout.on('data', chunk => {
			stdout += chunk;
		});
		child.stderr.on('data', chunk => {
			stderr += chunk;
		});
		child.on('close', code => {
			resolve({code, stdout: stdout.replaceAll('\r\n', '\n'), stderr: stderr.replaceAll('\r\n', '\n')});
		});
		if (input !== undefined) {
			child.stdin.end(input);
		}
	});
}

const text = ({code, stdout, stderr}) => display(`${stdout}${stderr ? `--- stderr\n${stderr}` : ''}`.trimEnd() + (code === 0 ? '' : `\n--- exit ${code}`));

// ----- the installed package -----
const pkgDir = path.join(here, 'node_modules', PACKAGE);
const pkg = JSON.parse(readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
if (pkg.version !== VERSION) {
	throw new Error(`installed ${pkg.version}, expected ${VERSION}`);
}

show('installed', `${PACKAGE}@${pkg.version} on Node ${process.version}`);
show('npm version', (await run('npm', ['--version'], {shell: process.platform === 'win32'})).stdout.trim());
const esm = await import(PACKAGE);
const cjs = require(PACKAGE);
const isAnImageUrl = esm.default;
show('esm exports', Object.keys(esm).sort());
show('cjs: require() returns', `${typeof cjs}, name ${cjs.name}, own keys ${Reflect.ownKeys(cjs).map(String).filter(k => !['length', 'name', 'prototype'].includes(k)).join(', ')}`);
show('cjs .default and .isAnImageUrl are the function itself', cjs.default === cjs && cjs.isAnImageUrl === cjs);
show('esm default and named export are one function', esm.default === esm.isAnImageUrl);
show('the ES module and CommonJS builds are separate copies', esm.default === cjs ? 'same function' : 'different functions');
show('package.json fields', {engines: pkg.engines, bin: pkg.bin, exports: pkg.exports, dependencies: pkg.dependencies ?? 'none'});
show('deep import of is-an-image-url/index.js', await import('is-an-image-url/index.js').then(() => 'loads', error => `rejects ${error.code}`));

// ----- the fixture server: one route per behaviour the pages show -----
const PNG = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex');
const BIG = 8 * 1024 * 1024;
let bigOutcome;
const routes = {
	'/cat': (q, r) => r.writeHead(200, {'content-type': 'image/png'}).end(PNG),
	'/logo.svg-as-page': (q, r) => r.writeHead(200, {'content-type': 'image/svg+xml; charset=utf-8'}).end('<svg/>'),
	'/about': (q, r) => r.writeHead(200, {'content-type': 'text/html; charset=utf-8'}).end('<title>About</title>'),
	'/shouting': (q, r) => r.writeHead(200, {'content-type': 'IMAGE/PNG'}).end(PNG),
	'/octet': (q, r) => r.writeHead(200, {'content-type': 'application/octet-stream'}).end(PNG),
	'/gone': (q, r) => r.writeHead(404, {'content-type': 'image/png'}).end(PNG),
	'/untyped': (q, r) => {
		r.removeHeader('content-type');
		r.writeHead(200).end(PNG);
	},
	'/photo.avif': (q, r) => r.writeHead(200, {'content-type': 'image/avif'}).end(PNG),
	'/page': (q, r) => r.writeHead(200, {'content-type': 'text/html'}).end('<title>Page</title>'),
	'/moved': (q, r) => r.writeHead(302, {location: '/cat'}).end(),
	'/elsewhere': (q, r) => r.writeHead(302, {location: `http://localhost:${port}/cat`}).end(),
	'/loop': (q, r) => r.writeHead(302, {location: '/loop'}).end(),
	'/slow': (q, r) => {
		setTimeout(() => r.writeHead(200, {'content-type': 'image/png'}).end(PNG), Number(new URL(q.url, base).searchParams.get('ms') ?? 1000));
	},
	'/never'() {},
	'/big'(q, r) {
		r.writeHead(200, {'content-type': 'image/png', 'content-length': BIG});
		let written = 0;
		const chunk = Buffer.alloc(64 * 1024);
		const write = () => {
			while (written < BIG) {
				written += chunk.length;
				if (!r.write(chunk)) {
					r.once('drain', write);
					return;
				}
			}

			r.end();
		};

		r.on('close', () => {
			bigOutcome = {bodyFinished: r.writableFinished, allBytesWritten: written >= BIG};
		});
		write();
	},
};
const seen = [];
const server = http.createServer((request, response) => {
	seen.push({line: `${request.method} ${request.url}`, headers: request.headers});
	const route = routes[new URL(request.url, 'http://x').pathname];
	if (route) {
		route(request, response);
	} else {
		response.writeHead(404, {'content-type': 'text/plain'}).end('not found');
	}
});
await new Promise(resolve => {
	server.listen(0, '127.0.0.1', resolve);
});
const {port} = server.address();
const base = `http://127.0.0.1:${port}`;
const closed = http.createServer();
await new Promise(resolve => {
	closed.listen(0, '127.0.0.1', resolve);
});
const closedBase = `http://127.0.0.1:${closed.address().port}`;
await new Promise(resolve => {
	closed.close(resolve);
});

// A forward proxy stand-in. Node's environment proxy support tunnels http: requests too, with
// CONNECT (Node 24.18); the tunnel is handed to the fixture server, which answers /cat, so no
// request leaves this machine. Plain proxy requests are answered the same way.
const proxied = [];
const proxy = http.createServer((request, response) => {
	proxied.push(`${request.method} ${request.url}`);
	response.writeHead(200, {'content-type': 'image/png'}).end(PNG);
});
proxy.on('connect', (request, socket) => {
	proxied.push(`CONNECT ${request.url}`);
	socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');
	server.emit('connection', socket);
});
await new Promise(resolve => {
	proxy.listen(0, '127.0.0.1', resolve);
});
const proxyAddress = `http://127.0.0.1:${proxy.address().port}`;

// The requests the fixture saw while fn ran.
async function requestsDuring(fn) {
	const before = seen.length;
	const value = await fn();
	await sleep(50);
	const lines = seen.slice(before).map(r => r.line);
	const requests = lines.length === 0 ? 'no request' : lines.length > 3 ? `${lines.length} x ${lines[0]}` : lines.join(', ');
	return {value, requests};
}

// ----- Home and Getting started: the same example in every runtime -----
const homeCode = `import isAnImageUrl from 'is-an-image-url';

console.log(await isAnImageUrl('https://example.com/cat'));
console.log(await isAnImageUrl('https://example.com/about'));
console.log(await isAnImageUrl('photo.png'));
`;
const live = code => code.replaceAll(DISPLAY, base);
writeFileSync('home.mjs', live(homeCode));
writeFileSync('home-deno.mjs', live(homeCode).replace("from 'is-an-image-url'", `from 'npm:is-an-image-url@${VERSION}'`));
const callbackCode = `const isAnImageUrl = require('is-an-image-url');

isAnImageUrl('https://example.com/cat', isAnImageResult => {
  if (isAnImageResult) {
    console.log('yes, the url was an image');
  } else {
    console.log('no, the url was not an image');
  }
});
`;
writeFileSync('home-callback.cjs', live(callbackCode));
show('home: node home.mjs', text(await run(process.execPath, ['home.mjs'])));
show('home: node home.mjs, second run', text(await run(process.execPath, ['home.mjs'])));
show('getting started: node callback.cjs', text(await run(process.execPath, ['home-callback.cjs'])));

if (RT) {
	const bin = name => path.join(RT, 'node_modules', '.bin', process.platform === 'win32' ? `${name}.cmd` : name);
	const shell = process.platform === 'win32';
	show('runtimes: deno --version', (await run(bin('deno'), ['--version'], {shell})).stdout.split('\n')[0]);
	show('runtimes: deno run --allow-net home-deno.mjs', text(await run(bin('deno'), ['run', '--allow-net', 'home-deno.mjs'], {shell})));
	show('runtimes: deno run home-deno.mjs (no --allow-net, not a terminal)', text(await run(bin('deno'), ['run', 'home-deno.mjs'], {shell})).replace(/\d+(\.\d+)?m?s\b/g, '<time>'));
	show('runtimes: bun --version', (await run(bin('bun'), ['--version'], {shell})).stdout.trim());
	show('runtimes: bun home.mjs', text(await run(bin('bun'), ['home.mjs'], {shell})));
	show('runtimes: bun home-callback.cjs', text(await run(bin('bun'), ['home-callback.cjs'], {shell})));
}

if (PM) {
	const shell = process.platform === 'win32';
	const managers = [
		['pnpm', ['corepack', ['pnpm', 'add', `${PACKAGE}@${VERSION}`]], ['node', ['home.mjs']]],
		['yarn', ['corepack', ['yarn', 'add', `${PACKAGE}@${VERSION}`]], ['corepack', ['yarn', '--silent', 'node', 'home.mjs']]],
		['yarn4', ['corepack', ['yarn', 'add', `${PACKAGE}@${VERSION}`]], ['corepack', ['yarn', 'node', 'home.mjs']]],
	];
	if (RT) {
		const bun = path.join(RT, 'node_modules', '.bin', process.platform === 'win32' ? 'bun.cmd' : 'bun');
		managers.push(['bun', [bun, ['add', `${PACKAGE}@${VERSION}`]], [bun, ['home.mjs']]]);
	}

	for (const [name, [installer, installArgs], [runner, runArgs]] of managers) {
		const dir = path.join(here, 'pm', name);
		mkdirSync(dir, {recursive: true});
		// yarn4: the packageManager field makes corepack run Yarn 4 (Plug'n'Play, so the example runs through yarn node).
		writeFileSync(path.join(dir, 'package.json'), JSON.stringify({name: `try-${name}`, private: true, type: 'module', ...(name === 'yarn4' ? {packageManager: 'yarn@4.18.1'} : {})}));
		if (name.startsWith('yarn')) {
			writeFileSync(path.join(dir, 'yarn.lock'), '');
		}

		copyFileSync('home.mjs', path.join(dir, 'home.mjs'));
		const installed = await run(installer, installArgs, {cwd: dir, shell, env: {COREPACK_ENABLE_DOWNLOAD_PROMPT: '0'}});
		const version = await run(installer, installer === 'corepack' ? [name.replace('4', ''), '--version'] : ['--version'], {cwd: dir, shell, env: {COREPACK_ENABLE_DOWNLOAD_PROMPT: '0'}});
		show(`package managers: ${name.replace('4', '')} ${version.stdout.trim()} install exit ${installed.code}, then the Home example`, text(await run(runner === 'node' ? process.execPath : runner, runArgs, {cwd: dir, shell: runner !== 'node' && shell, env: {COREPACK_ENABLE_DOWNLOAD_PROMPT: '0'}})));
	}
}

// ----- Getting started: TypeScript -----
mkdirSync('types/none', {recursive: true});
const typesCode = `import isAnImageUrl, {type IsAnImageUrlOptions} from 'is-an-image-url';

const options: IsAnImageUrlOptions = {timeout: 5000};
const answer: boolean = await isAnImageUrl('https://example.com/cat', options);

isAnImageUrl('https://example.com/cat', isImage => {
  const checked: boolean = isImage;
  console.log(checked, answer);
});
`;
writeFileSync('types/ok.mts', typesCode);
writeFileSync('types/plain.mts', `import isAnImageUrl from 'is-an-image-url';

export const answer: boolean = await isAnImageUrl('photo.png');
`);
writeFileSync('types/bad.mts', `import isAnImageUrl from 'is-an-image-url';

await isAnImageUrl('https://example.com/cat', {timeout: '5s'});
`);
writeFileSync('types/cjs.cts', `import isAnImageUrl = require('is-an-image-url');

isAnImageUrl('photo.png', isImage => console.log(isImage));
isAnImageUrl.default('photo.png').then(console.log);
`);
const tsc = path.join(here, 'node_modules', 'typescript', 'bin', 'tsc');
const tscArgs = ['--strict', '--noEmit', '--module', 'nodenext', '--moduleResolution', 'nodenext', '--target', 'es2022', '--types', 'node'];
show('typescript: tsc version', (await run(process.execPath, [tsc, '--version'])).stdout.trim());
show('typescript: ok.mts', text(await run(process.execPath, [tsc, ...tscArgs, 'types/ok.mts'])) || 'no errors');
show('typescript: bad.mts', text(await run(process.execPath, [tsc, ...tscArgs, 'types/bad.mts'])));
show('typescript: cjs.cts', text(await run(process.execPath, [tsc, ...tscArgs, 'types/cjs.cts'])) || 'no errors');
show('typescript: plain.mts without @types/node or the dom lib (lib es2022 only)', text(await run(process.execPath, [tsc, '--strict', '--noEmit', '--module', 'nodenext', '--target', 'es2022', '--lib', 'es2022', '--typeRoots', 'types/none', 'types/plain.mts'])).replace(/\n--- exit \d+$/, ''));
show('typescript: plain.mts with the dom lib instead', text(await run(process.execPath, [tsc, '--strict', '--noEmit', '--module', 'nodenext', '--target', 'es2022', '--lib', 'es2022,dom', '--typeRoots', 'types/none', 'types/plain.mts'])) || 'no errors');

// ----- API reference -----
show('api: the Promise form returns a Promise', isAnImageUrl('photo.png') instanceof Promise);
show('api: the callback form returns', util.inspect(isAnImageUrl('photo.png', () => {})));
await example('api: the callback always runs after the call returns', async () => {
	await new Promise(resolve => {
		isAnImageUrl('photo.png', isImage => {
			console.log('callback:', isImage);
			resolve();
		});
		console.log('returned');
	});
});
show('api: falsy urls', await Promise.all(['', null, undefined, 0, Number.NaN, false].map(async value => `${util.inspect(value)}: ${await isAnImageUrl(value)}`)).then(lines => lines.join('\n')));
show('api: errors', await Promise.all([
	['isAnImageUrl(123)', () => isAnImageUrl(123)],
	['isAnImageUrl(123, callback)', () => isAnImageUrl(123, () => {})],
	["isAnImageUrl(['cat.png'])", () => isAnImageUrl(['cat.png'])],
	["isAnImageUrl('cat.png', 'yes')", () => isAnImageUrl('cat.png', 'yes')],
	["isAnImageUrl('cat.png', {timeout: 0})", () => isAnImageUrl('cat.png', {timeout: 0})],
	["isAnImageUrl('cat.png', {timeout: '5000'})", () => isAnImageUrl('cat.png', {timeout: '5000'})],
	["isAnImageUrl('cat.png', {signal: {}})", () => isAnImageUrl('cat.png', {signal: {}})],
	["isAnImageUrl('cat.png', [])", () => isAnImageUrl('cat.png', [])],
	["isAnImageUrl('cat.png', null)", () => isAnImageUrl('cat.png', null)],
].map(async ([call, fn]) => `${call}: ${await outcome(fn)}`)).then(lines => lines.join('\n')));
show("api: the callback form's timeout argument", (await Promise.all([undefined, 0, -1, Number.POSITIVE_INFINITY, '300', 300].map(async value => {
	const started = Date.now();
	const answer = await Promise.race([
		new Promise(resolve => {
			isAnImageUrl(`${base}/never`, resolve, value);
		}),
		sleep(1500, 'still waiting after 1.5 s'),
	]);
	return `${util.inspect(value)}: ${typeof answer === 'boolean' ? `${answer} within 1.5 s` : answer}`;
}))).join('\n'));
show("api: the Promise form's timeout option", `${await isAnImageUrl(`${base}/slow?ms=1500`, {timeout: 300})} (slow server, timeout 300); ${await isAnImageUrl(`${base}/slow?ms=300`, {timeout: 2000})} (slow server, timeout 2000)`);
{
	const already = new AbortController();
	already.abort();
	const later = new AbortController();
	const pending = outcome(() => isAnImageUrl(`${base}/never`, {signal: later.signal}));
	await sleep(100);
	later.abort(new Error('user left the page'));
	show('api: signal', [
		`already aborted: ${await outcome(() => isAnImageUrl(`${base}/cat`, {signal: already.signal}))}`,
		`already aborted, file name: ${await outcome(() => isAnImageUrl('photo.png', {signal: already.signal}))}`,
		`aborted with a reason: ${await pending}`,
		`AbortSignal.timeout(200): ${await outcome(() => isAnImageUrl(`${base}/never`, {signal: AbortSignal.timeout(200)}))}`,
		`timeout: 200 instead: ${await outcome(() => isAnImageUrl(`${base}/never`, {timeout: 200}))}`,
	].join('\n'));
}

// ----- How the answer is decided -----
const decisions = [
	['photo.png', 'a file name with an image extension'],
	['notes.txt', 'a file name without one'],
	['C:/pictures/cat.gif', 'a path'],
	['example.com/cat.png', 'no scheme: not a URL to the pattern, so the extension decides'],
	['photo.avif', '.avif is not on the list'],
	['program.fs', '.fs is on the list'],
	['photo.heic', ''],
	[`${base}/missing.png`, 'an image extension in the path: no request'],
	[`${base}/missing.PNG?w=10`, 'the case of the extension and the query do not matter'],
	[`${base}/page?file=cat.png`, 'an extension only in the query string does not count'],
	[`${base}/page#cat.png`, 'nor in the fragment'],
	[`${base}/cat`, 'image/png'],
	[`${base}/logo.svg-as-page`, 'image/svg+xml; charset=utf-8'],
	[`${base}/shouting`, 'IMAGE/PNG'],
	[`${base}/about`, 'text/html'],
	[`${base}/octet`, 'PNG bytes as application/octet-stream'],
	[`${base}/untyped`, 'no Content-Type'],
	[`${base}/gone`, '404 served as image/png'],
	[`${base}/photo.avif`, '.avif URL: requested, image/avif'],
	[`${base}/moved`, '302 to /cat'],
	[`http://localhost:${port}/cat`, 'another host name'],
	[`${base}/elsewhere`, '302 to another host'],
	[`${base}/loop`, 'a redirect loop'],
	[`http://user:secret@127.0.0.1:${port}/cat`, 'a user name and password: never requested'],
	[`ftp://127.0.0.1:${port}/cat`, 'another scheme'],
	[`${closedBase}/cat`, 'nothing listening'],
	['//example.com/cat', 'protocol-relative: the pattern accepts it, the URL parser does not'],
	[`http://127.0.0.1:99999/cat`, 'a port above 65535'],
];
const rows = [];
for (const [url] of decisions) {
	// eslint-disable-next-line no-await-in-loop
	const {value, requests} = await requestsDuring(() => isAnImageUrl(url));
	rows.push(`${String(value).padEnd(6)}${display(requests).padEnd(28)}${display(url).replace(closedBase, 'http://127.0.0.1:1').replace(`127.0.0.1:${port}`, 'example.com').replace('localhost:' + port, 'localhost')}`);
}

show('how the answer is decided: answer, requests the server saw, url', rows.join('\n'));
{
	const {value} = await requestsDuring(() => isAnImageUrl(`${base}/cat`));
	const request = seen.at(-1);
	show('how the answer is decided: the request fetch sends', `${request.line} (answer ${value})\n${Object.entries(request.headers).filter(([k]) => k !== 'host').map(([k, v]) => `${k}: ${v}`).join('\n')}`);
}

bigOutcome = undefined;
show('how the answer is decided: an 8 MiB image', `answer ${await isAnImageUrl(`${base}/big`)}`);
for (let i = 0; i < 100 && !bigOutcome; i++) {
	// eslint-disable-next-line no-await-in-loop
	await sleep(20);
}

show('how the answer is decided: did the server finish sending the 8 MiB body?', bigOutcome ? `body finished: ${bigOutcome.bodyFinished}, all bytes written: ${bigOutcome.allBytesWritten}` : 'connection still open after 2 s');

// ----- Commands -----
const cliPath = path.join(pkgDir, pkg.bin[PACKAGE]);
const cli = (...args) => run(process.execPath, [cliPath, ...args]);
// A page's terminal transcript: what the command printed (stdout, then stderr), then the exit code.
const transcript = async (...args) => {
	const {code, stdout, stderr} = await cli(...args.map(value => live(value)));
	return display(`${stdout}${stderr}`.replace(/\n+$/, '')) + `\n${code}`;
};

show('commands: --help', display((await cli('--help')).stdout).replace(/\n+$/, ''));
show('commands: help exit code and stream', await cli('--help').then(r => `exit ${r.code}, stdout ${r.stdout.length} characters, stderr ${r.stderr.length}`));
show('commands: -h equals --help', (await cli('-h')).stdout === (await cli('--help')).stdout);
for (const args of [
	['--version'], ['-v'], ['cat.png'], ['notes.txt'], [`${DISPLAY}/cat`], [`${DISPLAY}/about`], [`${DISPLAY}/missing.png`],
	[`${DISPLAY}/slow?ms=1500`, '--timeout', '300'], [`${DISPLAY}/slow?ms=1500`, '--timeout=300'],
	[closedBase + '/cat'], [], ['cat.png', 'notes.txt'], [`${DISPLAY}/cat`, '--timeout', '0'], [`${DISPLAY}/cat`, '--timeout', 'soon'],
	['--timeout'], ['--foo', 'cat.png'], ['--', '--foo'],
]) {
	// eslint-disable-next-line no-await-in-loop
	show(`commands: is-an-image-url ${args.join(' ')}`.replace(closedBase, 'http://127.0.0.1:1'), (await transcript(...args)).replace(closedBase, 'http://127.0.0.1:1'));
}

show('commands: npx is-an-image-url cat.png (in this project)', text(await run('npx', ['is-an-image-url', 'cat.png'], {shell: process.platform === 'win32'})));
if (BASH && existsSync(BASH)) {
	writeFileSync('urls.txt', [`${base}/cat`, `${base}/about`, `${base}/missing.png`, 'notes.txt'].join('\n') + '\n');
	const loop = `while read -r url; do
  printf '%s %s\\n' "$(is-an-image-url "$url")" "$url"
done < urls.txt`;
	writeFileSync('loop.sh', loop + '\n');
	const binDir = path.join(here, 'node_modules', '.bin');
	show('recipes: a shell loop over a file of URLs', text(await run(BASH, ['loop.sh'], {env: {PATH: `${binDir}${path.delimiter}${process.env.PATH}`}})));
	show('recipes: the loop, as written', loop);
}

// ----- Recipes -----
await example('recipes: check a list', async () => {
	const urls = [`${base}/cat`, `${base}/about`, 'photo.png', `${base}/gone`];
	const answers = await Promise.all(urls.map(url => isAnImageUrl(url)));
	console.log(answers);
});
show('recipes: urls.map(isAnImageUrl) without the arrow', await outcome(() => Promise.all(['photo.png', 'notes.txt'].map(isAnImageUrl))));
await example('recipes: keep the images', async () => {
	const urls = [`${base}/cat`, `${base}/about`, 'photo.png', `${base}/gone`];
	const answers = await Promise.all(urls.map(url => isAnImageUrl(url)));
	const images = urls.filter((url, index) => answers[index]);
	console.log(images.length, 'of', urls.length);
});
await example('recipes: a few at a time', async () => {
	const urls = Array.from({length: 10}, (_, index) => `${base}/slow?ms=100&n=${index}`);
	const limit = 3;
	const answers = [];
	for (let start = 0; start < urls.length; start += limit) {
		const batch = urls.slice(start, start + limit);
		answers.push(...await Promise.all(batch.map(url => isAnImageUrl(url, {timeout: 5000}))));
	}

	console.log(answers.filter(Boolean).length, 'images');
});
await example('recipes: one deadline for a whole batch', async () => {
	const deadline = AbortSignal.timeout(500);
	const urls = [`${base}/cat`, `${base}/never`, `${base}/slow?ms=2000`];
	const results = await Promise.allSettled(urls.map(url => isAnImageUrl(url, {signal: deadline})));
	console.log(results.map(result => result.status === 'fulfilled' ? result.value : result.reason.name));
});
show('recipes: util.promisify(isAnImageUrl)', [
	`image: ${await outcome(() => util.promisify(isAnImageUrl)(`${base}/cat`))}`,
	`page: ${await outcome(() => util.promisify(isAnImageUrl)(`${base}/about`))}`,
].join('\n'));
await example('recipes: from the callback to the Promise form', async () => {
	// Before (1.x style)
	await new Promise(resolve => {
		isAnImageUrl(`${base}/cat`, isImage => {
			console.log(isImage);
			resolve();
		});
	});
	// After
	console.log(await isAnImageUrl(`${base}/cat`));
});

// A proxy, through Node's own environment support.
const proxyCode = "import isAnImageUrl from 'is-an-image-url';\n\nconsole.log(await isAnImageUrl('http://images.invalid/cat'));\n";
writeFileSync('proxy.mjs', proxyCode);
show('recipes: HTTP_PROXY without NODE_USE_ENV_PROXY (proxy requests seen after)', `${text(await run(process.execPath, ['proxy.mjs'], {env: {HTTP_PROXY: proxyAddress, NODE_USE_ENV_PROXY: ''}}))}; ${proxied.length} proxy requests`);
show('recipes: NODE_USE_ENV_PROXY=1 HTTP_PROXY=<proxy> node proxy.mjs', text(await run(process.execPath, ['proxy.mjs'], {env: {HTTP_PROXY: proxyAddress, NODE_USE_ENV_PROXY: '1'}})));
show('recipes: what the proxy received', proxied.splice(0).join('\n'));
show('recipes: node --use-env-proxy proxy.mjs', text(await run(process.execPath, ['--use-env-proxy', 'proxy.mjs'], {env: {HTTP_PROXY: proxyAddress}})));
show('recipes: what the proxy received (--use-env-proxy)', proxied.splice(0).join('\n'));

// ----- old versions -----
if (V103) {
	const cli103 = path.join(V103, 'node_modules', PACKAGE, 'cli.js');
	for (const args of [['cat.png'], ['notes.txt'], ['--help']]) {
		// eslint-disable-next-line no-await-in-loop
		const r = await run(process.execPath, [cli103, ...args]);
		show(`v1.0.3: cli ${args.join(' ')}`, `exit ${r.code}\n${r.stdout}${r.stderr.split('\n').filter(line => /Error/.test(line)).join('\n')}`.trimEnd());
	}
}

if (V104) {
	const old = createRequire(path.join(V104, 'index.js'))(PACKAGE);
	const cli104 = path.join(V104, 'node_modules', PACKAGE, 'cli.js');
	for (const args of [['cat.png'], ['--help'], ['--version']]) {
		// eslint-disable-next-line no-await-in-loop
		const r = await run(process.execPath, [cli104, ...args]);
		show(`v1.0.4: cli ${args.join(' ')}`, `exit ${r.code}\n${r.stdout}${r.stderr.split('\n').filter(line => /Error/.test(line)).join('\n')}`.trimEnd());
	}

	await example('v1.0.4: the callback answers', async () => {
		for (const url of ['photo.png', `${base}/cat`, `${base}/gone`, `${base}/untyped`, `${base}/shouting`]) {
			// eslint-disable-next-line no-await-in-loop
			await new Promise(resolve => {
				let returned = false;
				old(url, answer => {
					console.log(display(url).padEnd(34), util.inspect(answer).padEnd(10), returned ? 'after return' : 'before return');
					resolve();
				});
				returned = true;
			});
		}
	});
	show('v1.0.4: a Promise without a callback', await outcome(() => old('photo.png')));
}

// ----- the golden capture, replayed today (L-020) -----
if (GOLDEN && V104) {
	const files = ['capture-1.0.4.cjs', 'codec.cjs', 'fixture-server.cjs'];
	for (const file of files) {
		copyFileSync(path.join(GOLDEN, file), path.join(V104, file));
	}

	// 2.0.0 has its bin at dist/cli.mjs and no dependencies to name; nothing else changes.
	const script = readFileSync(path.join(GOLDEN, 'capture-1.0.4.cjs'), 'utf8')
		.replaceAll("'cli.js')", "'dist', 'cli.mjs')")
		.replace('const dependency = name => require(`${name}/package.json`).version;', 'const dependency = name => { try { return require(`${name}/package.json`).version; } catch { return \'none\'; } };');
	writeFileSync('capture-1.0.4-on-2.0.0.cjs', script);
	for (const file of files.slice(1)) {
		copyFileSync(path.join(GOLDEN, file), file);
	}

	// One after the other: the capture has timing cases (a 300 ms timeout against a slow response).
	const today104 = await run(process.execPath, ['capture-1.0.4.cjs'], {cwd: V104});
	const today200 = await run(process.execPath, ['capture-1.0.4-on-2.0.0.cjs']);
	const want = JSON.parse(readFileSync(path.join(GOLDEN, '1.0.4.json'), 'utf8'));
	const compare = (label, result) => {
		if (result.code !== 0) {
			show(label, `capture failed, exit ${result.code}\n${result.stderr.split('\n').slice(0, 5).join('\n')}`);
			return;
		}

		const got = JSON.parse(result.stdout);
		// The answer: what the call returned or threw and the arguments of each callback call. The timing: whether each
		// callback ran before the call returned. 2.0.0 always calls back after returning (CHANGELOG, Changed).
		const answer = entry => JSON.stringify({returned: entry.returned, threw: entry.threw?.$error, calls: entry.calls.map(c => c.args), uncaught: entry.uncaught?.map(u => u.$error)});
		const timing = entry => JSON.stringify(entry.calls.map(c => c.sync));
		const lines = (entry) => JSON.stringify((entry.requests ?? []).map(r => `${r.method} ${r.path}`));
		const whole = entry => JSON.stringify(entry);
		const byName = new Map(got.cases.map(entry => [entry.name, entry]));
		let same = 0;
		let sameAnswer = 0;
		let sameTiming = 0;
		let sameRequests = 0;
		const differing = [];
		const requestDiffs = [];
		for (const entry of want.cases) {
			const now = byName.get(entry.name);
			if (!now) {
				differing.push(`${entry.name}: missing`);
				continue;
			}

			same += whole(now) === whole(entry) ? 1 : 0;
			if (lines(now) === lines(entry)) {
				sameRequests++;
			} else {
				requestDiffs.push(`${entry.name}: 1.0.4.json ${lines(entry)}, now ${lines(now)}`);
			}

			sameTiming += timing(now) === timing(entry) ? 1 : 0;
			if (answer(now) === answer(entry)) {
				sameAnswer++;
			} else {
				const describe = e => (e.threw ? `throws ${e.threw.$error}` : e.calls.map(c => JSON.stringify(c.args)).join(' ') + (e.uncaught ? ` uncaught ${e.uncaught.map(u => u.$error)}` : '')) || 'no callback';
				differing.push(`${entry.name}: 1.0.4.json ${describe(entry)}, now ${describe(now)}`);
			}
		}

		const cliSame = want.cli.filter(entry => {
			const now = got.cli.find(c => c.name === entry.name);
			return now && now.status === entry.status && now.stdout === entry.stdout && now.stderrError === entry.stderrError;
		}).length;
		show(label, [
			`${want.cases.length} calls: ${sameAnswer} with the same answer (return value, throw, callback arguments), ${sameTiming} with the same timing (callback before or after the call returns), ${sameRequests} with the same request lines, ${same} identical in every recorded detail`,
			`${want.cli.length} CLI runs: ${cliSame} identical (exit code, stdout, the error line)`,
			'answers that differ:',
			...differing,
			'request lines that differ:',
			...requestDiffs,
		].join('\n'));
	};

	compare('golden: 1.0.4 installed today against test/golden/1.0.4.json', today104);
	compare('golden: 2.0.0 against test/golden/1.0.4.json (capture script with two lines patched)', today200);
}

server.close();
proxy.close();
