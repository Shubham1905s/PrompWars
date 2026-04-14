const memoryLocks = new Map();

function keyFor(eventId, seatId) {
  return `seat-lock:${eventId}:${seatId}`;
}

export function createSeatLockService({ redisClient, ttlSeconds = 600 } = {}) {
  const client = redisClient ?? null;

  return {
    async lockSeats({ eventId, seatIds, userId }) {
      const expiresAt = Date.now() + ttlSeconds * 1000;

      for (const seatId of seatIds) {
        const key = keyFor(eventId, seatId);
        if (client) {
          const reply = await client.set(key, JSON.stringify({ userId, expiresAt }), { EX: ttlSeconds, NX: true });
          if (reply !== 'OK') {
            await this.releaseSeats({ eventId, seatIds, userId });
            throw new Error(`Seat ${seatId} is already locked`);
          }
        } else {
          const existing = memoryLocks.get(key);
          if (existing && existing.expiresAt > Date.now()) {
            await this.releaseSeats({ eventId, seatIds, userId });
            throw new Error(`Seat ${seatId} is already locked`);
          }
          memoryLocks.set(key, { userId, expiresAt });
        }
      }

      return { expiresAt };
    },

    async releaseSeats({ eventId, seatIds, userId }) {
      for (const seatId of seatIds) {
        const key = keyFor(eventId, seatId);
        if (client) {
          const payload = await client.get(key);
          if (!payload) continue;
          const parsed = JSON.parse(payload);
          if (!userId || parsed.userId === userId) {
            await client.del(key);
          }
        } else {
          const existing = memoryLocks.get(key);
          if (!existing) continue;
          if (!userId || existing.userId === userId) {
            memoryLocks.delete(key);
          }
        }
      }
    },

    async getLock(eventId, seatId) {
      const key = keyFor(eventId, seatId);
      if (client) {
        const payload = await client.get(key);
        return payload ? JSON.parse(payload) : null;
      }
      const existing = memoryLocks.get(key);
      if (!existing || existing.expiresAt <= Date.now()) {
        memoryLocks.delete(key);
        return null;
      }
      return existing;
    },

    async clearAll() {
      if (client) return;
      memoryLocks.clear();
    },
  };
}
