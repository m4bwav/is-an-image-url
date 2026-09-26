# Security policy

## Reporting a vulnerability

Report it privately through GitHub: open the repository's **Security** tab and choose **Report a vulnerability**. Please do not open a public issue for a security problem.

A confirmed problem is fixed in a new release, and the advisory is published once the fix is on npm.

## Supported versions

Only the latest major version (2.x) gets security fixes. 1.x depends on the deprecated `request` package and sends the credentials in a URL, leaking them on a redirect to another host; upgrade to 2.x.

## What this package is not

It requests the URL it is given, with one GET plus redirects, and reads only the response headers. It does not guard against server-side request forgery: internal addresses (`127.0.0.1`, private ranges, cloud metadata endpoints) are requested like any other, and redirects are followed to any host, so an allow-list checked on the URL passed in can be bypassed by a redirect. Don't pass URLs from users unless the network stops requests to internal addresses. It trusts the server's `Content-Type` and the file extension, and never inspects the bytes.
