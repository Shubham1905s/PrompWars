import { io as client } from 'socket.io-client';
import { afterEach, describe, expect, it } from 'vitest';
import { createPlatformServer } from '../app.js';

describe('websocket integration', () => {
  let cleanup = async () => undefined;

  afterEach(async () => {
    await cleanup();
  });

  it('broadcasts heatmap:update events to connected clients', async () => {
    const platform = await createPlatformServer({ disableIntervals: true });
    cleanup = platform.cleanup;
    await new Promise((resolve) => platform.httpServer.listen(0, resolve));
    const { port } = platform.httpServer.address();

    await new Promise((resolve, reject) => {
      const socket = client(`http://127.0.0.1:${port}`, {
        reconnection: false,
        timeout: 5000,
      });

      socket.on('connect', () => {
        socket.on('heatmap:update', (payload) => {
          try {
            expect(Array.isArray(payload)).toBe(true);
            expect(payload[0]).toHaveProperty('id');
            socket.close();
            resolve();
          } catch (error) {
            reject(error);
          }
        });

        socket.emit('heatmap:record', { zoneId: 'gate-east', delta: 10 });
      });

      socket.on('connect_error', reject);
    });
  });
});
