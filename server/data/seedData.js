const eventEnd = new Date(Date.now() + 60 * 60 * 1000);

const zoneTemplate = [
  { id: 'gate-north', name: 'North Gate', type: 'gate', area: 'North Arrival', gate: 'Gate A', parkingZone: 'P1', occupancy: 420, capacity: 900, waitTime: 4 },
  { id: 'gate-east', name: 'East Gate', type: 'gate', area: 'East Arrival', gate: 'Gate B', parkingZone: 'P2', occupancy: 650, capacity: 900, waitTime: 11 },
  { id: 'gate-south', name: 'South Gate', type: 'gate', area: 'South Arrival', gate: 'Gate C', parkingZone: 'P3', occupancy: 300, capacity: 900, waitTime: 3 },
  { id: 'parking-p1', name: 'Parking P1', type: 'parking', area: 'North Parking', gate: 'Gate A', parkingZone: 'P1', occupancy: 210, capacity: 300, waitTime: 7 },
  { id: 'parking-p2', name: 'Parking P2', type: 'parking', area: 'East Parking', gate: 'Gate B', parkingZone: 'P2', occupancy: 240, capacity: 300, waitTime: 12 },
  { id: 'parking-p3', name: 'Parking P3', type: 'parking', area: 'South Parking', gate: 'Gate C', parkingZone: 'P3', occupancy: 150, capacity: 300, waitTime: 5 },
  { id: 'concourse-north', name: 'North Concourse', type: 'concourse', area: 'Concourse', gate: 'Gate A', parkingZone: 'P1', occupancy: 520, capacity: 700, waitTime: 9 },
  { id: 'restroom-east', name: 'East Restrooms', type: 'restroom', area: 'Amenities', gate: 'Gate B', parkingZone: 'P2', occupancy: 90, capacity: 160, waitTime: 2 },
  { id: 'concession-west', name: 'West Concessions', type: 'concession', area: 'Food Court', gate: 'Gate C', parkingZone: 'P3', occupancy: 280, capacity: 360, waitTime: 8 },
];

function createSeats() {
  const sections = [
    { id: 'N1', name: 'North Lower', rows: ['A', 'B', 'C', 'D'], seatsPerRow: 8, gate: 'Gate A', parkingZone: 'P1', price: 1200 },
    { id: 'E2', name: 'East Premium', rows: ['E', 'F', 'G'], seatsPerRow: 6, gate: 'Gate B', parkingZone: 'P2', price: 2400 },
    { id: 'S3', name: 'South Club', rows: ['H', 'I', 'J'], seatsPerRow: 6, gate: 'Gate C', parkingZone: 'P3', price: 3200 },
  ];

  return sections.flatMap((section) =>
    section.rows.flatMap((row) =>
      Array.from({ length: section.seatsPerRow }, (_, index) => ({
        id: `${section.id}-${row}${index + 1}`,
        eventId: 'event-1',
        sectionId: section.id,
        sectionName: section.name,
        row,
        number: index + 1,
        status: index % 7 === 0 ? 'booked' : 'available',
        price: section.price,
        gate: section.gate,
        parkingZone: section.parkingZone,
      })),
    ),
  );
}

export function createSeedState() {
  return {
    currentEvent: {
      id: 'event-1',
      name: 'Championship Final 2026',
      venue: 'Metropolitan Arena',
      startsAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      endsAt: eventEnd.toISOString(),
    },
    demoUsers: [
      { id: 'user-1', name: 'Ava Fan', email: 'fan@venueflow.dev', password: '$2b$10$xf4hHFzbzveIYA6AjG8p9umyYOvXBZ5HYv1tZNTpyuUF9jLvbd4ma', role: 'user' },
      { id: 'vendor-1', name: 'Vendor Ops', email: 'vendor@venueflow.dev', password: '$2b$10$xf4hHFzbzveIYA6AjG8p9umyYOvXBZ5HYv1tZNTpyuUF9jLvbd4ma', role: 'vendor' },
      { id: 'admin-1', name: 'Admin Ops', email: 'admin@venueflow.dev', password: '$2b$10$xf4hHFzbzveIYA6AjG8p9umyYOvXBZ5HYv1tZNTpyuUF9jLvbd4ma', role: 'admin' },
    ],
    seats: createSeats(),
    orders: [],
    bookings: [],
    holds: [],
    zones: zoneTemplate.map((zone) => ({
      ...zone,
      score: Number((zone.occupancy / zone.capacity).toFixed(2)),
    })),
    menu: [
      { id: 'burger', name: 'Stadium Burger', price: 280, prepTime: 10, category: 'Meals' },
      { id: 'fries', name: 'Loaded Fries', price: 180, prepTime: 8, category: 'Snacks' },
      { id: 'cola', name: 'Large Cola', price: 120, prepTime: 3, category: 'Drinks' },
      { id: 'nachos', name: 'Cheese Nachos', price: 220, prepTime: 6, category: 'Snacks' },
    ],
  };
}
