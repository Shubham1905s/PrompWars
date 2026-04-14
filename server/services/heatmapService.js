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

function statusForOccupancy(occupancy, capacity) {
  const ratio = occupancy / capacity;
  if (ratio > 0.8) return 'high';
  if (ratio > 0.6) return 'moderate';
  return 'low';
}

export function createHeatmapService({ state, io }) {
  function snapshot() {
    return state.zones.map((zone) => ({
      ...zone,
      score: Number((zone.occupancy / zone.capacity).toFixed(2)),
      waitTime: waitForOccupancy(zone.occupancy, zone.capacity),
      congestion: statusForOccupancy(zone.occupancy, zone.capacity),
    }));
  }

  return {
    getSnapshot() {
      return snapshot();
    },

    recordFlow(zoneId, delta) {
      const zone = state.zones.find((item) => item.id === zoneId);
      if (!zone) {
        throw new Error('Zone not found');
      }
      zone.occupancy = clamp(zone.occupancy + delta, 0, zone.capacity);
      zone.waitTime = waitForOccupancy(zone.occupancy, zone.capacity);
      zone.score = Number((zone.occupancy / zone.capacity).toFixed(2));
      zone.congestion = statusForOccupancy(zone.occupancy, zone.capacity);
      const payload = snapshot();
      io?.emit('heatmap:update', payload);
      return payload;
    },

    getBestArrival() {
      const gates = snapshot().filter((zone) => zone.type === 'gate');
      return gates.sort((a, b) => a.waitTime - b.waitTime)[0];
    },

    startBroadcasting({ intervalMs = 30000 } = {}) {
      const timer = setInterval(() => {
        state.zones.forEach((zone) => {
          const delta = Math.floor(Math.random() * 31) - 15;
          zone.occupancy = clamp(zone.occupancy + delta, 0, zone.capacity);
          zone.waitTime = waitForOccupancy(zone.occupancy, zone.capacity);
          zone.score = Number((zone.occupancy / zone.capacity).toFixed(2));
          zone.congestion = statusForOccupancy(zone.occupancy, zone.capacity);
        });
        io?.emit('heatmap:update', snapshot());
      }, intervalMs);
      return () => clearInterval(timer);
    },
  };
}
