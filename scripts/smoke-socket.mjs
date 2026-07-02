#!/usr/bin/env node

const args = new Set(process.argv.slice(2));

if (args.has('--help') || args.has('-h')) {
  process.stdout.write(`Usage:
  node scripts/smoke-socket.mjs

Environment variables:
  SMOKE_SOCKET_URL      Socket.IO polling URL. Default: http://127.0.0.1:3001/socket.io/?EIO=4&transport=polling
  SMOKE_TIMEOUT_MS      Request timeout in ms. Default: 10000

Behavior:
  - Performs a Socket.IO polling handshake request
  - Expects HTTP 200
  - Expects the response payload to contain a session id ("sid")
`);
  process.exit(0);
}

const socketUrl =
  process.env.SMOKE_SOCKET_URL ||
  'http://127.0.0.1:3001/socket.io/?EIO=4&transport=polling';
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS || '10000');

const run = async () => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(socketUrl, {
      method: 'GET',
      headers: {
        accept: '*/*',
      },
      signal: controller.signal,
    });

    const text = await response.text();

    if (response.status !== 200) {
      throw new Error(`expected 200, got ${response.status}`);
    }

    if (!text.includes('"sid"')) {
      throw new Error('Socket.IO handshake did not return a sid');
    }

    process.stdout.write(
      ['Smoke socket checks passed.', `socketUrl=${socketUrl}`].join('\n') + '\n'
    );
  } finally {
    clearTimeout(timeout);
  }
};

run().catch((error) => {
  process.stderr.write(
    `Smoke socket failed: ${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exit(1);
});
