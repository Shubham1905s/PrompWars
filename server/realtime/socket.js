import { Server } from 'socket.io';
import express from 'express';
import cors from 'cors';
export function createSocketServer(httpServer, { corsOrigin = '*' } = {}) {
  // const origin =
  //   typeof corsOrigin === 'function'
  //     ? (incomingOrigin, callback) => {
  //         try {
  //           const allowed = Boolean(corsOrigin(incomingOrigin));
  //           callback(null, allowed);
  //         } catch (error) {
  //           callback(error, false);
  //         }
  //       }
  //     : corsOrigin;

  return new Server(httpServer, {
    cors: {
      corsOrigin,
      methods: ['GET', 'POST', 'PATCH'],
    },
  });
}
const app = express();
app.use(cors({
  origin: 'https://vercel.app',
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


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
