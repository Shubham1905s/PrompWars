import { createSeedState } from '../data/seedData.js';
import { Booking, Event, Hold, MenuItem, Notification, Order, Seat, User, Zone } from './models/index.js';

export async function ensureSeeded() {
  const existingEvent = await Event.findOne({ id: 'event-1' }).lean();
  if (existingEvent) return { seeded: false };

  const seed = createSeedState();

  await Event.create({
    id: seed.currentEvent.id,
    name: seed.currentEvent.name,
    venue: seed.currentEvent.venue,
    startsAt: new Date(seed.currentEvent.startsAt),
    endsAt: new Date(seed.currentEvent.endsAt),
  });

  await User.insertMany(seed.demoUsers.map((user) => ({ ...user, email: user.email.toLowerCase() })));
  await Seat.insertMany(
    seed.seats.map((seat) => ({
      ...seat,
      lockedBy: seat.lockedBy ?? null,
      holdExpiresAt: seat.holdExpiresAt ? new Date(seat.holdExpiresAt) : null,
    })),
  );
  await Zone.insertMany(seed.zones.map((zone) => ({ ...zone })));
  await MenuItem.insertMany(seed.menu.map((item) => ({ ...item })));

  // Ensure empty collections exist (optional but keeps tooling consistent)
  await Promise.all([
    Booking.deleteMany({}),
    Hold.deleteMany({}),
    Order.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  return { seeded: true };
}

