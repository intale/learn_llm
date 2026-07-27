import { createServer } from 'node:http';

function argument(name) {
  const indexes = process.argv
    .map((value, index) => (value === name ? index : -1))
    .filter((index) => index >= 0);
  if (indexes.length !== 1 || indexes[0] === process.argv.length - 1) {
    throw new Error(`${name} must be supplied exactly once with a value.`);
  }
  return process.argv[indexes[0] + 1];
}

const host = argument('--host');
const portText = argument('--port');
if (host !== '127.0.0.1') {
  throw new Error('The blocking proxy must bind exactly to 127.0.0.1.');
}
if (!/^[1-9][0-9]*$/.test(portText)) {
  throw new Error('The blocking proxy port must be a canonical positive integer.');
}
const port = Number(portText);
if (!Number.isSafeInteger(port) || port < 1024 || port > 65_535) {
  throw new Error('The blocking proxy port must be between 1024 and 65535.');
}

const rejectionBody = 'External requests are blocked during browser tests.\n';
const server = createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/ready') {
    response.writeHead(204, {
      'Cache-Control': 'no-store',
    });
    response.end();
    return;
  }

  response.writeHead(502, {
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(rejectionBody),
    'Content-Type': 'text/plain; charset=utf-8',
  });
  response.end(rejectionBody);
});

server.on('connect', (_request, socket) => {
  socket.end(
    'HTTP/1.1 502 Bad Gateway\r\n' +
      'Connection: close\r\n' +
      'Content-Length: 0\r\n' +
      '\r\n',
  );
});

server.on('clientError', (_error, socket) => {
  socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
});

server.listen(port, host);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
