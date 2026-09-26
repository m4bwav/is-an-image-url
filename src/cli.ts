#!/usr/bin/env node
import {createRequire} from 'node:module';
import process from 'node:process';
import {parseArgs} from 'node:util';
import {isAnImageUrl} from './is-an-image-url.js';

const HELP = `
  Check whether a URL points to an image.

  Usage
    $ is-an-image-url <url> [--timeout <ms>]

  Prints true or false. A file name or a URL whose path ends in an image
  extension is answered without a request; any other URL is requested and
  answered from the Content-Type of the response.

  Options
    --timeout <ms>  Give up after this many milliseconds (default 20000)
    --help, -h      Show this help
    --version, -v   Show the version

  Exit codes
    0  true or false was printed
    2  bad usage

  Example
    $ is-an-image-url "https://avatars.githubusercontent.com/u/9919?v=4"
    true
`;

async function main(argv: string[]): Promise<number> {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        timeout: {type: 'string'},
        help: {type: 'boolean', short: 'h'},
        version: {type: 'boolean', short: 'v'},
      },
    });
  } catch (error) {
    return usageError((error as Error).message);
  }

  const {values, positionals} = parsed;
  if (values.help) {
    console.log(HELP);
    return 0;
  }

  if (values.version) {
    // A relative require inside the package reaches package.json without going through the exports map.
    const {version} = createRequire(import.meta.url)('../package.json') as {version: string};
    console.log(version);
    return 0;
  }

  const [url] = positionals;
  if (url === undefined || positionals.length > 1) {
    return usageError(url === undefined ? 'a URL is required' : 'give one URL at a time');
  }

  let timeout: number | undefined;
  if (values.timeout !== undefined) {
    timeout = Number(values.timeout);
    if (!Number.isFinite(timeout) || timeout <= 0) {
      return usageError(`--timeout takes a positive number of milliseconds, not ${JSON.stringify(values.timeout)}`);
    }
  }

  // As 1.0.3 did: print the answer, and exit 0 either way (plan D6).
  console.log(await isAnImageUrl(url, {timeout}));
  return 0;
}

function usageError(message: string): number {
  console.error(`error: ${message}\n${HELP}`);
  return 2;
}

process.exitCode = await main(process.argv.slice(2));
