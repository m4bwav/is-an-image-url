/*!
The URL test of is-url 1.2.4 (https://github.com/segmentio/is-url), inlined unchanged.
MIT License (the package's LICENSE-MIT, which names no copyright holder); the full notice is in LICENSE.
*/

// A URL must match the first pattern and then one of the other two. Two levels of patterns avoid catastrophic backtracking.
// No `u` flag, as in is-url: with it, `\S{2,}` would count an emoji as one character instead of two code units, and
// a URL whose host is `a.` followed by one emoji would stop looking like one. (The escaped `\:` of the original is written `:`, which means the same.)
/* eslint-disable require-unicode-regexp -- is-url's patterns, with its flags */
const protocolAndDomain = /^(?:\w+:)?\/\/(?<rest>\S+)$/;
const localhostDomain = /^localhost[\d:?]*(?:[^\d:?]\S*)?$/;
const nonLocalhostDomain = /^[^\s.]+\.\S{2,}$/;
/* eslint-enable require-unicode-regexp */

/**
Loosely checks whether a string looks like a URL, as is-url 1.2.4 does. It accepts protocol-relative strings (`//host/path`)
and any scheme, and refuses hosts without a dot other than localhost, IPv6 literals among them.
*/
export function isUrlLike(value: string): boolean {
  const everythingAfterProtocol = protocolAndDomain.exec(value)?.groups?.rest;
  return everythingAfterProtocol !== undefined && (localhostDomain.test(everythingAfterProtocol) || nonLocalhostDomain.test(everythingAfterProtocol));
}
