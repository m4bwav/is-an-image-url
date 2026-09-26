'use strict';
// Probe: how Node's built-in fetch behaves on the fixture routes that matter to the v2 plan (not part of the golden file).
const fixtures = require('./fixture-server.cjs');

async function probe(server, name, url, init = {}) {
  const before = server.requests.length;
  try {
    const response = await fetch(url, {signal: AbortSignal.timeout(3000), ...init});
    const type = response.headers.get('content-type');
    await response.body?.cancel();
    return {name, status: response.status, type, redirected: response.redirected, requests: server.requests.slice(before).map(r => r.path)};
  } catch (error) {
    return {name, error: `${error.name}: ${error.message}`, cause: error.cause?.message, requests: server.requests.slice(before).length};
  }
}

(async () => {
  const server = await fixtures.start();
  const b = server.base;
  const out = [];
  out.push(await probe(server, 'image headers sent', `${b}/image`));
  out.push(server.requests.at(-1).rawHeaders);
  out.push(await probe(server, 'credentials in URL', `http://user:secret@127.0.0.1:${server.port}/echo-auth`));
  out.push(await probe(server, '302 without Location', `${b}/redirect-without-location`));
  out.push(await probe(server, 'redirect loop', `${b}/redirect-loop`));
  out.push(await probe(server, 'redirect to file:', `${b}/redirect-to-file-protocol`));
  out.push(await probe(server, 'headers then stall (cancel body)', `${b}/headers-then-stall`));
  out.push(await probe(server, 'big image (cancel body)', `${b}/big-image`));
  out.push(await probe(server, 'ftp', `ftp://127.0.0.1:${server.port}/image`));
  out.push(await probe(server, 'HEAD image', `${b}/image`, {method: 'HEAD'}));
  await new Promise(r => setTimeout(r, 300));
  out.push({bigImage: server.outcomes.bigImage});
  await server.close();
  console.log(JSON.stringify(out, null, 1));
})();
