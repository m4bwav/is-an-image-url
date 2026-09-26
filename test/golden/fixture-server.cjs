'use strict';
// A local HTTP server with one route per behaviour the golden capture records, so no recorded case touches the internet.
// It logs every request it receives (method, path, HTTP version, raw headers in the order and case the client sent them),
// with the port replaced by {{port}} so the log is the same on every run. The golden test of the new major starts this same
// server and substitutes {{base}} in the case arguments.

const http = require('node:http');

// The smallest valid PNG (1x1, transparent): 67 bytes.
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082', 'hex');
const HTML = '<!doctype html><html><head><title>Not an image</title></head><body>hello</body></html>';
const BIG_SIZE = 8 * 1024 * 1024;

function start() {
  const requests = [];
  const sockets = new Set();
  const outcomes = {};
  let port = 0;

  const normalise = value => value.split(String(port)).join('{{port}}');

  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://fixture');
    const entry = {
      method: request.method,
      path: request.url,
      httpVersion: request.httpVersion,
      rawHeaders: request.rawHeaders.map(value => normalise(value)),
    };
    requests.push(entry);
    const send = (status, headers, body) => {
      response.writeHead(status, headers);
      response.end(body);
    };

    switch (url.pathname) {
      case '/image': {
        send(200, {'content-type': 'image/png', 'content-length': PNG.length}, PNG);
        break;
      }

      case '/image-jpeg': {
        send(200, {'content-type': 'image/jpeg'}, PNG);
        break;
      }

      case '/image-svg-with-charset': {
        send(200, {'content-type': 'image/svg+xml; charset=utf-8'}, '<svg xmlns="http://www.w3.org/2000/svg"/>');
        break;
      }

      case '/image-uppercase-type': {
        send(200, {'content-type': 'IMAGE/PNG'}, PNG);
        break;
      }

      case '/image-bytes-as-octet-stream': {
        send(200, {'content-type': 'application/octet-stream'}, PNG);
        break;
      }

      case '/html': {
        send(200, {'content-type': 'text/html; charset=utf-8'}, HTML);
        break;
      }

      case '/no-content-type': {
        // Node adds no Content-Type unless told to.
        send(200, {}, PNG);
        break;
      }

      case '/empty-content-type': {
        send(200, {'content-type': ''}, PNG);
        break;
      }

      case '/not-found-html': {
        send(404, {'content-type': 'text/html'}, 'Not found');
        break;
      }

      case '/not-found-image': {
        send(404, {'content-type': 'image/png'}, PNG);
        break;
      }

      case '/server-error-image': {
        send(500, {'content-type': 'image/png'}, PNG);
        break;
      }

      case '/no-content-image': {
        send(204, {'content-type': 'image/png'});
        break;
      }

      case '/redirect-to-image': {
        send(302, {location: '/image'});
        break;
      }

      case '/redirect-301-to-image': {
        send(301, {location: '/image'});
        break;
      }

      case '/redirect-to-html': {
        send(302, {location: '/html'});
        break;
      }

      case '/redirect-to-other-host-image': {
        // 127.0.0.1 and localhost are different hosts to an HTTP client.
        send(302, {location: `http://localhost:${port}/image`});
        break;
      }

      case '/redirect-loop': {
        const hop = Number(url.searchParams.get('hop') || '0');
        send(302, {location: `/redirect-loop?hop=${hop + 1}`});
        break;
      }

      case '/redirect-without-location': {
        send(302, {'content-type': 'image/png'}, PNG);
        break;
      }

      case '/redirect-to-file-protocol': {
        send(302, {location: 'file:///etc/passwd'});
        break;
      }

      case '/slow-image': {
        const delay = Number(url.searchParams.get('ms') || '1000');
        setTimeout(() => send(200, {'content-type': 'image/png'}, PNG), delay);
        break;
      }

      case '/never-responds': {
        // Holds the connection open until the client gives up or the server closes.
        break;
      }

      case '/headers-then-stall': {
        // Sends the image headers at once, then never finishes the body.
        response.writeHead(200, {'content-type': 'image/png'});
        response.write(PNG.subarray(0, 8));
        break;
      }

      case '/big-image': {
        // 8 MiB with an image type: records whether the client reads the whole body before answering.
        response.writeHead(200, {'content-type': 'image/png', 'content-length': BIG_SIZE});
        const chunk = Buffer.alloc(64 * 1024, 0);
        let written = 0;
        const pump = () => {
          while (written < BIG_SIZE) {
            written += chunk.length;
            if (!response.write(chunk)) {
              response.once('drain', pump);
              return;
            }
          }

          response.end();
        };

        response.on('close', () => {
          outcomes.bigImage = {bytesWritten: written, finished: response.writableFinished};
        });
        pump();
        break;
      }

      case '/echo-auth': {
        send(200, {'content-type': 'text/plain'}, 'ok');
        break;
      }

      case '/auth-redirect-to-other-host': {
        send(302, {location: `http://localhost:${port}/echo-auth`});
        break;
      }

      default: {
        send(404, {'content-type': 'text/plain'}, 'no such fixture route');
      }
    }
  });

  server.on('connection', socket => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });

  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => {
      port = server.address().port;
      // A port that was bound and released: nothing listens there, so a connection is refused.
      const probe = http.createServer();
      probe.listen(0, '127.0.0.1', () => {
        const closedPort = probe.address().port;
        probe.close(() => {
          resolve({
            port,
            closedPort,
            base: `http://127.0.0.1:${port}`,
            requests,
            outcomes,
            normalise,
            dropConnections() {
              for (const socket of sockets) {
                socket.destroy();
              }
            },
            close: () => new Promise(done => {
              for (const socket of sockets) {
                socket.destroy();
              }

              server.close(() => done());
            }),
          });
        });
      });
    });
  });
}

module.exports = {start, PNG, HTML, BIG_SIZE};
