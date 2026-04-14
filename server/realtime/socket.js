import { Server } from 'socket.io';

export function createSocketServer(httpServer, { corsOrigin = '*' } = {}) {
  return new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST', 'PATCH'],
    },
  });
}

export function registerSocketHandlers(io, { state, seatLockService, heatmapService }) {
  io.on('connection', (socket) => {
    if (state?.seats && state?.orders) {
      socket.emit('bootstrap', {
        seats: state.seats,
        heatmap: heatmapService.getSnapshot(),
        orders: state.orders,
      });
    }

    socket.on('seat:lock', async (payload) => {
      try {
        const result = await seatLockService.lockSeats(payload);
        io.emit('seat:lock', { ...payload, expiresAt: result.expiresAt });
      } catch (error) {
        socket.emit('seat:error', { message: error.message });
      }
    });

    socket.on('seat:release', async (payload) => {
      await seatLockService.releaseSeats(payload);
      io.emit('seat:release', payload);
    });

    socket.on('heatmap:record', ({ zoneId, delta }) => {
      const payload = heatmapService.recordFlow(zoneId, delta);
      io.emit('heatmap:update', payload);
    });
  });
}
