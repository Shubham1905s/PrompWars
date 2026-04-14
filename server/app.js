import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import jwt from 'jsonwebtoken';
import morgan from 'morgan';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { createClient } from 'redis';
import { createSeedState } from './data/seedData.js';
import { createSeatLockService } from './services/seatLockService.js';
import { createHeatmapService } from './services/heatmapService.js';
import { createSocketServer, registerSocketHandlers } from './realtime/socket.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET ?? 'venueflow-dev-secret';
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

function pickUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function auth(requiredRoles = []) {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing authorization token' });
    }

    try {
      const payload = jwt.verify(header.slice(7), JWT_SECRET);
      req.user = payload;
      if (requiredRoles.length && !requiredRoles.includes(payload.role)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Invalid token', detail: error.message });
    }
  };
}

function createNotification(state, userId, message, type = 'info') {
  const notification = {
    id: randomUUID(),
    userId,
    message,
    type,
    createdAt: new Date().toISOString(),
  };
  state.notifications.push(notification);
  return notification;
}

function getLatestBooking(state, userId) {
  return [...state.bookings]
    .filter((booking) => booking.userId === userId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0] ?? null;
}

function createGuidance(heatmapService, seat) {
  const bestGate = heatmapService.getBestArrival();
  return {
    recommendedGate: bestGate?.gate ?? seat?.gate ?? 'Gate A',
    recommendedParking: bestGate?.parkingZone ?? seat?.parkingZone ?? 'P1',
    message: `Use ${bestGate?.gate ?? seat?.gate ?? 'Gate A'} and park in ${bestGate?.parkingZone ?? seat?.parkingZone ?? 'P1'} for the fastest arrival.`,
  };
}

function attachParkingNotifications(state, io) {
  const timer = setInterval(() => {
    const now = Date.now();
    const eventEnd = Date.parse(state.currentEvent.endsAt);
    const minutesLeft = Math.floor((eventEnd - now) / 60000);
    if (minutesLeft <= 15 && minutesLeft >= 0) {
      state.bookings.forEach((booking) => {
        const notice = createNotification(
          state,
          booking.userId,
          `Event ends in ${minutesLeft} min. Parking guidance ready for ${booking.parkingZone}.`,
          'parking',
        );
        io.emit('notification:parking', notice);
      });
    }
  }, 60000);
  return () => clearInterval(timer);
}

export async function createPlatformServer({ disableIntervals = false } = {}) {
  const state = createSeedState();
  const app = express();
  const httpServer = http.createServer(app);
  const io = createSocketServer(httpServer, { corsOrigin: CLIENT_ORIGIN });

  let redisClient = null;
  if (process.env.REDIS_URL) {
    redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on('error', () => undefined);
    await redisClient.connect().catch(() => {
      redisClient = null;
    });
  }

  const seatLockService = createSeatLockService({ redisClient, ttlSeconds: 600 });
  const heatmapService = createHeatmapService({ state, io });

  app.use(cors({ origin: CLIENT_ORIGIN }));
  app.use(express.json());
  app.use(morgan('dev'));

  registerSocketHandlers(io, { state, seatLockService, heatmapService });

  const cleanupFns = [];
  if (!disableIntervals) {
    cleanupFns.push(heatmapService.startBroadcasting());
    cleanupFns.push(attachParkingNotifications(state, io));
  }

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, services: ['auth', 'booking', 'order', 'payment', 'admin', 'notifications'] });
  });

  app.post('/api/auth/register', async (req, res) => {
    const { email, name, password, role = 'user' } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'name, email and password are required' });
    }
    if (state.demoUsers.some((user) => user.email === email)) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    const user = {
      id: randomUUID(),
      email,
      name,
      role: ['user', 'vendor', 'admin', 'delivery'].includes(role) ? role : 'user',
      password: await bcrypt.hash(password, 10),
    };
    state.demoUsers.push(user);
    const token = jwt.sign(pickUser(user), JWT_SECRET, { expiresIn: '12h' });
    return res.status(201).json({ token, user: pickUser(user) });
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = state.demoUsers.find((item) => item.email === email);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign(pickUser(user), JWT_SECRET, { expiresIn: '12h' });
    return res.json({ token, user: pickUser(user) });
  });

  app.get('/api/auth/me', auth(), (req, res) => {
    const user = state.demoUsers.find((item) => item.id === req.user.id);
    return res.json({ user: user ? pickUser(user) : null });
  });

  app.get('/api/bootstrap', auth(), (req, res) => {
    const latestBooking = getLatestBooking(state, req.user.id);
    const parkingNotice = state.notifications.filter((item) => item.userId === req.user.id).slice(-5);
    return res.json({
      event: state.currentEvent,
      seats: state.seats,
      menu: state.menu,
      zones: heatmapService.getSnapshot(),
      bookings: state.bookings.filter((booking) => booking.userId === req.user.id),
      orders: state.orders.filter((order) => order.userId === req.user.id),
      notifications: parkingNotice,
      guidance: createGuidance(heatmapService, latestBooking ? state.seats.find((seat) => seat.id === latestBooking.seatIds[0]) : null),
    });
  });

  app.post('/api/bookings/lock', auth(), async (req, res) => {
    const { eventId = state.currentEvent.id, seatIds = [] } = req.body;
    if (!seatIds.length) return res.status(400).json({ message: 'seatIds are required' });

    const seats = state.seats.filter((seat) => seatIds.includes(seat.id));
    if (seats.some((seat) => seat.status === 'booked')) {
      return res.status(409).json({ message: 'One or more seats are already booked' });
    }

    try {
      const lock = await seatLockService.lockSeats({ eventId, seatIds, userId: req.user.id });
      const hold = {
        id: randomUUID(),
        eventId,
        seatIds,
        userId: req.user.id,
        expiresAt: new Date(lock.expiresAt).toISOString(),
        createdAt: new Date().toISOString(),
      };
      state.holds = state.holds.filter((item) => item.userId !== req.user.id);
      state.holds.push(hold);
      state.seats = state.seats.map((seat) =>
        seatIds.includes(seat.id) ? { ...seat, status: 'locked', lockedBy: req.user.id, holdExpiresAt: hold.expiresAt } : seat,
      );
      const guidance = createGuidance(heatmapService, seats[0]);
      io.emit('seat:lock', { seatIds, userId: req.user.id, expiresAt: hold.expiresAt });
      return res.json({ hold, guidance });
    } catch (error) {
      return res.status(409).json({ message: error.message });
    }
  });

  app.post('/api/bookings/release', auth(), async (req, res) => {
    const { holdId } = req.body;
    const hold = state.holds.find((item) => item.id === holdId && item.userId === req.user.id);
    if (!hold) return res.status(404).json({ message: 'Hold not found' });
    await seatLockService.releaseSeats({ eventId: hold.eventId, seatIds: hold.seatIds, userId: req.user.id });
    state.holds = state.holds.filter((item) => item.id !== holdId);
    state.seats = state.seats.map((seat) =>
      hold.seatIds.includes(seat.id) && seat.status === 'locked' ? { ...seat, status: 'available', lockedBy: null, holdExpiresAt: null } : seat,
    );
    io.emit('seat:release', { seatIds: hold.seatIds, userId: req.user.id });
    return res.json({ released: true });
  });

  app.post('/api/payments/checkout', auth(), async (req, res) => {
    const { holdId } = req.body;
    const hold = state.holds.find((item) => item.id === holdId && item.userId === req.user.id);
    if (!hold) return res.status(404).json({ message: 'Seat hold not found' });

    const heldSeats = state.seats.filter((seat) => hold.seatIds.includes(seat.id));
    const booking = {
      id: randomUUID(),
      holdId,
      eventId: hold.eventId,
      seatIds: hold.seatIds,
      userId: req.user.id,
      gate: heldSeats[0]?.gate ?? 'Gate A',
      parkingZone: heldSeats[0]?.parkingZone ?? 'P1',
      status: 'confirmed',
      amount: heldSeats.reduce((sum, seat) => sum + seat.price, 0),
      createdAt: new Date().toISOString(),
    };

    state.bookings.push(booking);
    state.holds = state.holds.filter((item) => item.id !== holdId);
    state.seats = state.seats.map((seat) =>
      hold.seatIds.includes(seat.id) ? { ...seat, status: 'booked', lockedBy: null, holdExpiresAt: null } : seat,
    );
    await seatLockService.releaseSeats({ eventId: hold.eventId, seatIds: hold.seatIds, userId: req.user.id });
    io.emit('seat:confirmed', { seatIds: hold.seatIds, bookingId: booking.id, userId: req.user.id });
    createNotification(state, req.user.id, `Booking ${booking.id.slice(0, 8)} confirmed. Gate ${booking.gate}.`, 'success');
    return res.json({ booking, guidance: createGuidance(heatmapService, heldSeats[0]) });
  });

  app.get('/api/bookings/me', auth(), (req, res) => {
    res.json({ bookings: state.bookings.filter((item) => item.userId === req.user.id) });
  });

  app.get('/api/orders/menu', auth(), (_req, res) => {
    res.json({ menu: state.menu });
  });

  app.post('/api/orders', auth(), (req, res) => {
    const { bookingId, items = [] } = req.body;
    const booking = state.bookings.find((item) => item.id === bookingId && item.userId === req.user.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    const order = {
      id: randomUUID(),
      bookingId,
      userId: req.user.id,
      seatId: booking.seatIds[0],
      items,
      total: items.reduce((sum, item) => {
        const menuItem = state.menu.find((entry) => entry.id === item.itemId);
        return sum + (menuItem?.price ?? 0) * item.quantity;
      }, 0),
      status: 'placed',
      createdAt: new Date().toISOString(),
    };
    state.orders.push(order);
    io.emit('order:status-update', { orderId: order.id, status: order.status });
    return res.status(201).json({ order });
  });

  app.get('/api/orders/me', auth(), (req, res) => {
    res.json({ orders: state.orders.filter((item) => item.userId === req.user.id) });
  });

  app.get('/api/vendor/orders', auth(['vendor', 'admin']), (_req, res) => {
    res.json({ orders: state.orders });
  });

  app.patch('/api/vendor/orders/:orderId/status', auth(['vendor', 'admin']), (req, res) => {
    const order = state.orders.find((item) => item.id === req.params.orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    order.status = req.body.status;
    io.emit('order:status-update', { orderId: order.id, status: order.status });
    createNotification(state, order.userId, `Order ${order.id.slice(0, 8)} is now ${order.status}.`, 'order');
    return res.json({ order });
  });

  app.get('/api/admin/dashboard', auth(['admin']), (_req, res) => {
    const occupancy = state.seats.filter((seat) => seat.status === 'booked').length;
    res.json({
      occupancy,
      totalSeats: state.seats.length,
      holds: state.holds,
      bookings: state.bookings,
      orders: state.orders,
      zones: heatmapService.getSnapshot(),
      mapper: state.zones.map((zone) => ({
        id: zone.id,
        name: zone.name,
        gate: zone.gate,
        parkingZone: zone.parkingZone,
        type: zone.type,
      })),
    });
  });

  app.patch('/api/admin/zones/:zoneId', auth(['admin']), (req, res) => {
    const zone = state.zones.find((item) => item.id === req.params.zoneId);
    if (!zone) return res.status(404).json({ message: 'Zone not found' });
    zone.gate = req.body.gate ?? zone.gate;
    zone.parkingZone = req.body.parkingZone ?? zone.parkingZone;
    zone.name = req.body.name ?? zone.name;
    const payload = heatmapService.getSnapshot();
    io.emit('heatmap:update', payload);
    return res.json({ zone, zones: payload });
  });

  app.post('/api/admin/heatmap-event', auth(['admin']), (req, res) => {
    const { zoneId, delta = 0 } = req.body;
    try {
      const zones = heatmapService.recordFlow(zoneId, Number(delta));
      return res.json({ zones });
    } catch (error) {
      return res.status(404).json({ message: error.message });
    }
  });

  return {
    app,
    cleanup: async () => {
      cleanupFns.forEach((fn) => fn());
      io.close();
      httpServer.close();
      if (redisClient?.isOpen) {
        await redisClient.quit();
      }
    },
    httpServer,
    io,
    state,
  };
}
