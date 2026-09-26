import {hasImageExtension} from './image-extensions.js';
import {isUrlLike} from './url-pattern.js';

/**
Called once, asynchronously, with `true` when the URL points to an image and `false` otherwise.
*/
export type IsAnImageUrlCallback = (isAnImage: boolean) => void;

export type IsAnImageUrlOptions = {
  /**
  Milliseconds to wait for the response headers, redirects included, before answering `false`. Default 20000.
  */
  timeout?: number;
  /**
  Cancels the check: the Promise rejects with the signal's reason.
  */
  signal?: AbortSignal;
};

const DEFAULT_TIMEOUT = 20_000;

const typeName = (value: unknown): string => {
  if (value === null) {
    return 'null';
  }

  return Array.isArray(value) ? 'array' : typeof value;
};

const isPositiveNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;

// 1.0.4 answered every falsy url with false, and threw for other non-strings; the message names the type, never the value.
function toUrl(url: unknown): string | undefined {
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions -- every falsy value (0n and NaN included) answers false, as 1.0.4's `!url` did
  if (!url) {
    return undefined;
  }

  if (typeof url !== 'string') {
    throw new TypeError(`Expected \`url\` to be a string, got ${typeName(url)}`);
  }

  return url;
}

function isAbortSignal(value: unknown): value is AbortSignal {
  return typeof value === 'object' && value !== null && typeof (value as AbortSignal).aborted === 'boolean' && typeof (value as AbortSignal).addEventListener === 'function';
}

// One GET, redirects followed; the answer comes from the final response's status and headers, and the body is cancelled.
async function isImageResponse(url: string, timeout: number, signal: AbortSignal | undefined): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeout);
  const onAbort = () => {
    controller.abort(signal?.reason);
  };

  signal?.addEventListener('abort', onAbort, {once: true});
  try {
    const response = await fetch(url, {signal: controller.signal});
    // Unread, the body would keep the connection busy until it arrived in full (1.0.4 downloaded all of it).
    response.body?.cancel().catch(() => undefined);
    const contentType = response.headers.get('content-type') ?? '';
    return response.ok && contentType.toLowerCase().startsWith('image/');
  } catch {
    if (signal?.aborted) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- an aborted signal rejects with its reason, whatever it is, as fetch does
      throw signal.reason;
    }

    // A network error, a timeout, a redirect loop or a redirect to another scheme: not an image, as in 1.0.4.
    return false;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

async function isImageAt(url: string | undefined, timeout: number, signal?: AbortSignal): Promise<boolean> {
  if (url === undefined) {
    return false;
  }

  // Not a URL (a file name, a path, a URL without a scheme): the extension decides.
  if (!isUrlLike(url)) {
    return hasImageExtension(url);
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // The is-url pattern accepts some strings the URL parser refuses, such as `//host/path` and invalid ports.
    return false;
  }

  // An image extension wins over the network, for any scheme, as in 1.0.4.
  if (hasImageExtension(parsed.pathname)) {
    return true;
  }

  // Only http and https are requested. 1.0.4 sent the credentials in a URL, and leaked them in the Referer header on a redirect
  // to another host; fetch refuses such URLs, and they are answered without a request.
  const isRequestable = (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.username === '' && parsed.password === '';
  return isRequestable && isImageResponse(parsed.href, timeout, signal);
}

async function isImageWithOptions(value: unknown, options: unknown): Promise<boolean> {
  if (options !== undefined && options !== null && (typeof options !== 'object' || Array.isArray(options))) {
    throw new TypeError(`Expected \`options\` to be an object, got ${typeName(options)}`);
  }

  const {timeout, signal} = (options ?? {}) as IsAnImageUrlOptions;
  if (timeout !== undefined && !isPositiveNumber(timeout)) {
    throw new TypeError(`Expected \`options.timeout\` to be a positive number of milliseconds, got ${typeName(timeout)}`);
  }

  if (signal !== undefined && !isAbortSignal(signal)) {
    throw new TypeError(`Expected \`options.signal\` to be an AbortSignal, got ${typeName(signal)}`);
  }

  const url = toUrl(value);
  signal?.throwIfAborted();
  return isImageAt(url, timeout ?? DEFAULT_TIMEOUT, signal);
}

/**
Checks whether `url` points to an image.

A string that is not a URL, or a URL whose path ends in an image file extension, is answered from the extension alone, with no
request. Any other `http:` or `https:` URL is requested with GET: the answer is `true` when the final response, after
redirects, has a 2xx status and a `Content-Type` starting with `image/`, compared without regard to case. The body is not
downloaded. Network failures, timeouts, other schemes and URLs with a user name or password answer `false`.

@param url - The URL, file name or path to check. `''`, `null` and `undefined` answer `false`.
@param callback - Called once, always asynchronously, with `true` or `false`.
@param timeout - Milliseconds to wait for the response headers. Anything but a positive number means the default, 20000.
@throws {TypeError} When `url` is not a string (and not empty), or `callback` is not a function.

@example
```
isAnImageUrl('https://example.com/cat', isImage => {
  console.log(isImage);
});
```
*/
/* eslint-disable @typescript-eslint/no-restricted-types, unicorn/consistent-boolean-name -- 1.0.4 took null as a url (it answers false); the public name is 2017's, and its answer is a boolean, delivered asynchronously */
export function isAnImageUrl(url: string | null | undefined, callback: IsAnImageUrlCallback, timeout?: number): void;
/**
Checks whether `url` points to an image, and returns a Promise of `true` or `false`.

A string that is not a URL, or a URL whose path ends in an image file extension, is answered from the extension alone, with no
request. Any other `http:` or `https:` URL is requested with GET: the answer is `true` when the final response, after
redirects, has a 2xx status and a `Content-Type` starting with `image/`, compared without regard to case. The body is not
downloaded. Network failures, timeouts, other schemes and URLs with a user name or password answer `false`.

The Promise rejects only for an argument of the wrong type (a TypeError) or an aborted `signal` (with its reason).

@param url - The URL, file name or path to check. `''`, `null` and `undefined` answer `false`.

@example
```
if (await isAnImageUrl('https://example.com/cat', {timeout: 5000})) {
  console.log('an image');
}
```
*/
export function isAnImageUrl(url: string | null | undefined, options?: IsAnImageUrlOptions): Promise<boolean>;
export function isAnImageUrl(url: unknown, callbackOrOptions?: unknown, timeout?: unknown): void | Promise<boolean> {
/* eslint-enable @typescript-eslint/no-restricted-types, unicorn/consistent-boolean-name */
  if (typeof callbackOrOptions !== 'function') {
    if (callbackOrOptions !== undefined && callbackOrOptions !== null && typeof callbackOrOptions !== 'object') {
      throw new TypeError(`Expected \`callback\` to be a function (or an options object), got ${typeName(callbackOrOptions)}`);
    }

    return isImageWithOptions(url, callbackOrOptions);
  }

  const text = toUrl(url);
  const callback = callbackOrOptions as IsAnImageUrlCallback;
  // Without a signal, isImageAt() never rejects. The callback runs in its own microtask, so an error it throws is an uncaught
  // exception, as in 1.0.4, rather than a rejected Promise nobody handles.
  void isImageAt(text, isPositiveNumber(timeout) ? timeout : DEFAULT_TIMEOUT).then(isAnImage => {
    queueMicrotask(() => {
      callback(isAnImage);
    });
  });
}
