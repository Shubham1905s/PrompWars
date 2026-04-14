# VenueFlow MVP

VenueFlow is a full-stack event experience platform for large-scale sporting venues. This MVP focuses on reducing crowd friction during arrival, ordering, and seat booking with real-time coordination across attendee, vendor, and admin flows.

## What is included

- React + Tailwind frontend with route-based UI
- Node + Express backend with modular service folders
- Socket.IO real-time updates
- Redis-style seat locking service with 10-minute holds
- Heatmap updates and gate / parking guidance
- User routes:
  - `/login`
  - `/register`
  - `/venue-map`
  - `/order-food`
  - `/my-orders`
- Role dashboards:
  - `/vendor/dashboard`
  - `/admin/dashboard`
- Dummy payment confirmation flow
- Unit test for seat locking
- WebSocket integration test

## Repo structure

```text
src/                     React frontend
server/
  data/                  Demo seed state
  realtime/              Socket.IO setup
  services/              Seat lock and heatmap services
  tests/                 Unit + websocket tests
docker-compose.yml       Redis + Mongo services
.env.example             Runtime configuration
```

## Demo credentials

All seeded users use password `password123`.

- User: `fan@venueflow.dev`
- Vendor: `vendor@venueflow.dev`
- Admin: `admin@venueflow.dev`

## Environment variables

Copy `.env.example` to `.env`.

```bash
PORT=5000
JWT_SECRET=venueflow-dev-secret
CLIENT_ORIGIN=http://localhost:5173
REDIS_URL=redis://localhost:6379
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## Running locally

1. Install dependencies:

```bash
npm install
```

2. Start Redis and Mongo:

```bash
docker compose up -d
```

3. Start the frontend and backend together:

```bash
npm run dev
```

4. Open the app:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:5000
```

## Available scripts

```bash
npm run dev          # client + server
npm run dev:client   # Vite frontend
npm run dev:server   # Express backend
npm run build        # frontend production build
npm run test         # seat lock + websocket tests
```

## Implemented backend flows

### Seat locking

1. User selects seats in `/venue-map`
2. Frontend calls `POST /api/bookings/lock`
3. `seatLockService` creates Redis keys with a 600 second TTL
4. Backend emits `seat:lock`
5. Dummy checkout calls `POST /api/payments/checkout`
6. Seats become booked and backend emits `seat:confirmed`

### Heatmap updates

- Zones are stored in backend state and updated by `heatmapService`
- The server emits `heatmap:update` every 30 seconds
- Admins can manually simulate inflow from `/admin/dashboard`

### Order flow

1. User places a seat-delivery order from `/order-food`
2. Backend stores the order and emits `order:status-update`
3. Vendor updates status from `/vendor/dashboard`
4. User sees live status in `/my-orders`

## WebSocket events

- `seat:lock`
- `seat:release`
- `seat:confirmed`
- `heatmap:update`
- `order:status-update`
- `notification:parking`

## Notes

- The backend is structured to support Redis and Mongo-backed services; the current MVP uses seeded in-memory domain state for the fastest local demo loop while still exposing the required interfaces and event contracts.
- Redis is still used by the seat locking service when `REDIS_URL` is available.
