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
import { sendBookingEmail } from './services/emailService.js';
import { connectMongo } from './db/connect.js';
import { ensureSeeded } from './db/seed.js';
import { Booking, Event, Hold, MenuItem, Notification, Order, Seat, User, Zone } from './db/models/index.js';
import admin from 'firebase-admin';

dotenv.config();

const firebaseConfig = {
  projectId: "promptwars-f22dc",
};

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  ...firebaseConfig,
});

const JWT_SECRET = process.env.JWT_SECRET ?? 'venueflow-dev-secret';
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

// reCAPTCHA verification function
async function verifyRecaptchaToken(token, action) {
  if (!RECAPTCHA_SECRET_KEY) {
    console.warn('RECAPTCHA_SECRET_KEY not configured, skipping verification');
    return { success: true, score: 0.5 };
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${RECAPTCHA_SECRET_KEY}&response=${token}`,
    });

    const data = await response.json();
    console.log(`reCAPTCHA verification for ${action}:`, data);

    if (!data.success) {
      return { success: false, score: 0, reason: 'reCAPTCHA verification failed' };
    }

    // Check action matches
    if (data.action !== action) {
      return { success: false, score: data.score, reason: `Action mismatch: expected ${action}, got ${data.action}` };
    }

    // Check score (0.0 is likely a bot, 1.0 is likely human)
    const threshold = 0.5;
    if (data.score < threshold) {
      return { success: false, score: data.score, reason: `Score too low: ${data.score}` };
    }

    return { success: true, score: data.score };
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return { success: false, reason: 'Verification error' };
  }
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (origin === CLIENT_ORIGIN) return true;
  if (origin.startsWith('http://localhost:')) return true;
  if (origin.startsWith('http://127.0.0.1:')) return true;
  return false;
}

function pickUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function auth(requiredRoles = []) {
  return async (req, res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing authorization token' });
    }

    try {
      const idToken = header.slice(7);
      let user;
      try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        user = {
          id: decodedToken.uid,
          email: decodedToken.email,
          name: decodedToken.name || decodedToken.email.split('@')[0],
          role: 'user'
        };
      } catch (firebaseError) {
        // Fallback to JWT for local development
        const payload = jwt.verify(idToken, JWT_SECRET);
        user = payload;
      }
      req.user = user;
      if (requiredRoles.length && !requiredRoles.includes(req.user.role)) {
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

async function getUserEmail({ mongoEnabled, state, userId }) {
  if (mongoEnabled) {
    const user = await User.findOne({ id: userId }).lean();
    return user?.email ?? null;
  }
  const user = state.demoUsers.find((item) => item.id === userId);
  return user?.email ?? null;
}

async function getEventInfo({ mongoEnabled, state }) {
  if (mongoEnabled) {
    const event = await Event.findOne({}).sort({ startsAt: 1 }).lean();
    if (!event) return null;
    return {
      name: event.name,
      venue: event.venue,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
    };
  }
  return {
    name: state.currentEvent.name,
    venue: state.currentEvent.venue,
    startsAt: state.currentEvent.startsAt,
    endsAt: state.currentEvent.endsAt,
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
  const mongo = await connectMongo();
  if (mongo.enabled) {
    await ensureSeeded();
  }

  const state = mongo.enabled ? null : createSeedState();
  const app = express();
  const httpServer = http.createServer(app);
  const io = createSocketServer(httpServer, { corsOrigin: isAllowedOrigin });

  let redisClient = null;
  if (process.env.REDIS_URL) {
    redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on('error', () => undefined);
    await redisClient.connect().catch(() => {
      redisClient = null;
    });
  }

  const seatLockService = createSeatLockService({ redisClient, ttlSeconds: 600 });
  const heatmapService = createHeatmapService({ state: state ?? { zones: [] }, io });

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function waitForOccupancy(occupancy, capacity) {
    const ratio = occupancy / capacity;
    if (ratio > 0.8) return 14;
    if (ratio > 0.6) return 9;
    if (ratio > 0.4) return 5;
    return 2;
  }

  app.use(
    cors({
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) return callback(null, true);
        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(morgan('dev'));

  registerSocketHandlers(io, { state: state ?? { seats: [], orders: [] }, seatLockService, heatmapService });

  const cleanupFns = [];
  if (!disableIntervals) {
    if (state) {
      cleanupFns.push(heatmapService.startBroadcasting());
      cleanupFns.push(attachParkingNotifications(state, io));
    }
  }

  app.get('/', (_req, res) => {
    res.json({
      ok: true,
      name: 'VenueFlow API',
      health: '/api/health',
    });
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      services: ['auth', 'booking', 'order', 'payment', 'admin', 'notifications'],
      persistence: mongo.enabled ? 'mongo' : 'memory',
    });
  });

  app.post('/api/auth/register', async (req, res) => {
    const { email, name, password, role = 'user' } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ message: 'name, email and password are required' });
    }
    const normalizedEmail = String(email).toLowerCase();
    if (mongo.enabled) {
      const existing = await User.findOne({ email: normalizedEmail }).lean();
      if (existing) return res.status(409).json({ message: 'Email already exists' });
    } else if (state.demoUsers.some((user) => user.email === email)) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    const user = {
      id: randomUUID(),
      email: normalizedEmail,
      name,
      role: ['user', 'vendor', 'admin', 'delivery'].includes(role) ? role : 'user',
      password: await bcrypt.hash(password, 10),
    };
    if (mongo.enabled) {
      await User.create(user);
    } else {
      state.demoUsers.push(user);
    }
    const token = jwt.sign(pickUser(user), JWT_SECRET, { expiresIn: '12h' });
    return res.status(201).json({ token, user: pickUser(user) });
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const normalizedEmail = String(email).toLowerCase();
    const user = mongo.enabled
      ? await User.findOne({ email: normalizedEmail }).lean()
      : state.demoUsers.find((item) => item.email === email);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign(pickUser(user), JWT_SECRET, { expiresIn: '12h' });
    return res.json({ token, user: pickUser(user) });
  });

  app.get('/api/auth/me', auth(), (req, res) => {
    const user = mongo.enabled ? null : state.demoUsers.find((item) => item.id === req.user.id);
    if (mongo.enabled) {
      return User.findOne({ id: req.user.id })
        .lean()
        .then((doc) => res.json({ user: doc ? pickUser(doc) : null }))
        .catch(() => res.json({ user: null }));
    }
    return res.json({ user: user ? pickUser(user) : null });
  });

  app.post('/api/auth/verify-recaptcha', auth(), async (req, res) => {
    const recaptchaToken = req.headers['x-recaptcha-token'];
    const { action } = req.body;

    if (!recaptchaToken) {
      return res.status(400).json({ message: 'Missing reCAPTCHA token' });
    }

    const result = await verifyRecaptchaToken(recaptchaToken, action);
    if (!result.success) {
      console.warn(`reCAPTCHA verification failed for user ${req.user.id}: ${result.reason}`);
      return res.status(403).json({ message: 'reCAPTCHA verification failed', reason: result.reason });
    }

    res.json({ success: true, score: result.score });
  });

  app.get('/api/bootstrap', auth(), (req, res) => {
    if (!mongo.enabled) {
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
        guidance: createGuidance(
          heatmapService,
          latestBooking ? state.seats.find((seat) => seat.id === latestBooking.seatIds[0]) : null,
        ),
      });
    }

    return Promise.all([
      Event.findOne({}).sort({ startsAt: 1 }).lean(),
      Seat.find({}).lean(),
      MenuItem.find({}).lean(),
      Zone.find({}).lean(),
      Booking.find({ userId: req.user.id }).sort({ createdAt: 1 }).lean(),
      Order.find({ userId: req.user.id }).sort({ createdAt: 1 }).lean(),
      Notification.find({ userId: req.user.id }).sort({ createdAt: 1 }).limit(5).lean(),
    ])
      .then(([event, seats, menu, zones, bookings, orders, notifications]) => {
        const latestBooking = bookings.at(-1) ?? null;
        const latestSeat = latestBooking ? seats.find((seat) => seat.id === latestBooking.seatIds[0]) : null;
        const dbHeatmapService = createHeatmapService({ state: { zones }, io: null });
        return res.json({
          event: {
            id: event?.id ?? 'event-1',
            name: event?.name ?? 'Event',
            venue: event?.venue ?? 'Venue',
            startsAt: event?.startsAt?.toISOString?.() ?? new Date().toISOString(),
            endsAt: event?.endsAt?.toISOString?.() ?? new Date().toISOString(),
          },
          seats: seats.map((seat) => ({
            ...seat,
            holdExpiresAt: seat.holdExpiresAt ? new Date(seat.holdExpiresAt).toISOString() : null,
          })),
          menu,
          zones: dbHeatmapService.getSnapshot(),
          bookings,
          orders,
          notifications,
          guidance: createGuidance(dbHeatmapService, latestSeat),
        });
      })
      .catch((error) => res.status(500).json({ message: error.message ?? 'Bootstrap failed' }));
  });

  app.post('/api/bookings/lock', auth(), async (req, res) => {
    const currentEvent = mongo.enabled ? await Event.findOne({}).sort({ startsAt: 1 }).lean() : null;
    const defaultEventId = mongo.enabled ? currentEvent?.id ?? 'event-1' : state.currentEvent.id;
    const { eventId = defaultEventId, seatIds = [] } = req.body;
    if (!seatIds.length) return res.status(400).json({ message: 'seatIds are required' });

    const seats = mongo.enabled
      ? await Seat.find({ id: { $in: seatIds } }).lean()
      : state.seats.filter((seat) => seatIds.includes(seat.id));
    if (seats.some((seat) => seat.status === 'booked')) return res.status(409).json({ message: 'One or more seats are already booked' });

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

      if (mongo.enabled) {
        const expiresAtDate = new Date(lock.expiresAt);
        await Hold.deleteMany({ userId: req.user.id });
        await Hold.create({
          id: hold.id,
          eventId,
          seatIds,
          userId: req.user.id,
          expiresAt: expiresAtDate,
          createdAt: new Date(hold.createdAt),
        });
        await Seat.updateMany(
          { id: { $in: seatIds }, status: { $ne: 'booked' } },
          { $set: { status: 'locked', lockedBy: req.user.id, holdExpiresAt: expiresAtDate } },
        );
        const zones = await Zone.find({}).lean();
        const dbHeatmapService = createHeatmapService({ state: { zones }, io: null });
        const guidance = createGuidance(dbHeatmapService, seats[0] ?? null);
        io.emit('seat:lock', { seatIds, userId: req.user.id, expiresAt: hold.expiresAt });
        return res.json({ hold, guidance });
      }

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
    const hold = mongo.enabled
      ? await Hold.findOne({ id: holdId, userId: req.user.id }).lean()
      : state.holds.find((item) => item.id === holdId && item.userId === req.user.id);
    if (!hold) return res.status(404).json({ message: 'Hold not found' });
    await seatLockService.releaseSeats({ eventId: hold.eventId, seatIds: hold.seatIds, userId: req.user.id });

    if (mongo.enabled) {
      await Hold.deleteOne({ id: holdId, userId: req.user.id });
      await Seat.updateMany(
        { id: { $in: hold.seatIds }, status: 'locked', lockedBy: req.user.id },
        { $set: { status: 'available', lockedBy: null, holdExpiresAt: null } },
      );
      io.emit('seat:release', { seatIds: hold.seatIds, userId: req.user.id });
      return res.json({ released: true });
    }

    state.holds = state.holds.filter((item) => item.id !== holdId);
    state.seats = state.seats.map((seat) =>
      hold.seatIds.includes(seat.id) && seat.status === 'locked'
        ? { ...seat, status: 'available', lockedBy: null, holdExpiresAt: null }
        : seat,
    );
    io.emit('seat:release', { seatIds: hold.seatIds, userId: req.user.id });
    return res.json({ released: true });
  });

  app.post('/api/payments/checkout', auth(), async (req, res) => {
    const { holdId } = req.body;
    const hold = mongo.enabled
      ? await Hold.findOne({ id: holdId, userId: req.user.id }).lean()
      : state.holds.find((item) => item.id === holdId && item.userId === req.user.id);
    if (!hold) return res.status(404).json({ message: 'Seat hold not found' });

    const heldSeats = mongo.enabled
      ? await Seat.find({ id: { $in: hold.seatIds } }).lean()
      : state.seats.filter((seat) => hold.seatIds.includes(seat.id));
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

    if (mongo.enabled) {
      await Booking.create({ ...booking, createdAt: new Date(booking.createdAt) });
      await Hold.deleteOne({ id: holdId, userId: req.user.id });
      await Seat.updateMany(
        { id: { $in: hold.seatIds } },
        { $set: { status: 'booked', lockedBy: null, holdExpiresAt: null } },
      );
      await seatLockService.releaseSeats({ eventId: hold.eventId, seatIds: hold.seatIds, userId: req.user.id });
      io.emit('seat:confirmed', { seatIds: hold.seatIds, bookingId: booking.id, userId: req.user.id });
      const notice = {
        id: randomUUID(),
        userId: req.user.id,
        message: `Booking ${booking.id.slice(0, 8)} confirmed. Gate ${booking.gate}.`,
        type: 'success',
        createdAt: new Date(),
      };
      await Notification.create(notice);
      const zones = await Zone.find({}).lean();
      const dbHeatmapService = createHeatmapService({ state: { zones }, io: null });
      const guidance = createGuidance(dbHeatmapService, heldSeats[0] ?? null);

      // Best-effort receipt email (do not block response).
      getUserEmail({ mongoEnabled: true, state, userId: req.user.id })
        .then(async (email) => {
          if (!email) return;
          const eventInfo = await getEventInfo({ mongoEnabled: true, state });
          if (!eventInfo) return;
          const arriveAt = new Date(new Date(eventInfo.startsAt).getTime() - 45 * 60 * 1000);
          await sendBookingEmail({ to: email, booking, event: eventInfo, guidance, arriveAt });
        })
        .catch(() => undefined);

      return res.json({ booking, guidance });
    }

    state.bookings.push(booking);
    state.holds = state.holds.filter((item) => item.id !== holdId);
    state.seats = state.seats.map((seat) =>
      hold.seatIds.includes(seat.id) ? { ...seat, status: 'booked', lockedBy: null, holdExpiresAt: null } : seat,
    );
    await seatLockService.releaseSeats({ eventId: hold.eventId, seatIds: hold.seatIds, userId: req.user.id });
    io.emit('seat:confirmed', { seatIds: hold.seatIds, bookingId: booking.id, userId: req.user.id });
    createNotification(state, req.user.id, `Booking ${booking.id.slice(0, 8)} confirmed. Gate ${booking.gate}.`, 'success');
    const guidance = createGuidance(heatmapService, heldSeats[0]);

    getUserEmail({ mongoEnabled: false, state, userId: req.user.id })
      .then(async (email) => {
        if (!email) return;
        const eventInfo = await getEventInfo({ mongoEnabled: false, state });
        if (!eventInfo) return;
        const arriveAt = new Date(new Date(eventInfo.startsAt).getTime() - 45 * 60 * 1000);
        await sendBookingEmail({ to: email, booking, event: eventInfo, guidance, arriveAt });
      })
      .catch(() => undefined);

    return res.json({ booking, guidance });
  });

  app.get('/api/bookings/me', auth(), (req, res) => {
    if (mongo.enabled) {
      return Booking.find({ userId: req.user.id })
        .sort({ createdAt: 1 })
        .lean()
        .then((bookings) => res.json({ bookings }))
        .catch((error) => res.status(500).json({ message: error.message }));
    }
    res.json({ bookings: state.bookings.filter((item) => item.userId === req.user.id) });
  });

  app.get('/api/orders/menu', auth(), (_req, res) => {
    if (mongo.enabled) {
      return MenuItem.find({})
        .lean()
        .then((menu) => res.json({ menu }))
        .catch((error) => res.status(500).json({ message: error.message }));
    }
    res.json({ menu: state.menu });
  });

  app.post('/api/orders', auth(), (req, res) => {
    const { bookingId, items = [] } = req.body;
    if (mongo.enabled) {
      return Promise.all([
        Booking.findOne({ id: bookingId, userId: req.user.id }).lean(),
        MenuItem.find({}).lean(),
      ])
        .then(async ([bookingDoc, menu]) => {
          if (!bookingDoc) return res.status(404).json({ message: 'Booking not found' });
          const total = items.reduce((sum, item) => {
            const menuItem = menu.find((entry) => entry.id === item.itemId);
            return sum + (menuItem?.price ?? 0) * item.quantity;
          }, 0);
          const order = {
            id: randomUUID(),
            bookingId,
            userId: req.user.id,
            seatId: bookingDoc.seatIds[0],
            items,
            total,
            status: 'placed',
            createdAt: new Date().toISOString(),
          };
          await Order.create({ ...order, createdAt: new Date(order.createdAt) });
          io.emit('order:status-update', { orderId: order.id, status: order.status });
          return res.status(201).json({ order });
        })
        .catch((error) => res.status(500).json({ message: error.message }));
    }

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
    if (mongo.enabled) {
      return Order.find({ userId: req.user.id })
        .sort({ createdAt: 1 })
        .lean()
        .then((orders) => res.json({ orders }))
        .catch((error) => res.status(500).json({ message: error.message }));
    }
    res.json({ orders: state.orders.filter((item) => item.userId === req.user.id) });
  });

  app.get('/api/vendor/orders', auth(['vendor', 'admin']), (_req, res) => {
    if (mongo.enabled) {
      return Order.find({})
        .sort({ createdAt: 1 })
        .lean()
        .then((orders) => res.json({ orders }))
        .catch((error) => res.status(500).json({ message: error.message }));
    }
    res.json({ orders: state.orders });
  });

  app.patch('/api/vendor/orders/:orderId/status', auth(['vendor', 'admin']), (req, res) => {
    if (mongo.enabled) {
      const status = req.body.status;
      return Order.findOneAndUpdate({ id: req.params.orderId }, { $set: { status } }, { new: true })
        .lean()
        .then(async (order) => {
          if (!order) return res.status(404).json({ message: 'Order not found' });
          io.emit('order:status-update', { orderId: order.id, status: order.status });
          await Notification.create({
            id: randomUUID(),
            userId: order.userId,
            message: `Order ${order.id.slice(0, 8)} is now ${order.status}.`,
            type: 'order',
            createdAt: new Date(),
          });
          return res.json({ order });
        })
        .catch((error) => res.status(500).json({ message: error.message }));
    }

    const order = state.orders.find((item) => item.id === req.params.orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    order.status = req.body.status;
    io.emit('order:status-update', { orderId: order.id, status: order.status });
    createNotification(state, order.userId, `Order ${order.id.slice(0, 8)} is now ${order.status}.`, 'order');
    return res.json({ order });
  });

  app.get('/api/admin/dashboard', auth(['admin']), (_req, res) => {
    if (mongo.enabled) {
      return Promise.all([
        Seat.countDocuments({ status: 'booked' }),
        Seat.countDocuments({}),
        Hold.find({}).lean(),
        Booking.find({}).lean(),
        Order.find({}).lean(),
        Zone.find({}).lean(),
      ])
        .then(([occupancy, totalSeats, holds, bookings, orders, zones]) => {
          const dbHeatmapService = createHeatmapService({ state: { zones }, io: null });
          return res.json({
            occupancy,
            totalSeats,
            holds,
            bookings,
            orders,
            zones: dbHeatmapService.getSnapshot(),
            mapper: zones.map((zone) => ({
              id: zone.id,
              name: zone.name,
              gate: zone.gate,
              parkingZone: zone.parkingZone,
              type: zone.type,
            })),
          });
        })
        .catch((error) => res.status(500).json({ message: error.message }));
    }

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
    if (mongo.enabled) {
      return Zone.findOneAndUpdate(
        { id: req.params.zoneId },
        { $set: { gate: req.body.gate, parkingZone: req.body.parkingZone, name: req.body.name } },
        { new: true },
      )
        .lean()
        .then(async (zone) => {
          if (!zone) return res.status(404).json({ message: 'Zone not found' });
          const zones = await Zone.find({}).lean();
          const dbHeatmapService = createHeatmapService({ state: { zones }, io: null });
          const payload = dbHeatmapService.getSnapshot();
          io.emit('heatmap:update', payload);
          return res.json({ zone, zones: payload });
        })
        .catch((error) => res.status(500).json({ message: error.message }));
    }

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
      if (mongo.enabled) {
        return Zone.findOne({ id: zoneId })
          .lean()
          .then(async (zone) => {
            if (!zone) return res.status(404).json({ message: 'Zone not found' });
            const nextOccupancy = clamp(zone.occupancy + Number(delta), 0, zone.capacity);
            const nextWait = waitForOccupancy(nextOccupancy, zone.capacity);
            await Zone.updateOne({ id: zoneId }, { $set: { occupancy: nextOccupancy, waitTime: nextWait } });
            const zones = await Zone.find({}).lean();
            const dbHeatmapService = createHeatmapService({ state: { zones }, io: null });
            const payload = dbHeatmapService.getSnapshot();
            io.emit('heatmap:update', payload);
            return res.json({ zones: payload });
          })
          .catch((error) => res.status(500).json({ message: error.message }));
      }

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
      if (mongo.enabled) {
        await mongo.mongoose.disconnect().catch(() => undefined);
      }
    },
    httpServer,
    io,
    state,
  };
}
