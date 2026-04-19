# PromptWars — VenueSync

> Real-time crowd coordination and venue experience platform for large-scale sporting events.

**Live demo:** [promp-wars.vercel.app](https://promp-wars.vercel.app) · **API:** [prompwars.onrender.com](https://prompwars.onrender.com)

---

## ✨ Features

| Area | What it does |
|---|---|
| **Authentication** | Firebase Auth (email/password) with reCAPTCHA v3 bot protection |
| **Seat booking** | Interactive venue map, real-time seat locking (10-min hold via Redis), payment confirmation |
| **Crowd heatmap** | Live zone congestion scores broadcast every 30 s via Socket.IO |
| **Smart routing** | Recommended gate & parking zone derived from live heatmap data |
| **In-seat ordering** | Menu browsing → cart → seat-delivery order tracked in real time |
| **Vendor dashboard** | Live order queue with one-click status updates |
| **Admin dashboard** | Zone traffic overview, manual heatmap simulation, gate/parking mapper |
| **Booking email** | Transactional receipt email sent on checkout via Nodemailer |
| **Notifications** | In-app parking alerts pushed when the event approaches its end |

---

## 🗂 Repo structure

```text
src/                        React + TypeScript frontend (single App.tsx)
server/
  app.js                    Express server — all API routes
  index.js                  HTTP server entry point
  data/                     In-memory seed state (demo fallback)
  db/
    connect.js              MongoDB connection helper
    seed.js                 Database auto-seeder on first run
    models/                 Mongoose models (User, Seat, Booking, Order …)
  realtime/
    socket.js               Socket.IO server setup & event handlers
  services/
    seatLockService.js      Redis-backed seat locking with TTL
    heatmapService.js       Zone scoring & broadcast scheduler
    emailService.js         Nodemailer booking receipt
  tests/                    Vitest unit + Supertest integration tests
docker-compose.yml          Redis service (optional local use)
vercel.json                 SPA rewrite rule for Vercel frontend deploy
```

---

## 🚦 Routes

### User (`/`)
| Path | Description |
|---|---|
| `/login` | Sign in with Firebase |
| `/register` | Create account with role selection |
| `/events` | Event overview & crowd guidance |
| `/venue-map` | Interactive seat picker, lock & checkout |
| `/order-food` | In-seat food & beverage ordering |
| `/my-orders` | Live order status tracker |

### Role dashboards
| Path | Role |
|---|---|
| `/vendor/dashboard` | Vendor |
| `/admin/dashboard` | Admin |

---

## 🛠 Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS v3 + custom design system |
| Animations | Framer Motion |
| Icons | Lucide React |
| Auth | Firebase Auth (client) + Firebase Admin SDK (server) |
| Bot protection | Google reCAPTCHA Enterprise v3 |
| Backend | Node.js, Express 5 |
| Real-time | Socket.IO v4 |
| Database | MongoDB (Mongoose) — falls back to seeded in-memory state |
| Seat locking | Redis (optional) — falls back to in-memory map |
| Email | Nodemailer |
| Testing | Vitest, Supertest |
| Frontend deploy | Vercel |
| Backend deploy | Render |

---

## ⚙️ Environment variables

Create a `.env` file in the project root:

```bash
# ── Server ──────────────────────────────────────────────
PORT=5000
JWT_SECRET=your-dev-secret
CLIENT_ORIGIN=http://localhost:5173

# MongoDB (omit to use seeded in-memory state)
MONGODB_URI=mongodb://localhost:27017/venuesync

# Redis (omit to use in-memory seat locking)
REDIS_URL=redis://localhost:6379

# Nodemailer
EMAIL_USER=you@example.com
EMAIL_PASS=your-app-password

# reCAPTCHA (server-side secret)
RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key

# ── Client (Vite) ────────────────────────────────────────
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000

# Firebase project credentials
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=

# reCAPTCHA Enterprise site key
VITE_RECAPTCHA_SITE_KEY=
```

> **Firebase Admin SDK** — the server uses Application Default Credentials.  
> For local development, set `GOOGLE_APPLICATION_CREDENTIALS` to the path of your service-account JSON file.

---

## 🏃 Running locally

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Start Redis via Docker
docker compose up -d

# 3. Start both frontend and backend with hot-reload
npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5000/api |
| Health check | http://localhost:5000/api/health |

---

## 📜 Available scripts

```bash
npm run dev          # Vite frontend + Nodemon backend (concurrently)
npm run dev:client   # Vite frontend only
npm run dev:server   # Nodemon backend only
npm run build        # TypeScript compile + Vite production build
npm run preview      # Preview production build locally
npm run lint         # ESLint
npm run test         # Vitest unit + integration tests
```

---

## 🔌 WebSocket events

| Event | Direction | Payload |
|---|---|---|
| `seat:lock` | server → clients | `{ seatIds, userId, expiresAt }` |
| `seat:release` | server → clients | `{ seatIds, userId }` |
| `seat:confirmed` | server → clients | `{ seatIds, bookingId, userId }` |
| `seat:error` | server → client | `{ message }` |
| `heatmap:update` | server → clients | `Zone[]` |
| `order:status-update` | server → clients | `{ orderId, status }` |
| `notification:parking` | server → clients | `Notification` |

---

## 🔗 Key API endpoints

```text
GET    /api/health                        Service health check
POST   /api/auth/register                 Register with email/password
POST   /api/auth/login                    Login (JWT fallback for local dev)
GET    /api/auth/me                       Current user
POST   /api/auth/verify-recaptcha         Validate reCAPTCHA token
GET    /api/bootstrap                     Full client data payload for logged-in user
POST   /api/bookings/lock                 Lock seats (10-min hold)
POST   /api/bookings/release              Release a hold
POST   /api/payments/checkout             Confirm booking from hold
GET    /api/bookings/me                   User's booking history
GET    /api/orders/menu                   Food & beverage menu
POST   /api/orders                        Place an in-seat food order
GET    /api/vendor/orders                 Vendor: all pending orders
PATCH  /api/vendor/orders/:id/status      Vendor: update order status
GET    /api/admin/dashboard               Admin: full venue snapshot
PATCH  /api/admin/zones/:id               Admin: remap zone gate/parking
POST   /api/admin/heatmap-event           Admin: simulate crowd inflow
```

---

## 🏗 Seat locking flow

1. User selects seats on `/venue-map`
2. Frontend calls `POST /api/bookings/lock`
3. `seatLockService` stores a Redis key (or in-memory entry) with a **600 s TTL**
4. Server emits `seat:lock` — all connected clients see the seats go grey
5. User confirms checkout → `POST /api/payments/checkout`
6. Seats transition to `booked`; server emits `seat:confirmed`
7. Booking receipt email is sent asynchronously

---

## 📦 Persistence modes

| Condition | Behaviour |
|---|---|
| `MONGODB_URI` set & reachable | Full Mongoose persistence; database auto-seeded on first run |
| No `MONGODB_URI` | Seeded in-memory state (data resets on server restart) |
| `REDIS_URL` set & reachable | Redis-backed seat locking with key TTL |
| No `REDIS_URL` | In-memory seat locking (data lost on restart) |

---

## 🚀 Deployment

| Target | Platform | Notes |
|---|---|---|
| Frontend | **Vercel** | `vercel.json` rewrites all routes to `index.html` for SPA routing |
| Backend | **Render** | Set all `server-side` env vars in the Render dashboard |

After deploying the backend, set `VITE_API_URL` and `VITE_SOCKET_URL` (or leave unset to auto-detect the Render URL) and redeploy the frontend.
