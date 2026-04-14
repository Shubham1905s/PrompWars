import { describe, expect, it } from 'vitest';
import { createSeatLockService } from '../services/seatLockService.js';

describe('seatLockService', () => {
  it('prevents double-booking the same seat during the hold window', async () => {
    const service = createSeatLockService({ ttlSeconds: 600 });

    await service.lockSeats({ eventId: 'event-1', seatIds: ['N1-A1'], userId: 'user-1' });

    await expect(
      service.lockSeats({ eventId: 'event-1', seatIds: ['N1-A1'], userId: 'user-2' }),
    ).rejects.toThrow(/already locked/i);

    const lock = await service.getLock('event-1', 'N1-A1');
    expect(lock?.userId).toBe('user-1');

    await service.clearAll();
  });
});
