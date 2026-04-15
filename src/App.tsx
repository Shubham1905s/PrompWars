import { useEffect, useMemo, useState, type FormEvent, type ReactElement } from 'react';
import { io } from 'socket.io-client';
import {
  Activity,
  Armchair,
  ArrowRight,
  Bell,
  Car,
  CheckCircle2,
  Clock3,
  Coffee,
  Search,
  LogOut,
  MapPin,
  ShieldCheck,
  ShoppingCart,
  Ticket,
  Users,
  UtensilsCrossed,
  Warehouse,
  Waves,
} from 'lucide-react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

type Role = 'user' | 'vendor' | 'admin' | 'delivery';
type AppUser = { email: string; id: string; name: string; role: Role };
type EventInfo = { endsAt: string; id: string; name: string; startsAt: string; venue: string };
type Seat = { eventId: string; gate: string; holdExpiresAt?: string | null; id: string; lockedBy?: string | null; number: number; parkingZone: string; price: number; row: string; sectionId: string; sectionName: string; status: 'available' | 'locked' | 'booked' };
type Zone = { capacity: number; congestion?: string; gate: string; id: string; name: string; occupancy: number; parkingZone: string; score: number; type: string; waitTime: number };
type Booking = { amount: number; createdAt: string; eventId: string; gate: string; id: string; parkingZone: string; seatIds: string[]; status: string };
type Order = { bookingId: string; createdAt: string; id: string; items: { itemId: string; quantity: number }[]; seatId: string; status: string; total: number; userId: string };
type MenuItem = { category: string; id: string; name: string; prepTime: number; price: number };
type Notification = { createdAt: string; id: string; message: string; type: string };
type Guidance = { message: string; recommendedGate: string; recommendedParking: string };
type Hold = { createdAt: string; eventId: string; expiresAt: string; id: string; seatIds: string[]; userId: string };
type BootstrapPayload = { bookings: Booking[]; event: EventInfo; guidance: Guidance; menu: MenuItem[]; notifications: Notification[]; orders: Order[]; seats: Seat[]; zones: Zone[] };
type DashboardPayload = { bookings: Booking[]; holds: Hold[]; mapper: { gate: string; id: string; name: string; parkingZone: string; type: string }[]; occupancy: number; orders: Order[]; totalSeats: number; zones: Zone[] };
type CartItem = Record<string, number>;
type AuthPayload = { email: string; name: string; password: string; role: Role };

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:5000';

async function request<T>(path: string, token?: string | null, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = 10000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    signal: init?.signal ?? controller.signal,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  clearTimeout(timeout);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message ?? 'Request failed');
  }

  return response.json() as Promise<T>;
}

function roleHome(role: Role) {
  if (role === 'vendor') return '/vendor/dashboard';
  if (role === 'admin') return '/admin/dashboard';
  return '/events';
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('venueflow-token'));
  const [authChecked, setAuthChecked] = useState<boolean>(() => !localStorage.getItem('venueflow-token'));
  const [user, setUser] = useState<AppUser | null>(() => {
    const raw = localStorage.getItem('venueflow-user');
    return raw ? (JSON.parse(raw) as AppUser) : null;
  });
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);
  const [activeHold, setActiveHold] = useState<Hold | null>(null);
  const [guidance, setGuidance] = useState<Guidance | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [adminSnapshot, setAdminSnapshot] = useState<DashboardPayload | null>(null);
  const [paymentReceipt, setPaymentReceipt] = useState<{ booking: Booking; guidance: Guidance } | null>(null);

  useEffect(() => {
    if (!token) {
      setBootstrap(null);
      setGuidance(null);
      setAuthChecked(true);
      return;
    }

    request<{ user: AppUser }>('/auth/me', token)
      .then((data) => {
        setUser(data.user);
      })
      .catch(() => {
        localStorage.removeItem('venueflow-token');
        localStorage.removeItem('venueflow-user');
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        setAuthChecked(true);
      });
  }, [token]);

  useEffect(() => {
    if (!token || !user || user.role !== 'user') return;
    request<BootstrapPayload>('/bootstrap', token)
      .then((data) => {
        setBootstrap(data);
        setGuidance(data.guidance);
      })
      .catch((error: Error) => setStatusMessage(error.message));
  }, [token, user]);

  useEffect(() => {
    if (!token || !user) return;

    const connection = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5000,
      transports: ['websocket'],
    });

    connection.on('connect', () => setStatusMessage('Live updates connected'));
    connection.on('seat:lock', ({ seatIds, userId: lockingUserId, expiresAt }) => {
      setBootstrap((current) =>
        current
          ? {
              ...current,
              seats: current.seats.map((seat) =>
                seatIds.includes(seat.id)
                  ? { ...seat, status: 'locked', lockedBy: lockingUserId, holdExpiresAt: expiresAt }
                  : seat,
              ),
            }
          : current,
      );
    });
    connection.on('seat:release', ({ seatIds }) => {
      setBootstrap((current) =>
        current
          ? {
              ...current,
              seats: current.seats.map((seat) =>
                seatIds.includes(seat.id)
                  ? { ...seat, status: 'available', lockedBy: null, holdExpiresAt: null }
                  : seat,
              ),
            }
          : current,
      );
    });
    connection.on('seat:confirmed', ({ seatIds }) => {
      setBootstrap((current) =>
        current
          ? {
              ...current,
              seats: current.seats.map((seat) =>
                seatIds.includes(seat.id)
                  ? { ...seat, status: 'booked', lockedBy: null, holdExpiresAt: null }
                  : seat,
              ),
            }
          : current,
      );
    });
    connection.on('heatmap:update', (zones: Zone[]) => {
      setBootstrap((current) => (current ? { ...current, zones } : current));
      setAdminSnapshot((current) => (current ? { ...current, zones } : current));
    });
    connection.on('order:status-update', ({ orderId, status }) => {
      setBootstrap((current) =>
        current
          ? {
              ...current,
              orders: current.orders.map((order) => (order.id === orderId ? { ...order, status } : order)),
            }
          : current,
      );
    });
    connection.on('notification:parking', (notification: Notification) => {
      setBootstrap((current) =>
        current ? { ...current, notifications: [...current.notifications, notification].slice(-6) } : current,
      );
    });
    connection.on('seat:error', ({ message }) => setStatusMessage(message));

    return () => {
      connection.close();
    };
  }, [token, user]);

  const latestBooking = bootstrap?.bookings.at(-1) ?? null;

  const login = async (payload: AuthPayload) => {
    try {
      const result = await request<{ token: string; user: AppUser }>('/auth/login', null, {
        method: 'POST',
        body: JSON.stringify({ email: payload.email, password: payload.password }),
      });
      localStorage.setItem('venueflow-token', result.token);
      localStorage.setItem('venueflow-user', JSON.stringify(result.user));
      setToken(result.token);
      setUser(result.user);
      navigate(roleHome(result.user.role));
    } finally {
      setAuthChecked(true);
    }
  };

  const register = async (payload: AuthPayload) => {
    try {
      const result = await request<{ token: string; user: AppUser }>('/auth/register', null, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      localStorage.setItem('venueflow-token', result.token);
      localStorage.setItem('venueflow-user', JSON.stringify(result.user));
      setToken(result.token);
      setUser(result.user);
      navigate(roleHome(result.user.role));
    } finally {
      setAuthChecked(true);
    }
  };

  const logout = () => {
    localStorage.removeItem('venueflow-token');
    localStorage.removeItem('venueflow-user');
    setToken(null);
    setUser(null);
    setBootstrap(null);
    setActiveHold(null);
    setAuthChecked(true);
    navigate('/login');
  };

  const refreshUserData = async () => {
    if (!token || !user || user.role !== 'user') return;
    const data = await request<BootstrapPayload>('/bootstrap', token);
    setBootstrap(data);
    setGuidance(data.guidance);
  };

  const lockSeats = async (seatIds: string[]) => {
    if (!token) return;
    const result = await request<{ guidance: Guidance; hold: Hold }>('/bookings/lock', token, {
      method: 'POST',
      body: JSON.stringify({ seatIds }),
    });
    setActiveHold(result.hold);
    setGuidance(result.guidance);
    setStatusMessage(`Seats locked for 10 minutes. Suggested arrival: ${result.guidance.recommendedGate}.`);
  };

  const releaseHold = async () => {
    if (!token || !activeHold) return;
    await request('/bookings/release', token, {
      method: 'POST',
      body: JSON.stringify({ holdId: activeHold.id }),
    });
    setActiveHold(null);
    await refreshUserData();
  };

  const confirmPayment = async () => {
    if (!token || !activeHold) return;
    const result = await request<{ booking: Booking; guidance: Guidance }>('/payments/checkout', token, {
      method: 'POST',
      body: JSON.stringify({ holdId: activeHold.id }),
    });
    setActiveHold(null);
    setGuidance(result.guidance);
    setPaymentReceipt(result);
    await refreshUserData();
    setStatusMessage(`Booking confirmed for ${result.booking.seatIds.join(', ')}.`);
  };

  const placeOrder = async (cart: CartItem) => {
    if (!token || !latestBooking || !bootstrap) return;
    const items = Object.entries(cart).map(([itemId, quantity]) => ({ itemId, quantity }));
    const result = await request<{ order: Order }>('/orders', token, {
      method: 'POST',
      body: JSON.stringify({ bookingId: latestBooking.id, items }),
    });
    setBootstrap({ ...bootstrap, orders: [...bootstrap.orders, result.order] });
    setStatusMessage('Food order sent to the vendor dashboard.');
  };

  const updateVendorOrder = async (orderId: string, status: string) => {
    if (!token) return;
    await request(`/vendor/orders/${orderId}/status`, token, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  };

  const loadAdmin = async () => {
    if (!token || user?.role !== 'admin') return;
    const result = await request<DashboardPayload>('/admin/dashboard', token);
    setAdminSnapshot(result);
  };

  useEffect(() => {
    if (token && user?.role === 'admin') {
      loadAdmin().catch((error: Error) => setStatusMessage(error.message));
    }
  }, [token, user]);

  const updateZoneMapper = async (zoneId: string, gate: string, parkingZone: string) => {
    if (!token) return;
    const result = await request<{ zones: Zone[] }>(`/admin/zones/${zoneId}`, token, {
      method: 'PATCH',
      body: JSON.stringify({ gate, parkingZone }),
    });
    setAdminSnapshot((current) =>
      current
        ? {
            ...current,
            zones: result.zones,
            mapper: current.mapper.map((item) => (item.id === zoneId ? { ...item, gate, parkingZone } : item)),
          }
        : current,
    );
  };

  const simulateHeatmap = async (zoneId: string, delta: number) => {
    if (!token) return;
    const result = await request<{ zones: Zone[] }>('/admin/heatmap-event', token, {
      method: 'POST',
      body: JSON.stringify({ zoneId, delta }),
    });
    setAdminSnapshot((current) => (current ? { ...current, zones: result.zones } : current));
  };

  return (
    <div className="min-h-screen bg-ink text-slate-50">
      <Routes>
        <Route
          path="/"
          element={
            !authChecked ? (
              <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-10">
                <LoadingPanel label="Checking session..." className="w-full max-w-md" />
              </div>
            ) : (
              <Navigate to={user ? roleHome(user.role) : '/login'} replace />
            )
          }
        />
        <Route
          path="/login"
          element={
            !authChecked ? (
              <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-10">
                <LoadingPanel label="Checking session..." className="w-full max-w-md" />
              </div>
            ) : user ? (
              <Navigate to={roleHome(user.role)} replace />
            ) : (
              <AuthPage mode="login" onSubmit={login} />
            )
          }
        />
        <Route
          path="/register"
          element={
            !authChecked ? (
              <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-10">
                <LoadingPanel label="Checking session..." className="w-full max-w-md" />
              </div>
            ) : user ? (
              <Navigate to={roleHome(user.role)} replace />
            ) : (
              <AuthPage mode="register" onSubmit={register} />
            )
          }
        />
        <Route
          path="/events"
          element={
            <ProtectedRoute token={token} authChecked={authChecked} user={user} allow={['user']}>
              <PlatformLayout user={user} logout={logout} statusMessage={statusMessage} location={location.pathname}>
                <EventsPage bootstrap={bootstrap} />
              </PlatformLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/venue-map"
          element={
            <ProtectedRoute token={token} authChecked={authChecked} user={user} allow={['user']}>
              <PlatformLayout user={user} logout={logout} statusMessage={statusMessage} location={location.pathname}>
                <VenueMapPage
                  bootstrap={bootstrap}
                  activeHold={activeHold}
                  guidance={guidance}
                  lockSeats={lockSeats}
                  releaseHold={releaseHold}
                  confirmPayment={confirmPayment}
                  paymentReceipt={paymentReceipt}
                  dismissReceipt={() => setPaymentReceipt(null)}
                />
              </PlatformLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/order-food"
          element={
            <ProtectedRoute token={token} authChecked={authChecked} user={user} allow={['user']}>
              <PlatformLayout user={user} logout={logout} statusMessage={statusMessage} location={location.pathname}>
                <OrderFoodPage bootstrap={bootstrap} latestBooking={latestBooking} placeOrder={placeOrder} />
              </PlatformLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-orders"
          element={
            <ProtectedRoute token={token} authChecked={authChecked} user={user} allow={['user']}>
              <PlatformLayout user={user} logout={logout} statusMessage={statusMessage} location={location.pathname}>
                <MyOrdersPage bootstrap={bootstrap} latestBooking={latestBooking} />
              </PlatformLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor/dashboard"
          element={
            <ProtectedRoute token={token} authChecked={authChecked} user={user} allow={['vendor']}>
              <PlatformLayout user={user} logout={logout} statusMessage={statusMessage} location={location.pathname}>
                <VendorDashboardPage token={token} updateOrder={updateVendorOrder} />
              </PlatformLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute token={token} authChecked={authChecked} user={user} allow={['admin']}>
              <PlatformLayout user={user} logout={logout} statusMessage={statusMessage} location={location.pathname}>
                <AdminDashboardPage
                  snapshot={adminSnapshot}
                  refresh={loadAdmin}
                  simulateHeatmap={simulateHeatmap}
                  updateZoneMapper={updateZoneMapper}
                />
              </PlatformLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

function ProtectedRoute({
  allow,
  authChecked,
  children,
  token,
  user,
}: {
  allow: Role[];
  authChecked: boolean;
  children: ReactElement;
  token: string | null;
  user: AppUser | null;
}) {
  if (!authChecked) return <LoadingPanel label="Checking session..." />;
  if (!token || !user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) return <Navigate to={roleHome(user.role)} replace />;
  return children;
}

function AuthPage({
  mode,
  onSubmit,
}: {
  mode: 'login' | 'register';
  onSubmit: (payload: AuthPayload) => Promise<void>;
}) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'user' as Role });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSubmit(form);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-10">
      <div className="grid w-full gap-6 rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-glow backdrop-blur xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] bg-gradient-to-br from-sky-500/20 to-emerald-500/15 p-8">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-sky-100">
            <Waves size={16} /> Full-stack venue operations MVP
          </p>
          <h1 className="max-w-xl text-4xl font-bold leading-tight text-white md:text-5xl">
            Real-time event experience platform for large-scale sports venues.
          </h1>
          <p className="mt-5 max-w-2xl text-base text-slate-200/80">
            Seat locking, heatmap-driven routing, wait times, food ordering, vendor operations, and
            admin coordination in one connected system.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <FeatureCard icon={Ticket} title="Seat locking" subtitle="10-minute checkout holds and no double booking." />
            <FeatureCard icon={Activity} title="Heatmap" subtitle="Live density, wait times, and gate recommendations." />
            <FeatureCard icon={UtensilsCrossed} title="In-seat orders" subtitle="Vendor dashboard and live order status." />
            <FeatureCard icon={Car} title="Parking flow" subtitle="Arrival guidance and pre-exit parking notifications." />
          </div>
        </div>

        <form onSubmit={submit} className="rounded-[28px] border border-white/10 bg-slate-950/60 p-8">
          <h2 className="text-2xl font-semibold text-white">{mode === 'login' ? 'Sign in' : 'Create account'}</h2>
          <p className="mt-2 text-sm text-slate-300">
            {mode === 'login'
              ? 'Demo password for all seeded accounts: password123'
              : 'Register a new account to access the platform'}
          </p>
          {mode === 'register' ? (
            <label className="mt-6 block text-sm text-slate-200">
              Full name
              <input className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
          ) : null}
          <label className="mt-4 block text-sm text-slate-200">
            Email
            <input className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="mt-4 block text-sm text-slate-200">
            Password
            <input className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </label>
          {mode === 'register' ? (
            <label className="mt-4 block text-sm text-slate-200">
              Role
              <select className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                <option value="user">User</option>
                <option value="vendor">Vendor</option>
                <option value="admin">Admin</option>
              </select>
            </label>
          ) : null}
          {error ? <p className="mt-4 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p> : null}
          <button className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-sky-400" disabled={loading}>
            {loading ? 'Working...' : mode === 'login' ? 'Sign in' : 'Create account'}
            <ArrowRight size={16} />
          </button>
          <p className="mt-5 text-sm text-slate-300">
            {mode === 'login' ? (
              <>Need an account? <Link className="text-sky-300" to="/register">Register</Link></>
            ) : (
              <>Already have an account? <Link className="text-sky-300" to="/login">Login</Link></>
            )}
          </p>
        </form>
      </div>
    </div>
  );
}

function PlatformLayout({
  children,
  location,
  logout,
  statusMessage,
  user,
}: {
  children: ReactElement;
  location: string;
  logout: () => void;
  statusMessage: string;
  user: AppUser | null;
}) {
  const userLinks = [{ href: '/events', label: 'Events' }];
  const roleLinks =
    user?.role === 'vendor'
      ? [{ href: '/vendor/dashboard', label: 'Vendor Dashboard' }]
      : user?.role === 'admin'
        ? [{ href: '/admin/dashboard', label: 'Admin Dashboard' }]
        : userLinks;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-5 md:px-6">
      <header className="sticky top-4 z-20">
        <div className="rounded-[28px] border border-white/10 bg-slate-950/30 p-1 shadow-glow backdrop-blur">
          <div className="flex flex-col gap-4 rounded-[24px] bg-white/5 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <Link to="/events" className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-sky-400/25 to-emerald-400/15 text-sky-100 ring-1 ring-white/10">
                <Waves size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/70">VenueFlow</p>
                <h1 className="text-lg font-semibold text-white md:text-xl">Smart venue orchestration</h1>
              </div>
            </Link>

            <nav className="flex flex-wrap items-center gap-2 md:justify-center">
              <div className="flex flex-wrap gap-2 rounded-full border border-white/10 bg-slate-950/40 p-1">
                {roleLinks.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      location === item.href
                        ? 'bg-sky-400 text-slate-950 shadow-[0_10px_30px_rgba(79,179,255,0.20)]'
                        : 'text-slate-100 hover:bg-white/10'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </nav>

            <div className="flex items-center justify-between gap-3 md:justify-end">
              <div className="flex items-center gap-3">
                <div className="hidden rounded-full border border-white/10 bg-slate-950/40 px-4 py-2 text-sm text-slate-200 md:block">
                  {user?.name}
                </div>
                <button
                  onClick={logout}
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-slate-950/40 p-3 text-slate-100 transition hover:bg-white/10"
                  aria-label="Log out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {statusMessage ? (
          <div className="mt-3 rounded-2xl border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100 backdrop-blur">
            {statusMessage}
          </div>
        ) : null}
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function EventsPage({ bootstrap }: { bootstrap: BootstrapPayload | null }) {
  const [query, setQuery] = useState('');
  const [activeSport, setActiveSport] = useState<string>('All');
  const now = Date.now();
  const featuredFromBootstrap = bootstrap
    ? {
        id: 'event-1',
        sport: 'Cricket',
        name: bootstrap.event.name,
        venue: bootstrap.event.venue,
        startsAt: bootstrap.event.startsAt,
        endsAt: bootstrap.event.endsAt,
      }
    : null;
  const sampleEvents = [
    ...(featuredFromBootstrap ? [featuredFromBootstrap] : []),
    { id: 'event-2', sport: 'Football', name: 'Derby Night 2026', venue: 'City Stadium', startsAt: new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString(), endsAt: new Date(now + 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString() },
    { id: 'event-3', sport: 'Baseball', name: 'Season Opener', venue: 'Downtown Ballpark', startsAt: new Date(now + 6 * 24 * 60 * 60 * 1000).toISOString(), endsAt: new Date(now + 6 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString() },
    { id: 'event-4', sport: 'Tennis', name: 'Grand Slam Qualifiers', venue: 'Riverside Courts', startsAt: new Date(now + 9 * 24 * 60 * 60 * 1000).toISOString(), endsAt: new Date(now + 9 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000).toISOString() },
    { id: 'event-5', sport: 'Basketball', name: 'All-Star Showcase', venue: 'Metropolitan Arena', startsAt: new Date(now + 12 * 24 * 60 * 60 * 1000).toISOString(), endsAt: new Date(now + 12 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString() },
    { id: 'event-6', sport: 'Hockey', name: 'Winter Classic', venue: 'Ice Dome', startsAt: new Date(now + 14 * 24 * 60 * 60 * 1000).toISOString(), endsAt: new Date(now + 14 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString() },
    { id: 'event-7', sport: 'Cricket', name: 'T20 Night Match', venue: 'Harbor Grounds', startsAt: new Date(now + 17 * 24 * 60 * 60 * 1000).toISOString(), endsAt: new Date(now + 17 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString() },
    { id: 'event-8', sport: 'Football', name: 'International Friendly', venue: 'National Park Stadium', startsAt: new Date(now + 20 * 24 * 60 * 60 * 1000).toISOString(), endsAt: new Date(now + 20 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString() },
    { id: 'event-9', sport: 'Baseball', name: 'Rivals Weekend', venue: 'Lakeside Field', startsAt: new Date(now + 24 * 24 * 60 * 60 * 1000).toISOString(), endsAt: new Date(now + 24 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString() },
  ];

  const sports = useMemo(() => {
    const unique = Array.from(new Set(sampleEvents.map((event) => event.sport))).sort();
    return ['All', ...unique];
  }, [sampleEvents]);

  const filteredEvents = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return sampleEvents.filter((event) => {
      if (activeSport !== 'All' && event.sport !== activeSport) return false;
      if (!normalized) return true;
      return (
        event.name.toLowerCase().includes(normalized) ||
        event.venue.toLowerCase().includes(normalized) ||
        event.sport.toLowerCase().includes(normalized)
      );
    });
  }, [activeSport, query, sampleEvents]);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[32px] border border-white/10 bg-white/5 backdrop-blur">
        <div className="relative px-6 py-7 sm:px-8">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-500/15 via-transparent to-emerald-500/10" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/70">Events</p>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-3xl font-semibold text-white sm:text-4xl">Pick your match night.</h2>
                <p className="mt-3 max-w-2xl text-sm text-slate-300">
                  Browse upcoming sports events and open the live venue experience with seat locking, heatmap routing, and in-seat orders.
                </p>
              </div>
              <Link
                className="inline-flex items-center justify-center rounded-full bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
                to="/venue-map"
              >
                Open venue experience
                <ArrowRight className="ml-2" size={16} />
              </Link>
            </div>

            <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-slate-300">
                  <Search size={18} />
                </div>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by event, venue, or sport..."
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/50 py-3 pl-12 pr-4 text-sm text-slate-100 placeholder:text-slate-400 focus:border-sky-300/50 focus:outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {sports.map((sport) => (
                  <button
                    key={sport}
                    onClick={() => setActiveSport(sport)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      activeSport === sport ? 'bg-sky-400 text-slate-950' : 'bg-white/5 text-slate-100 hover:bg-white/10'
                    }`}
                  >
                    {sport}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredEvents.map((event) => (
          <div
            key={event.id}
            className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-5 transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10"
          >
            <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
              <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-sky-400/10 blur-2xl" />
              <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-emerald-400/10 blur-2xl" />
            </div>

            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200">
                  {event.sport}
                </p>
                <h3 className="mt-3 text-xl font-semibold text-white">{event.name}</h3>
                <p className="mt-2 text-sm text-slate-300">{event.venue}</p>
              </div>
              <div className="rounded-2xl bg-slate-950/40 p-3 text-slate-100 transition group-hover:bg-slate-950/55">
                <Ticket size={18} />
              </div>
            </div>

            <div className="relative mt-4 grid gap-2 text-sm">
              <div className="flex items-center justify-between rounded-2xl bg-slate-950/40 px-4 py-3">
                <span className="text-slate-400">Starts</span>
                <span className="font-medium text-white">{new Date(event.startsAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-950/40 px-4 py-3">
                <span className="text-slate-400">Ends</span>
                <span className="font-medium text-white">{new Date(event.endsAt).toLocaleString()}</span>
              </div>
            </div>

            <Link
              className="relative mt-4 inline-flex w-full items-center justify-center rounded-full bg-sky-400 px-5 py-3 text-center text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
              to="/venue-map"
            >
              Open event
              <ArrowRight className="ml-2" size={16} />
            </Link>
          </div>
        ))}
      </div>

      {!filteredEvents.length ? (
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
          No events match your search. Try a different keyword or filter.
        </div>
      ) : null}
    </div>
  );
}

function FeatureCard({ icon: Icon, subtitle, title }: { icon: typeof Ticket; subtitle: string; title: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-slate-950/40 p-5">
      <div className="mb-4 inline-flex rounded-2xl bg-white/10 p-3"><Icon size={18} /></div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-300">{subtitle}</p>
    </div>
  );
}

function VenueMapPage({
  activeHold,
  bootstrap,
  confirmPayment,
  guidance,
  lockSeats,
  paymentReceipt,
  dismissReceipt,
  releaseHold,
}: {
  activeHold: Hold | null;
  bootstrap: BootstrapPayload | null;
  confirmPayment: () => Promise<void>;
  guidance: Guidance | null;
  lockSeats: (seatIds: string[]) => Promise<void>;
  paymentReceipt: { booking: Booking; guidance: Guidance } | null;
  dismissReceipt: () => void;
  releaseHold: () => Promise<void>;
}) {
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  const sections = useMemo(
    () => Array.from(new Set((bootstrap?.seats ?? []).map((seat) => seat.sectionId))),
    [bootstrap?.seats],
  );

  useEffect(() => {
    if (!selectedSection && sections[0]) setSelectedSection(sections[0]);
  }, [sections, selectedSection]);

  const visibleSeats = (bootstrap?.seats ?? []).filter((seat) => seat.sectionId === selectedSection);
  const selectedSeatObjects = useMemo(() => {
    const byId = new Map((bootstrap?.seats ?? []).map((seat) => [seat.id, seat] as const));
    return selectedSeats.map((id) => byId.get(id)).filter(Boolean) as Seat[];
  }, [bootstrap?.seats, selectedSeats]);
  const selectedTotal = useMemo(() => selectedSeatObjects.reduce((sum, seat) => sum + seat.price, 0), [selectedSeatObjects]);
  const holdCountdown = activeHold
    ? Math.max(0, Math.floor((Date.parse(activeHold.expiresAt) - Date.now()) / 1000))
    : 0;

  if (!bootstrap) return <LoadingPanel label="Loading venue state..." />;

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard
              icon={Users}
              title="Live occupancy"
              value={`${bootstrap.zones.reduce((sum, zone) => sum + zone.occupancy, 0)}`}
              caption="Across tracked zones"
            />
            <StatCard icon={Clock3} title="Fastest gate" value={guidance?.recommendedGate ?? 'Gate A'} caption="Heatmap recommendation" />
            <StatCard icon={Car} title="Parking" value={guidance?.recommendedParking ?? 'P1'} caption="Suggested zone" />
            <StatCard icon={ShieldCheck} title="Seat hold" value={activeHold ? 'Active' : 'None'} caption="10-minute lock window" />
          </div>

          <div className="overflow-hidden rounded-[32px] border border-white/10 bg-white/5 backdrop-blur">
            <div className="relative px-6 py-6 sm:px-7">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-500/10 via-transparent to-emerald-500/10" />
              <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-200/70">Venue map</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">{bootstrap.event.name}</h2>
                  <p className="mt-2 text-sm text-slate-300">
                    Select seats, lock them for checkout, and complete a dummy payment to confirm.
                  </p>
                  <p className="mt-3 text-xs text-slate-400">
                    {bootstrap.event.venue} • {new Date(bootstrap.event.startsAt).toLocaleString()}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 rounded-[24px] border border-white/10 bg-slate-950/40 p-2">
                  {sections.map((section) => (
                    <button
                      key={section}
                      onClick={() => setSelectedSection(section)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        selectedSection === section ? 'bg-sky-400 text-slate-950' : 'bg-white/5 text-slate-100 hover:bg-white/10'
                      }`}
                    >
                      {section}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-5 border-t border-white/10 p-5 lg:grid-cols-[1fr_0.9fr]">
              <SeatGrid
                seats={visibleSeats}
                selectedSeats={selectedSeats}
                activeHold={activeHold}
                onToggle={(seatId) =>
                  setSelectedSeats((current) =>
                    current.includes(seatId) ? current.filter((item) => item !== seatId) : [...current, seatId],
                  )
                }
              />
              <HeatmapPanel zones={bootstrap.zones} guidance={guidance} />
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="sticky top-28 space-y-6">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Checkout</h3>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
                  {activeHold ? 'Hold active' : 'Select seats'}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-[22px] border border-white/10 bg-slate-950/45 p-4">
                  <p className="text-sm text-slate-300">Selected seats</p>
                  <p className="mt-2 text-base font-semibold text-white">
                    {selectedSeats.length ? selectedSeats.join(', ') : 'None yet'}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-slate-400">Total</span>
                    <span className="font-semibold text-white">₹{selectedTotal}</span>
                  </div>
                </div>

                <div className="rounded-[22px] border border-white/10 bg-slate-950/45 p-4">
                  <p className="text-sm text-slate-300">Arrival guidance</p>
                  <p className="mt-2 text-sm text-slate-200">
                    Gate <span className="font-semibold text-white">{guidance?.recommendedGate ?? 'Gate A'}</span> • Parking{' '}
                    <span className="font-semibold text-white">{guidance?.recommendedParking ?? 'P1'}</span>
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    {activeHold
                      ? `Hold expires in ${Math.floor(holdCountdown / 60)}m ${holdCountdown % 60}s`
                      : 'Lock seats to start a 10-minute checkout hold.'}
                  </p>
                </div>

                {!activeHold ? (
                  <button
                    onClick={() => lockSeats(selectedSeats)}
                    disabled={!selectedSeats.length}
                    className="w-full rounded-full bg-sky-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Lock seats & start checkout
                  </button>
                ) : (
                  <div className="grid gap-3">
                    <button
                      onClick={confirmPayment}
                      className="w-full rounded-full bg-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300"
                    >
                      Confirm dummy payment
                    </button>
                    <button
                      onClick={releaseHold}
                      className="w-full rounded-full bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
                    >
                      Release hold
                    </button>
                  </div>
                )}

                <div className="rounded-[22px] border border-white/10 bg-slate-950/45 p-4">
                  <p className="text-sm font-semibold text-white">Seat status legend</p>
                  <div className="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded bg-white/10 ring-1 ring-white/10" />
                      Available
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded bg-sky-400/25 ring-1 ring-sky-300/40" />
                      Selected
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded bg-amber-500/15 ring-1 ring-amber-300/30" />
                      Locked
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded bg-white/5 ring-1 ring-white/5" />
                      Booked
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <LatestBookingCard booking={bootstrap.bookings.at(-1) ?? null} />
            <NotificationsPanel notifications={bootstrap.notifications} />
          </div>
        </aside>
      </div>

      {paymentReceipt ? (
        <Modal onClose={dismissReceipt} title="Payment confirmed">
          <div className="space-y-4">
            <div className="rounded-[22px] border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-50">
              Dummy payment succeeded. Your booking is confirmed.
            </div>
            <div className="grid gap-3">
              <div className="flex items-center justify-between rounded-[22px] border border-white/10 bg-slate-950/45 px-4 py-3">
                <span className="text-sm text-slate-300">Booking</span>
                <span className="font-semibold text-white">{paymentReceipt.booking.id.slice(0, 8)}</span>
              </div>
              <div className="flex items-center justify-between rounded-[22px] border border-white/10 bg-slate-950/45 px-4 py-3">
                <span className="text-sm text-slate-300">Seats</span>
                <span className="font-semibold text-white">{paymentReceipt.booking.seatIds.join(', ')}</span>
              </div>
              <div className="flex items-center justify-between rounded-[22px] border border-white/10 bg-slate-950/45 px-4 py-3">
                <span className="text-sm text-slate-300">Amount</span>
                <span className="font-semibold text-white">₹{paymentReceipt.booking.amount}</span>
              </div>
              <div className="flex items-center justify-between rounded-[22px] border border-white/10 bg-slate-950/45 px-4 py-3">
                <span className="text-sm text-slate-300">Gate / Parking</span>
                <span className="font-semibold text-white">
                  {paymentReceipt.booking.gate} • {paymentReceipt.booking.parkingZone}
                </span>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => {
                  dismissReceipt();
                  setSelectedSeats([]);
                }}
                className="rounded-full bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                Continue browsing
              </button>
              <Link
                to="/events"
                onClick={dismissReceipt}
                className="inline-flex items-center justify-center rounded-full bg-sky-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-sky-300"
              >
                Back to events
                <ArrowRight className="ml-2" size={16} />
              </Link>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  );
}

function OrderFoodPage({
  bootstrap,
  latestBooking,
  placeOrder,
}: {
  bootstrap: BootstrapPayload | null;
  latestBooking: Booking | null;
  placeOrder: (cart: CartItem) => Promise<void>;
}) {
  const [cart, setCart] = useState<CartItem>({});
  if (!bootstrap) return <LoadingPanel label="Loading menu..." />;

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
      <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200/70">/order-food</p>
            <h2 className="text-2xl font-semibold text-white">Mobile food & beverage ordering</h2>
          </div>
          <div className="rounded-full bg-white/5 px-4 py-2 text-sm text-slate-100">{latestBooking ? `Deliver to ${latestBooking.seatIds[0]}` : 'No active booking'}</div>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {bootstrap.menu.map((item) => (
            <div key={item.id} className="rounded-[24px] border border-white/10 bg-slate-950/50 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.category}</p>
                  <h3 className="mt-2 text-lg font-semibold text-white">{item.name}</h3>
                </div>
                <div className="rounded-2xl bg-white/5 p-3"><Coffee size={18} /></div>
              </div>
              <p className="mt-4 text-sm text-slate-300">Prep time {item.prepTime} min</p>
              <div className="mt-5 flex items-center justify-between">
                <span className="text-xl font-semibold text-white">₹{item.price}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCart((current) => ({ ...current, [item.id]: Math.max((current[item.id] ?? 0) - 1, 0) }))} className="rounded-full bg-white/5 px-3 py-2">-</button>
                  <span className="w-6 text-center">{cart[item.id] ?? 0}</span>
                  <button onClick={() => setCart((current) => ({ ...current, [item.id]: (current[item.id] ?? 0) + 1 }))} className="rounded-full bg-white/5 px-3 py-2">+</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-3">
            <ShoppingCart size={20} />
            <h3 className="text-lg font-semibold text-white">Cart summary</h3>
          </div>
          <div className="mt-4 space-y-3">
            {bootstrap.menu.filter((item) => (cart[item.id] ?? 0) > 0).map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-2xl bg-slate-950/50 px-4 py-3">
                <span>{item.name} x {cart[item.id]}</span>
                <span>₹{item.price * (cart[item.id] ?? 0)}</span>
              </div>
            ))}
          </div>
          <button onClick={() => placeOrder(cart)} disabled={!latestBooking || Object.values(cart).every((value) => value === 0)} className="mt-6 w-full rounded-full bg-emerald-400 px-5 py-3 font-semibold text-slate-950 disabled:opacity-40">
            Submit seat delivery order
          </button>
        </div>
        <LatestBookingCard booking={latestBooking} />
      </div>
    </div>
  );
}

function MyOrdersPage({ bootstrap, latestBooking }: { bootstrap: BootstrapPayload | null; latestBooking: Booking | null }) {
  if (!bootstrap) return <LoadingPanel label="Loading orders..." />;
  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-6">
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200/70">/my-orders</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Live order and booking tracking</h2>
          <div className="mt-6 space-y-4">
            {bootstrap.orders.length ? bootstrap.orders.map((order) => (
              <div key={order.id} className="rounded-[24px] border border-white/10 bg-slate-950/50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">{order.id.slice(0, 8)}</p>
                    <h3 className="text-lg font-semibold text-white">Seat {order.seatId}</h3>
                  </div>
                  <span className="rounded-full bg-white/5 px-4 py-2 text-sm">{order.status}</span>
                </div>
                <p className="mt-3 text-sm text-slate-300">Total ₹{order.total}</p>
              </div>
            )) : <p className="text-slate-300">No orders placed yet.</p>}
          </div>
        </div>
      </div>
      <div className="space-y-6">
        <LatestBookingCard booking={latestBooking} />
        <NotificationsPanel notifications={bootstrap.notifications} />
      </div>
    </div>
  );
}

function VendorDashboardPage({ token, updateOrder }: { token: string | null; updateOrder: (orderId: string, status: string) => Promise<void> }) {
  const [orders, setOrders] = useState<Order[]>([]);
  useEffect(() => {
    if (!token) return;
    request<{ orders: Order[] }>('/vendor/orders', token).then((data) => setOrders(data.orders)).catch(() => undefined);
  }, [token]);

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200/70">/vendor/dashboard</p>
      <h2 className="mt-2 text-2xl font-semibold text-white">Vendor order console</h2>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {orders.map((order) => (
          <div key={order.id} className="rounded-[24px] border border-white/10 bg-slate-950/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">{order.id.slice(0, 8)}</h3>
                <p className="text-sm text-slate-400">Seat {order.seatId}</p>
              </div>
              <span className="rounded-full bg-white/5 px-3 py-1 text-sm">{order.status}</span>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {['accepted', 'preparing', 'ready', 'rejected'].map((status) => (
                <button key={status} onClick={() => updateOrder(order.id, status)} className="rounded-full bg-white/5 px-4 py-2 text-sm">
                  {status}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminDashboardPage({
  snapshot,
  refresh,
  simulateHeatmap,
  updateZoneMapper,
}: {
  snapshot: DashboardPayload | null;
  refresh: () => Promise<void>;
  simulateHeatmap: (zoneId: string, delta: number) => Promise<void>;
  updateZoneMapper: (zoneId: string, gate: string, parkingZone: string) => Promise<void>;
}) {
  useEffect(() => {
    refresh().catch(() => undefined);
  }, []);

  if (!snapshot) return <LoadingPanel label="Loading admin dashboard..." />;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard icon={Users} title="Venue occupancy" value={`${snapshot.occupancy}`} caption={`${snapshot.totalSeats} total seats`} />
        <StatCard icon={Ticket} title="Bookings" value={`${snapshot.bookings.length}`} caption="Confirmed seats" />
        <StatCard icon={Coffee} title="Orders" value={`${snapshot.orders.length}`} caption="Live vendor queue" />
        <StatCard icon={Warehouse} title="Seat mapper" value={`${snapshot.mapper.length}`} caption="Tracked zones" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <HeatmapPanel zones={snapshot.zones} guidance={null} />
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
          <h3 className="text-xl font-semibold text-white">Seat + Gate + Parking mapper</h3>
          <div className="mt-4 space-y-3">
            {snapshot.mapper.map((zone) => (
              <div key={zone.id} className="rounded-[22px] border border-white/10 bg-slate-950/50 p-4">
                <p className="font-semibold text-white">{zone.name}</p>
                <p className="mt-1 text-sm text-slate-400">{zone.type}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => updateZoneMapper(zone.id, 'Gate A', 'P1')} className="rounded-full bg-white/5 px-4 py-2 text-sm">Gate A / P1</button>
                  <button onClick={() => updateZoneMapper(zone.id, 'Gate B', 'P2')} className="rounded-full bg-white/5 px-4 py-2 text-sm">Gate B / P2</button>
                  <button onClick={() => updateZoneMapper(zone.id, 'Gate C', 'P3')} className="rounded-full bg-white/5 px-4 py-2 text-sm">Gate C / P3</button>
                  <button onClick={() => simulateHeatmap(zone.id, 25)} className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950">Simulate inflow</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SeatGrid({
  activeHold,
  onToggle,
  seats,
  selectedSeats,
}: {
  activeHold: Hold | null;
  onToggle: (seatId: string) => void;
  seats: Seat[];
  selectedSeats: string[];
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-slate-950/60 p-5">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Select your seats</h3>
          <p className="mt-1 text-sm text-slate-300">Tap to select. Locked/booked seats are unavailable.</p>
        </div>
        <span className="w-fit rounded-full bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-300">
          Seat locking via Redis TTL
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6">
        {seats.map((seat) => {
          const disabled = seat.status === 'booked' || (seat.status === 'locked' && !selectedSeats.includes(seat.id));
          return (
            <button
              key={seat.id}
              onClick={() => onToggle(seat.id)}
              disabled={disabled || Boolean(activeHold)}
              className={`rounded-2xl border px-3 py-4 text-left transition focus:outline-none focus:ring-2 focus:ring-sky-300/40 ${
                selectedSeats.includes(seat.id)
                  ? 'border-sky-300 bg-sky-400/20'
                  : seat.status === 'booked'
                    ? 'border-white/5 bg-white/5 text-slate-500'
                    : seat.status === 'locked'
                      ? 'border-amber-300/30 bg-amber-500/10 text-amber-100'
                      : 'border-white/10 bg-white/5 hover:border-sky-300/40 hover:bg-white/10'
              }`}
            >
              <p className="text-xs text-slate-300">
                Row {seat.row} • Seat {seat.number}
              </p>
              <p className="mt-2 text-sm font-semibold text-white">{seat.sectionId}-{seat.row}{seat.number}</p>
              <p className="mt-1 text-xs text-slate-400">₹{seat.price}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Modal({
  children,
  onClose,
  title,
}: {
  children: ReactElement;
  onClose: () => void;
  title: string;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/80 shadow-glow">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/10"
          >
            Close
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function HeatmapPanel({ zones, guidance }: { zones: Zone[]; guidance: Guidance | null }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-slate-950/60 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Crowd density heatmap</h3>
        <MapPin size={18} />
      </div>
      <div className="mt-4 grid gap-3">
        {zones.map((zone) => (
          <div key={zone.id} className="rounded-[22px] border border-white/10 bg-white/5 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-white">{zone.name}</p>
                <p className="text-sm text-slate-400">{zone.type} • {zone.gate} • {zone.parkingZone}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${zone.score > 0.8 ? 'bg-rose-500/20 text-rose-200' : zone.score > 0.6 ? 'bg-amber-500/20 text-amber-100' : 'bg-emerald-500/20 text-emerald-100'}`}>
                {Math.round(zone.score * 100)}%
              </span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white/5">
              <div className={`h-2 rounded-full ${zone.score > 0.8 ? 'bg-rose-400' : zone.score > 0.6 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min(zone.score * 100, 100)}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-between text-sm text-slate-300">
              <span>{zone.occupancy}/{zone.capacity} people</span>
              <span>{zone.waitTime} min wait</span>
            </div>
          </div>
        ))}
      </div>
      {guidance ? <div className="mt-4 rounded-[22px] border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-50">{guidance.message}</div> : null}
    </div>
  );
}

function NotificationsPanel({ notifications }: { notifications: Notification[] }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
      <div className="flex items-center gap-3">
        <Bell size={18} />
        <h3 className="text-lg font-semibold text-white">Notifications</h3>
      </div>
      <div className="mt-4 space-y-3">
        {notifications.length ? notifications.map((item) => (
          <div key={item.id} className="rounded-[22px] border border-white/10 bg-slate-950/50 p-4">
            <p className="font-medium text-white">{item.message}</p>
            <p className="mt-2 text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
          </div>
        )) : <p className="text-sm text-slate-300">No notifications yet.</p>}
      </div>
    </div>
  );
}

function LatestBookingCard({ booking }: { booking: Booking | null }) {
  if (!booking) {
    return (
      <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
        <div className="flex items-center gap-3"><Ticket size={18} /><h3 className="text-lg font-semibold text-white">Latest booking</h3></div>
        <p className="mt-4 text-sm text-slate-300">No confirmed booking yet. Lock seats and complete checkout in the venue map.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
      <div className="flex items-center gap-3"><CheckCircle2 size={18} /><h3 className="text-lg font-semibold text-white">Latest booking</h3></div>
      <div className="mt-4 grid gap-3">
        <BookingMeta icon={Armchair} label="Seats" value={booking.seatIds.join(', ')} />
        <BookingMeta icon={MapPin} label="Gate" value={booking.gate} />
        <BookingMeta icon={Car} label="Parking" value={booking.parkingZone} />
        <BookingMeta icon={Clock3} label="Status" value={booking.status} />
      </div>
    </div>
  );
}

function BookingMeta({ icon: Icon, label, value }: { icon: typeof Ticket; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-[22px] border border-white/10 bg-slate-950/50 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-white/5 p-2"><Icon size={16} /></div>
        <span className="text-sm text-slate-300">{label}</span>
      </div>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

function StatCard({ caption, icon: Icon, title, value }: { caption: string; icon: typeof Ticket; title: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-300">{title}</p>
        <div className="rounded-2xl bg-white/5 p-3"><Icon size={18} /></div>
      </div>
      <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{caption}</p>
    </div>
  );
}

function LoadingPanel({ className = '', label }: { className?: string; label: string }) {
  return (
    <div className={`grid min-h-[320px] w-full place-items-center rounded-[28px] border border-white/10 bg-white/5 text-slate-200 ${className}`}>
      {label}
    </div>
  );
}

export default App;
