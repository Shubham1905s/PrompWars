import { useEffect, useMemo, useState, type FormEvent, type ReactElement } from 'react';
import { io } from 'socket.io-client';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Bell,
  Calendar,
  Car,
  CheckCircle2,
  ChevronRight,
  Coffee,
  Crown,
  Eye,
  EyeOff,
  Flame,
  Info,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Map as MapIcon,
  MapPin,
  Menu,
  Navigation,
  Search,
  Settings,
  ShoppingCart,
  Sparkles,
  Ticket,
  UserPlus,
  Users,
  Waves,
  Warehouse,
  X,
} from 'lucide-react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

// Firebase imports
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, type User, updateProfile } from 'firebase/auth';

// Firebase config - REPLACE WITH YOUR FIREBASE CONFIG FROM CONSOLE
const firebaseConfig = {
  apiKey: "AIzaSyDw-B67Kh5PkLxuS5XTJDiwkXtzbpLS4Sw",
  authDomain: "promptwars-f22dc.firebaseapp.com",
  projectId: "promptwars-f22dc",
  storageBucket: "promptwars-f22dc.firebasestorage.app",
  messagingSenderId: "720960866733",
  appId: "1:720960866733:web:420f41a9862db63f837924",
  measurementId: "G-MBTKBQPMJ8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

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

const productionBackend = 'https://prompwars.onrender.com';
const defaultOrigin = import.meta.env.VITE_API_URL
  ? undefined
  : import.meta.env.DEV
    ? 'http://localhost:5000'
    : productionBackend;

const API_URL = import.meta.env.VITE_API_URL ?? `${defaultOrigin}/api`;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? defaultOrigin;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = 10000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const authToken = await auth.currentUser?.getIdToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    signal: init?.signal ?? controller.signal,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
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
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [bootstrap, setBootstrap] = useState<BootstrapPayload | null>(null);
  const [activeHold, setActiveHold] = useState<Hold | null>(null);
  const [guidance, setGuidance] = useState<Guidance | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [adminSnapshot, setAdminSnapshot] = useState<DashboardPayload | null>(null);
  const [paymentReceipt, setPaymentReceipt] = useState<{ booking: Booking; guidance: Guidance } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        // Set user from Firebase
        setUser({
          id: user.uid,
          email: user.email!,
          name: user.displayName || user.email!.split('@')[0],
          role: 'user' // Default role, can be updated later
        });
      } else {
        setUser(null);
        setBootstrap(null);
        setGuidance(null);
      }
      setAuthChecked(true);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!firebaseUser || !user || user.role !== 'user') return;
    request<BootstrapPayload>('/bootstrap')
      .then((data) => {
        setBootstrap(data);
        setGuidance(data.guidance);
      })
      .catch((error: Error) => setStatusMessage(error.message));
  }, [firebaseUser, user]);

  useEffect(() => {
    if (!firebaseUser || !user) return;

    const getToken = async () => {
      const token = await firebaseUser.getIdToken();
      return token;
    };

    getToken().then((token) => {
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
    });
  }, [firebaseUser, user]);

  const latestBooking = bootstrap?.bookings.at(-1) ?? null;

  const login = async (payload: AuthPayload) => {
    try {
      await signInWithEmailAndPassword(auth, payload.email, payload.password);
      navigate(roleHome(user?.role || 'user'));
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  };

  const register = async (payload: AuthPayload) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, payload.email, payload.password);
      // Update display name
      await updateProfile(userCredential.user, { displayName: payload.name });
      navigate(roleHome(user?.role || 'user'));
    } catch (error: any) {
      throw new Error(error.message || 'Registration failed');
    }
  };

  const logout = () => {
    signOut(auth);
    setBootstrap(null);
    setActiveHold(null);
    setAuthChecked(true);
    navigate('/login');
  };

  const refreshUserData = async () => {
    if (!firebaseUser || !user || user.role !== 'user') return;
    const data = await request<BootstrapPayload>('/bootstrap');
    setBootstrap(data);
    setGuidance(data.guidance);
  };

  const lockSeats = async (seatIds: string[]) => {
    if (!firebaseUser) return;
    const result = await request<{ guidance: Guidance; hold: Hold }>('/bookings/lock', {
      method: 'POST',
      body: JSON.stringify({ seatIds }),
    });
    setActiveHold(result.hold);
    setGuidance(result.guidance);
    setStatusMessage(`Seats locked for 10 minutes. Suggested arrival: ${result.guidance.recommendedGate}.`);
  };

  const releaseHold = async () => {
    if (!firebaseUser || !activeHold) return;
    await request('/bookings/release', {
      method: 'POST',
      body: JSON.stringify({ holdId: activeHold.id }),
    });
    setActiveHold(null);
    await refreshUserData();
  };

  const confirmPayment = async () => {
    if (!firebaseUser || !activeHold) return;
    const result = await request<{ booking: Booking; guidance: Guidance }>('/payments/checkout', {
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
    if (!firebaseUser || !latestBooking || !bootstrap) return;
    const items = Object.entries(cart).map(([itemId, quantity]) => ({ itemId, quantity }));
    const result = await request<{ order: Order }>('/orders', {
      method: 'POST',
      body: JSON.stringify({ bookingId: latestBooking.id, items }),
    });
    setBootstrap({ ...bootstrap, orders: [...bootstrap.orders, result.order] });
    setStatusMessage('Food order sent to the vendor dashboard.');
  };

  const updateVendorOrder = async (orderId: string, status: string) => {
    if (!firebaseUser) return;
    await request(`/vendor/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  };

  const loadAdmin = async () => {
    if (!firebaseUser || user?.role !== 'admin') return;
    const result = await request<DashboardPayload>('/admin/dashboard');
    setAdminSnapshot(result);
  };

  useEffect(() => {
    if (firebaseUser && user?.role === 'admin') {
      loadAdmin().catch((error: Error) => setStatusMessage(error.message));
    }
  }, [firebaseUser, user]);

  const updateZoneMapper = async (zoneId: string, gate: string, parkingZone: string) => {
    if (!firebaseUser) return;
    const result = await request<{ zones: Zone[] }>(`/admin/zones/${zoneId}`, {
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
    if (!firebaseUser) return;
    const result = await request<{ zones: Zone[] }>('/admin/heatmap-event', {
      method: 'POST',
      body: JSON.stringify({ zoneId, delta }),
    });
    setAdminSnapshot((current) => (current ? { ...current, zones: result.zones } : current));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
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
            <ProtectedRoute firebaseUser={firebaseUser} authChecked={authChecked} user={user} allow={['user']}>
              <PlatformLayout user={user} logout={logout} statusMessage={statusMessage} location={location.pathname}>
                <EventsPage bootstrap={bootstrap} />
              </PlatformLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/venue-map"
          element={
            <ProtectedRoute firebaseUser={firebaseUser} authChecked={authChecked} user={user} allow={['user']}>
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
            <ProtectedRoute firebaseUser={firebaseUser} authChecked={authChecked} user={user} allow={['user']}>
              <PlatformLayout user={user} logout={logout} statusMessage={statusMessage} location={location.pathname}>
                <OrderFoodPage bootstrap={bootstrap} latestBooking={latestBooking} placeOrder={placeOrder} />
              </PlatformLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-orders"
          element={
            <ProtectedRoute firebaseUser={firebaseUser} authChecked={authChecked} user={user} allow={['user']}>
              <PlatformLayout user={user} logout={logout} statusMessage={statusMessage} location={location.pathname}>
                <MyOrdersPage bootstrap={bootstrap} latestBooking={latestBooking} />
              </PlatformLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vendor/dashboard"
          element={
            <ProtectedRoute firebaseUser={firebaseUser} authChecked={authChecked} user={user} allow={['vendor']}>
              <PlatformLayout user={user} logout={logout} statusMessage={statusMessage} location={location.pathname}>
                <VendorDashboardPage firebaseUser={firebaseUser} updateOrder={updateVendorOrder} />
              </PlatformLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute firebaseUser={firebaseUser} authChecked={authChecked} user={user} allow={['admin']}>
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
  firebaseUser,
  user,
}: {
  allow: Role[];
  authChecked: boolean;
  children: ReactElement;
  firebaseUser: User | null;
  user: AppUser | null;
}) {
  if (!authChecked) return <LoadingPanel label="Checking session..." />;
  if (!firebaseUser || !user) return <Navigate to="/login" replace />;
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
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=2070')] bg-cover bg-center opacity-10"></div>
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-6 py-10">
        <div className="grid w-full gap-8 rounded-3xl bg-white/10 backdrop-blur-xl shadow-2xl overflow-hidden xl:grid-cols-[1.2fr_0.8fr] border border-white/20">
          <div className="relative p-8 lg:p-12 bg-gradient-to-br from-purple-600/20 to-pink-600/20">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-3 mb-6 px-4 py-2 bg-white/20 rounded-full backdrop-blur-sm">
                <Waves className="text-purple-300" size={20} />
                <span className="text-sm font-semibold text-purple-100">Premium Venue Experience</span>
              </div>

              <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Where Every
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"> Moment </span>
                Matters
              </h1>

              <p className="text-xl text-purple-100 mb-8 leading-relaxed">
                Experience seamless event booking, real-time seat selection, and premium in-venue services all in one platform.
              </p>

              <div className="grid gap-4 mb-8">
                <div className="flex items-center gap-3 text-purple-100">
                  <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center">
                    <Sparkles size={16} />
                  </div>
                  <span>Real-time seat availability & locking</span>
                </div>
                <div className="flex items-center gap-3 text-purple-100">
                  <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center">
                    <Flame size={16} />
                  </div>
                  <span>Live crowd heatmaps & smart routing</span>
                </div>
                <div className="flex items-center gap-3 text-purple-100">
                  <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center">
                    <Crown size={16} />
                  </div>
                  <span>In-seat food & beverage ordering</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-purple-200">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 border-2 border-white/20 flex items-center justify-center text-xs font-bold">
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <span>Trusted by 10,000+ fans</span>
              </div>
            </div>
          </div>

          <div className="p-8 lg:p-12">
            <form onSubmit={submit} className="space-y-6">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">
                  {mode === 'login' ? 'Welcome Back' : 'Join the Experience'}
                </h2>
                <p className="text-purple-200">
                  {mode === 'login'
                    ? 'Sign in to access your personalized venue experience'
                    : 'Create your account and get exclusive access'}
                </p>
              </div>

              {mode === 'register' && (
                <div className="group">
                  <label className="block text-sm font-medium text-purple-200 mb-2">Full Name</label>
                  <div className="relative">
                    <UserPlus className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-300" size={18} />
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all"
                      placeholder="Enter your full name"
                      required={mode === 'register'}
                    />
                  </div>
                </div>
              )}

              <div className="group">
                <label className="block text-sm font-medium text-purple-200 mb-2">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-300" size={18} />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div className="group">
                <label className="block text-sm font-medium text-purple-200 mb-2">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-300" size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-300 hover:text-purple-100 transition"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {mode === 'register' && (
                <div className="group">
                  <label className="block text-sm font-medium text-purple-200 mb-2">Account Type</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 transition-all cursor-pointer"
                  >
                    <option value="user" className="bg-slate-800">🎫 Event Fan</option>
                    <option value="vendor" className="bg-slate-800">🍽️ Food Vendor</option>
                    <option value="admin" className="bg-slate-800">👑 Venue Admin</option>
                  </select>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200 text-sm">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" size={20} />
                    <span>Processing...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRight size={18} />
                  </div>
                )}
              </button>

              <p className="text-center text-sm text-purple-200">
                {mode === 'login' ? (
                  <>
                    Don't have an account?{' '}
                    <Link to="/register" className="text-purple-300 hover:text-purple-100 font-semibold transition">
                      Sign up for free
                    </Link>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <Link to="/login" className="text-purple-300 hover:text-purple-100 font-semibold transition">
                      Sign in
                    </Link>
                  </>
                )}
              </p>

              {mode === 'login' && (
                <p className="text-center text-xs text-purple-300/70">
                  Demo credentials: any seeded account with password "password123"
                </p>
              )}
            </form>
          </div>
        </div>
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: '/events', label: 'Events', icon: Calendar },
    { href: '/venue-map', label: 'Venue Map', icon: MapIcon },
    { href: '/order-food', label: 'Order Food', icon: Coffee },
    { href: '/my-orders', label: 'My Orders', icon: ShoppingCart }
  ];

  const vendorItems = [
    { href: '/vendor/dashboard', label: 'Vendor Dashboard', icon: Warehouse }
  ];

  const adminItems = [
    { href: '/admin/dashboard', label: 'Admin Dashboard', icon: Settings }
  ];

  const navigationItems = user?.role === 'vendor' ? vendorItems :
    user?.role === 'admin' ? adminItems :
      navItems;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse delay-1000"></div>
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-5 md:px-6">
        <header className="sticky top-4 z-20">
          <div className="rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4">
              <Link to="/events" className="flex items-center gap-3 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur-lg opacity-50 group-hover:opacity-75 transition"></div>
                  <div className="relative w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                    <Waves size={20} className="text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-purple-300">VenueFlow</p>
                  <h1 className="text-lg font-bold text-white">Premium Venue Experience</h1>
                </div>
              </Link>

              <nav className="hidden md:flex items-center gap-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.href;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${isActive
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                          : 'text-purple-100 hover:bg-white/10'
                        }`}
                    >
                      <Icon size={16} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="flex items-center gap-3">
                <div className="hidden md:flex items-center gap-3 px-3 py-2 rounded-xl bg-white/10">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">
                      {user?.name?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-white">{user?.name}</span>
                </div>

                <button
                  onClick={logout}
                  className="p-2 rounded-xl bg-white/10 text-purple-100 hover:bg-white/20 transition-all"
                >
                  <LogOut size={18} />
                </button>

                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 rounded-xl bg-white/10 text-purple-100"
                >
                  {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
              </div>
            </div>

            {mobileMenuOpen && (
              <div className="md:hidden border-t border-white/10 p-4 space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.href;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${isActive
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                          : 'text-purple-100 hover:bg-white/10'
                        }`}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
                <div className="pt-3 mt-3 border-t border-white/10">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                      <span className="text-sm font-bold text-white">{user?.name?.charAt(0) || 'U'}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{user?.name}</p>
                      <p className="text-xs text-purple-300">{user?.email}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {statusMessage && (
            <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 backdrop-blur-sm animate-in slide-in-from-top duration-300">
              <div className="flex items-center gap-2">
                <Info size={16} className="text-purple-300" />
                <p className="text-sm text-purple-100">{statusMessage}</p>
              </div>
            </div>
          )}
        </header>

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

function EventsPage({ bootstrap }: { bootstrap: BootstrapPayload | null }) {
  const [query, setQuery] = useState('');
  const [activeSport, setActiveSport] = useState<string>('All');
  const navigate = useNavigate();
  const now = Date.now();

  const featuredFromBootstrap = bootstrap
    ? {
      id: 'event-1',
      sport: 'Cricket',
      name: bootstrap.event.name,
      venue: bootstrap.event.venue,
      startsAt: bootstrap.event.startsAt,
      endsAt: bootstrap.event.endsAt,
      image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?q=80&w=2067',
      price: '₹2,499',
      tickets: 1243,
    }
    : null;

  const sampleEvents = [
    ...(featuredFromBootstrap ? [featuredFromBootstrap] : []),
    { id: 'event-2', sport: 'Football', name: 'Champions League Final', venue: 'City Stadium', startsAt: new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString(), endsAt: new Date(now + 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(), image: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=2070', price: '₹3,999', tickets: 2341 },
    { id: 'event-3', sport: 'Baseball', name: 'World Series Opener', venue: 'Downtown Ballpark', startsAt: new Date(now + 6 * 24 * 60 * 60 * 1000).toISOString(), endsAt: new Date(now + 6 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(), image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=2070', price: '₹2,199', tickets: 876 },
    { id: 'event-4', sport: 'Tennis', name: 'Grand Slam Finals', venue: 'Riverside Courts', startsAt: new Date(now + 9 * 24 * 60 * 60 * 1000).toISOString(), endsAt: new Date(now + 9 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000).toISOString(), image: 'https://images.unsplash.com/photo-1622279457486-62d1194a0b0d?q=80&w=2070', price: '₹1,899', tickets: 543 },
    { id: 'event-5', sport: 'Basketball', name: 'NBA All-Star Game', venue: 'Metropolitan Arena', startsAt: new Date(now + 12 * 24 * 60 * 60 * 1000).toISOString(), endsAt: new Date(now + 12 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(), image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=2070', price: '₹4,499', tickets: 3210 },
    { id: 'event-6', sport: 'Hockey', name: 'Winter Classic', venue: 'Ice Dome', startsAt: new Date(now + 14 * 24 * 60 * 60 * 1000).toISOString(), endsAt: new Date(now + 14 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(), image: 'https://images.unsplash.com/photo-1515705576963-95dd6294b3e7?q=80&w=2070', price: '₹2,799', tickets: 987 },
    { id: 'event-7', sport: 'Cricket', name: 'T20 World Cup', venue: 'Harbor Grounds', startsAt: new Date(now + 17 * 24 * 60 * 60 * 1000).toISOString(), endsAt: new Date(now + 17 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString(), image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?q=80&w=2067', price: '₹3,299', tickets: 1543 },
    { id: 'event-8', sport: 'Football', name: 'Derby Match', venue: 'National Park Stadium', startsAt: new Date(now + 20 * 24 * 60 * 60 * 1000).toISOString(), endsAt: new Date(now + 20 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(), image: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?q=80&w=2070', price: '₹5,999', tickets: 876 },
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

  const featuredEvent = filteredEvents[0];

  const handleGetTickets = () => {
    navigate('/venue-map');
  };

  return (
    <div className="space-y-8">
      {featuredEvent && (
        <div className="relative rounded-2xl overflow-hidden group cursor-pointer" onClick={handleGetTickets}>
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent z-10"></div>
          <img
            src={featuredEvent.image}
            alt={featuredEvent.name}
            className="w-full h-[400px] object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 z-20 flex flex-col justify-end p-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-xs font-bold text-white">
                FEATURED EVENT
              </span>
              <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs text-white">
                {featuredEvent.sport}
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-3">{featuredEvent.name}</h2>
            <p className="text-purple-200 mb-4">{featuredEvent.venue} • {new Date(featuredEvent.startsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            <div className="flex items-center gap-4">
              <button
                onClick={handleGetTickets}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105"
              >
                Get Tickets
                <ArrowRight size={18} />
              </button>
              <div className="flex items-center gap-2 text-white">
                <Users size={18} />
                <span>{featuredEvent.tickets.toLocaleString()} tickets sold</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-purple-300" size={20} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search events by name, venue, or sport..."
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-purple-300 focus:outline-none focus:border-purple-400 transition-all"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
            {sports.map((sport) => (
              <button
                key={sport}
                onClick={() => setActiveSport(sport)}
                className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all ${activeSport === sport
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                    : 'bg-white/10 text-purple-100 hover:bg-white/20'
                  }`}
              >
                {sport}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredEvents.slice(1).map((event) => (
          <div
            key={event.id}
            className="group relative bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden hover:shadow-2xl transition-all transform hover:-translate-y-1 cursor-pointer"
            onClick={() => navigate('/venue-map')}
          >
            <div className="relative h-48 overflow-hidden">
              <img
                src={event.image}
                alt={event.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute top-4 right-4 px-3 py-1 bg-black/50 backdrop-blur-sm rounded-full text-xs font-bold text-white">
                {event.sport}
              </div>
            </div>

            <div className="p-5">
              <h3 className="text-xl font-bold text-white mb-2">{event.name}</h3>
              <div className="flex items-center gap-2 text-purple-200 text-sm mb-3">
                <MapPin size={14} />
                <span>{event.venue}</span>
              </div>
              <div className="flex items-center gap-2 text-purple-200 text-sm mb-4">
                <Calendar size={14} />
                <span>{new Date(event.startsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-2xl font-bold text-white">{event.price}</p>
                  <p className="text-xs text-purple-300">per ticket</p>
                </div>
                <div className="flex items-center gap-1 text-purple-300">
                  <Users size={14} />
                  <span className="text-sm">{event.tickets} tickets</span>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/venue-map');
                }}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all"
              >
                Select Seats
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {!filteredEvents.length && (
        <div className="text-center py-12 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20">
          <p className="text-purple-200">No events match your search criteria.</p>
        </div>
      )}
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
  const navigate = useNavigate();

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

  if (!bootstrap) return <LoadingPanel label="Loading venue experience..." />;

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5">
              <div className="flex items-center justify-between mb-3">
                <Users className="text-purple-300" size={20} />
                <span className="text-xs text-purple-300">Live</span>
              </div>
              <p className="text-2xl font-bold text-white">{bootstrap.zones.reduce((sum, zone) => sum + zone.occupancy, 0)}</p>
              <p className="text-sm text-purple-200">Current Occupancy</p>
            </div>
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5">
              <div className="flex items-center justify-between mb-3">
                <Navigation className="text-purple-300" size={20} />
                <span className="text-xs text-purple-300">Recommended</span>
              </div>
              <p className="text-2xl font-bold text-white">{guidance?.recommendedGate ?? 'Gate A'}</p>
              <p className="text-sm text-purple-200">Fastest Entry Gate</p>
            </div>
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5">
              <div className="flex items-center justify-between mb-3">
                <Car className="text-purple-300" size={20} />
                <span className="text-xs text-purple-300">Suggested</span>
              </div>
              <p className="text-2xl font-bold text-white">{guidance?.recommendedParking ?? 'P1'}</p>
              <p className="text-sm text-purple-200">Parking Zone</p>
            </div>
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5">
              <div className="flex items-center justify-between mb-3">
                <Lock className="text-purple-300" size={20} />
                <span className="text-xs text-purple-300">Status</span>
              </div>
              <p className="text-2xl font-bold text-white">{activeHold ? 'Active' : 'None'}</p>
              <p className="text-sm text-purple-200">Seat Hold</p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white">{bootstrap.event.name}</h2>
                  <p className="text-purple-200 mt-1">{bootstrap.event.venue} • {new Date(bootstrap.event.startsAt).toLocaleString()}</p>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {sections.map((section) => (
                    <button
                      key={section}
                      onClick={() => setSelectedSection(section)}
                      className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all ${selectedSection === section
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                          : 'bg-white/10 text-purple-100 hover:bg-white/20'
                        }`}
                    >
                      {section}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-6 p-6 lg:grid-cols-[1fr_0.9fr]">
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
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Checkout</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${activeHold ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
                  }`}>
                  {activeHold ? 'Hold Active' : 'Select Seats'}
                </span>
              </div>

              <div className="space-y-4">
                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-sm text-purple-200 mb-2">Selected Seats</p>
                  <p className="text-lg font-semibold text-white">
                    {selectedSeats.length ? selectedSeats.join(', ') : 'None selected'}
                  </p>
                  <div className="mt-3 pt-3 border-t border-white/10 flex justify-between">
                    <span className="text-purple-200">Total Amount</span>
                    <span className="text-xl font-bold text-white">₹{selectedTotal}</span>
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-sm text-purple-200 mb-2">Smart Guidance</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-purple-300">Recommended Gate:</span>
                      <span className="text-white font-semibold">{guidance?.recommendedGate ?? 'Gate A'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-purple-300">Parking Zone:</span>
                      <span className="text-white font-semibold">{guidance?.recommendedParking ?? 'P1'}</span>
                    </div>
                    {activeHold && (
                      <div className="mt-2 pt-2 border-t border-white/10">
                        <p className="text-xs text-purple-300">
                          Hold expires in {Math.floor(holdCountdown / 60)}m {holdCountdown % 60}s
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {!activeHold ? (
                  <button
                    onClick={() => lockSeats(selectedSeats)}
                    disabled={!selectedSeats.length}
                    className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Lock Seats & Start Checkout
                  </button>
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={confirmPayment}
                      className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all"
                    >
                      Confirm Payment
                    </button>
                    <button
                      onClick={releaseHold}
                      className="w-full py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all"
                    >
                      Release Hold
                    </button>
                  </div>
                )}

                <div className="bg-white/5 rounded-xl p-4">
                  <p className="text-sm font-semibold text-white mb-3">Seat Legend</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-green-500/30 border border-green-400/50"></div>
                      <span className="text-purple-200">Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-purple-500/30 border border-purple-400/50"></div>
                      <span className="text-purple-200">Selected</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-yellow-500/30 border border-yellow-400/50"></div>
                      <span className="text-purple-200">Locked</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-red-500/30 border border-red-400/50"></div>
                      <span className="text-purple-200">Booked</span>
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

      {paymentReceipt && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-gradient-to-br from-slate-900 to-purple-900 rounded-2xl border border-white/20 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h3 className="text-xl font-bold text-white">Payment Successful!</h3>
              <button onClick={dismissReceipt} className="p-2 rounded-xl bg-white/10 text-purple-100 hover:bg-white/20 transition-all">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="text-center">
                <div className="inline-flex p-3 bg-green-500/20 rounded-full mb-4">
                  <CheckCircle2 className="text-green-400" size={32} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Booking Confirmed!</h3>
                <p className="text-purple-200">Your seats have been successfully booked.</p>
              </div>

              <div className="bg-white/5 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-purple-300">Booking ID:</span>
                  <span className="text-white font-mono">{paymentReceipt.booking.id.slice(0, 8)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-purple-300">Seats:</span>
                  <span className="text-white font-semibold">{paymentReceipt.booking.seatIds.join(', ')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-purple-300">Amount Paid:</span>
                  <span className="text-white font-semibold">₹{paymentReceipt.booking.amount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-purple-300">Gate/Parking:</span>
                  <span className="text-white">{paymentReceipt.booking.gate} • {paymentReceipt.booking.parkingZone}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    dismissReceipt();
                    setSelectedSeats([]);
                  }}
                  className="flex-1 py-2.5 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-all"
                >
                  Continue Browsing
                </button>
                <button
                  onClick={() => {
                    dismissReceipt();
                    navigate('/events');
                  }}
                  className="flex-1 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all"
                >
                  Back to Events
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const navigate = useNavigate();

  if (!bootstrap) return <LoadingPanel label="Loading menu..." />;

  const categories = useMemo(() => {
    const cats = Array.from(new Set(bootstrap.menu.map(item => item.category)));
    return ['All', ...cats];
  }, [bootstrap.menu]);

  const filteredMenu = useMemo(() => {
    if (selectedCategory === 'All') return bootstrap.menu;
    return bootstrap.menu.filter(item => item.category === selectedCategory);
  }, [selectedCategory, bootstrap.menu]);

  const cartTotal = useMemo(() => {
    return bootstrap.menu.reduce((sum, item) => sum + (item.price * (cart[item.id] || 0)), 0);
  }, [cart, bootstrap.menu]);

  const handlePlaceOrder = async () => {
    if (!latestBooking) {
      alert('Please book seats first before placing a food order');
      navigate('/venue-map');
      return;
    }
    await placeOrder(cart);
    setCart({});
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Food & Beverage</h2>
          <p className="text-purple-200">Order from your seat and we'll deliver right to you</p>
          {!latestBooking && (
            <div className="mt-3 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-xl">
              <p className="text-sm text-yellow-200">⚠️ You need an active booking to place food orders. Please select seats first.</p>
              <button onClick={() => navigate('/venue-map')} className="mt-2 text-sm text-purple-300 hover:text-purple-100 underline">
                Go to Venue Map →
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all ${selectedCategory === category
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                  : 'bg-white/10 text-purple-100 hover:bg-white/20'
                }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {filteredMenu.map((item) => (
            <div key={item.id} className="bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-white">{item.name}</h3>
                  <p className="text-xs text-purple-300">Prep: {item.prepTime} min</p>
                </div>
                <div className="text-lg font-bold text-white">₹{item.price}</div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-purple-200">{item.category}</span>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCart(prev => ({ ...prev, [item.id]: Math.max((prev[item.id] || 0) - 1, 0) }))}
                    className="w-8 h-8 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all"
                    disabled={!latestBooking}
                  >
                    -
                  </button>
                  <span className="text-white font-semibold min-w-[20px] text-center">{cart[item.id] || 0}</span>
                  <button
                    onClick={() => setCart(prev => ({ ...prev, [item.id]: (prev[item.id] || 0) + 1 }))}
                    className="w-8 h-8 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-all"
                    disabled={!latestBooking}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 sticky top-28">
          <div className="flex items-center gap-3 mb-4">
            <ShoppingCart className="text-purple-300" size={24} />
            <h3 className="text-xl font-bold text-white">Your Order</h3>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto mb-4">
            {bootstrap.menu.filter(item => (cart[item.id] || 0) > 0).map((item) => (
              <div key={item.id} className="flex justify-between items-center py-2 border-b border-white/10">
                <div>
                  <p className="text-white font-medium">{item.name}</p>
                  <p className="text-xs text-purple-300">x{cart[item.id]}</p>
                </div>
                <span className="text-white font-semibold">₹{item.price * (cart[item.id] || 0)}</span>
              </div>
            ))}
            {Object.values(cart).every(v => v === 0) && (
              <p className="text-purple-200 text-center py-8">Your cart is empty</p>
            )}
          </div>

          {Object.values(cart).some(v => v > 0) && (
            <>
              <div className="pt-4 border-t border-white/10 mb-4">
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-white">Total</span>
                  <span className="text-white">₹{cartTotal}</span>
                </div>
              </div>
              <button
                onClick={handlePlaceOrder}
                disabled={!latestBooking}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Place Order
              </button>
              {!latestBooking && (
                <p className="text-xs text-yellow-300 text-center mt-2">
                  Need an active booking to place food orders
                </p>
              )}
            </>
          )}
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
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
        <h2 className="text-2xl font-bold text-white mb-2">My Orders</h2>
        <p className="text-purple-200 mb-6">Track your food orders and bookings</p>

        <div className="space-y-4">
          {bootstrap.orders.length > 0 ? (
            bootstrap.orders.map((order) => (
              <div key={order.id} className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-mono text-purple-300">{order.id.slice(0, 8)}</p>
                    <h3 className="font-semibold text-white">Seat {order.seatId}</h3>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${order.status === 'delivered' ? 'bg-green-500/20 text-green-300' :
                      order.status === 'preparing' ? 'bg-yellow-500/20 text-yellow-300' :
                        'bg-purple-500/20 text-purple-300'
                    }`}>
                    {order.status}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-purple-300">Total</span>
                  <span className="text-white font-semibold">₹{order.total}</span>
                </div>
                <div className="flex justify-between text-xs text-purple-300 mt-2">
                  <span>{new Date(order.createdAt).toLocaleString()}</span>
                  <span>{order.items.length} items</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-purple-200">No orders yet</p>
              <Link to="/order-food" className="inline-block mt-4 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all">
                Browse Menu
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <LatestBookingCard booking={latestBooking} />
        <NotificationsPanel notifications={bootstrap.notifications} />
      </div>
    </div>
  );
}

function VendorDashboardPage({ firebaseUser, updateOrder }: { firebaseUser: User | null; updateOrder: (orderId: string, status: string) => Promise<void> }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!firebaseUser) return;
    request<{ orders: Order[] }>('/vendor/orders')
      .then((data) => setOrders(data.orders))
      .catch(() => undefined);
  }, [firebaseUser]);

  const filteredOrders = orders.filter(order => filter === 'all' || order.status === filter);
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    completed: orders.filter(o => o.status === 'delivered').length,
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5">
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-sm text-purple-200">Total Orders</p>
        </div>
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5">
          <p className="text-2xl font-bold text-yellow-300">{stats.pending}</p>
          <p className="text-sm text-purple-200">Pending</p>
        </div>
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5">
          <p className="text-2xl font-bold text-purple-300">{stats.preparing}</p>
          <p className="text-sm text-purple-200">Preparing</p>
        </div>
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5">
          <p className="text-2xl font-bold text-green-300">{stats.completed}</p>
          <p className="text-sm text-purple-200">Completed</p>
        </div>
      </div>

      <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Order Management</h2>
          <div className="flex gap-2">
            {['all', 'pending', 'preparing', 'delivered'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-xl capitalize transition-all ${filter === status
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    : 'bg-white/10 text-purple-100 hover:bg-white/20'
                  }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <div key={order.id} className="bg-white/5 rounded-xl p-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-purple-300">{order.id.slice(0, 8)}</span>
                    <span className="text-white">Seat {order.seatId}</span>
                  </div>
                  <div className="text-sm text-purple-200">
                    {order.items.length} items • ₹{order.total}
                  </div>
                </div>

                <div className="flex gap-2">
                  {['accepted', 'preparing', 'ready', 'delivered', 'rejected'].map((status) => (
                    <button
                      key={status}
                      onClick={() => updateOrder(order.id, status)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${order.status === status
                          ? 'bg-purple-500 text-white'
                          : 'bg-white/10 text-purple-100 hover:bg-white/20'
                        }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <p className="text-purple-200">No orders found</p>
            </div>
          )}
        </div>
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
  }, [refresh]);

  if (!snapshot) return <LoadingPanel label="Loading admin dashboard..." />;

  const stats = {
    occupancyRate: Math.round((snapshot.occupancy / snapshot.totalSeats) * 100),
    activeHolds: snapshot.holds.length,
    totalRevenue: snapshot.bookings.reduce((sum, b) => sum + b.amount, 0),
    avgOrderValue: snapshot.orders.length ? Math.round(snapshot.orders.reduce((sum, o) => sum + o.total, 0) / snapshot.orders.length) : 0,
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5">
          <p className="text-2xl font-bold text-white">{stats.occupancyRate}%</p>
          <p className="text-sm text-purple-200">Occupancy Rate</p>
          <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: `${stats.occupancyRate}%` }}></div>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5">
          <p className="text-2xl font-bold text-white">{snapshot.bookings.length}</p>
          <p className="text-sm text-purple-200">Confirmed Bookings</p>
        </div>
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5">
          <p className="text-2xl font-bold text-white">₹{stats.totalRevenue.toLocaleString()}</p>
          <p className="text-sm text-purple-200">Total Revenue</p>
        </div>
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-5">
          <p className="text-2xl font-bold text-white">{stats.activeHolds}</p>
          <p className="text-sm text-purple-200">Active Holds</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <HeatmapPanel zones={snapshot.zones} guidance={null} />

        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
          <h3 className="text-xl font-bold text-white mb-4">Zone Management</h3>
          <div className="space-y-3">
            {snapshot.mapper.map((zone) => (
              <div key={zone.id} className="bg-white/5 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-white">{zone.name}</h4>
                    <p className="text-xs text-purple-300">{zone.type}</p>
                  </div>
                  <span className="text-xs text-purple-300">ID: {zone.id.slice(0, 6)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="text-sm">
                    <p className="text-purple-300">Gate</p>
                    <p className="text-white font-semibold">{zone.gate || 'Not set'}</p>
                  </div>
                  <div className="text-sm">
                    <p className="text-purple-300">Parking</p>
                    <p className="text-white font-semibold">{zone.parkingZone || 'Not set'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => updateZoneMapper(zone.id, 'Gate A', 'P1')} className="px-3 py-1.5 text-xs bg-white/10 text-purple-100 rounded-lg hover:bg-white/20 transition-all">
                    Set Gate A/P1
                  </button>
                  <button onClick={() => updateZoneMapper(zone.id, 'Gate B', 'P2')} className="px-3 py-1.5 text-xs bg-white/10 text-purple-100 rounded-lg hover:bg-white/20 transition-all">
                    Set Gate B/P2
                  </button>
                  <button onClick={() => updateZoneMapper(zone.id, 'Gate C', 'P3')} className="px-3 py-1.5 text-xs bg-white/10 text-purple-100 rounded-lg hover:bg-white/20 transition-all">
                    Set Gate C/P3
                  </button>
                  <button onClick={() => simulateHeatmap(zone.id, 25)} className="px-3 py-1.5 text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all">
                    Simulate +25
                  </button>
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
  const availableCount = useMemo(() => seats.filter((seat) => seat.status === 'available').length, [seats]);
  const bookedCount = useMemo(() => seats.filter((seat) => seat.status === 'booked').length, [seats]);

  return (
    <div className="bg-white/5 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-white">Select Your Seats</h3>
          <p className="text-sm text-purple-300">{availableCount} available • {bookedCount} booked</p>
        </div>
        <div className="text-xs text-purple-300 bg-white/10 px-3 py-1 rounded-full">
          {activeHold ? 'Hold Active' : 'Select seats to lock'}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6">
        {seats.map((seat) => {
          const isSelected = selectedSeats.includes(seat.id);
          const isBooked = seat.status === 'booked';
          const isLocked = seat.status === 'locked' && !isSelected;
          const isDisabled = isBooked || isLocked || !!activeHold;

          let bgColor = 'bg-white/5 hover:bg-white/10';
          let borderColor = 'border-white/10';
          let textColor = 'text-white';

          if (isSelected) {
            bgColor = 'bg-gradient-to-r from-purple-500 to-pink-500';
            borderColor = 'border-purple-400';
            textColor = 'text-white';
          } else if (isBooked) {
            bgColor = 'bg-red-500/20';
            borderColor = 'border-red-500/30';
            textColor = 'text-red-300';
          } else if (isLocked) {
            bgColor = 'bg-yellow-500/20';
            borderColor = 'border-yellow-500/30';
            textColor = 'text-yellow-300';
          }

          return (
            <button
              key={seat.id}
              onClick={() => onToggle(seat.id)}
              disabled={isDisabled}
              className={`p-3 rounded-xl border ${borderColor} ${bgColor} ${textColor} transition-all text-left ${!isDisabled && !isSelected ? 'hover:scale-105' : ''} disabled:cursor-not-allowed`}
            >
              <div className="text-xs font-mono">{seat.row}{seat.number}</div>
              <div className="text-xs mt-1">₹{seat.price}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function HeatmapPanel({ zones, guidance }: { zones: Zone[]; guidance: Guidance | null }) {
  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">Live Crowd Density</h3>
        <Activity className="text-purple-300" size={20} />
      </div>

      <div className="space-y-4">
        {zones.map((zone) => {
          const densityClass = zone.score > 0.7 ? 'from-red-500 to-orange-500' :
            zone.score > 0.4 ? 'from-yellow-500 to-orange-500' :
              'from-green-500 to-emerald-500';
          const densityText = zone.score > 0.7 ? 'High' : zone.score > 0.4 ? 'Medium' : 'Low';

          return (
            <div key={zone.id} className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-white">{zone.name}</h4>
                  <p className="text-xs text-purple-300">{zone.type}</p>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-semibold ${zone.score > 0.7 ? 'text-red-300' : zone.score > 0.4 ? 'text-yellow-300' : 'text-green-300'
                    }`}>
                    {densityText} Density
                  </div>
                  <div className="text-xs text-purple-300">{zone.waitTime} min wait</div>
                </div>
              </div>

              <div className="mb-2">
                <div className="flex justify-between text-xs text-purple-300 mb-1">
                  <span>Occupancy</span>
                  <span>{zone.occupancy}/{zone.capacity}</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${densityClass} rounded-full transition-all duration-500`}
                    style={{ width: `${(zone.occupancy / zone.capacity) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <MapPin size={12} className="text-purple-300" />
                  <span className="text-purple-300">{zone.gate || 'Gate not set'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Car size={12} className="text-purple-300" />
                  <span className="text-purple-300">{zone.parkingZone || 'Parking not set'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {guidance && (
        <div className="mt-4 p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30">
          <div className="flex items-start gap-3">
            <Sparkles className="text-purple-300 mt-0.5" size={16} />
            <div>
              <p className="text-sm font-semibold text-white">Smart Recommendation</p>
              <p className="text-xs text-purple-200">{guidance.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationsPanel({ notifications }: { notifications: Notification[] }) {
  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
      <div className="flex items-center gap-3 mb-4">
        <Bell className="text-purple-300" size={20} />
        <h3 className="text-xl font-bold text-white">Notifications</h3>
      </div>

      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {notifications.length > 0 ? (
          notifications.map((item) => (
            <div key={item.id} className="bg-white/5 rounded-xl p-3">
              <p className="text-sm text-white">{item.message}</p>
              <p className="text-xs text-purple-300 mt-1">{new Date(item.createdAt).toLocaleString()}</p>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <Bell size={32} className="text-purple-300/50 mx-auto mb-2" />
            <p className="text-purple-200 text-sm">No new notifications</p>
          </div>
        )}
      </div>
    </div>
  );
}

function LatestBookingCard({ booking }: { booking: Booking | null }) {
  if (!booking) {
    return (
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Ticket className="text-purple-300" size={20} />
          <h3 className="text-xl font-bold text-white">Latest Booking</h3>
        </div>
        <div className="text-center py-6">
          <p className="text-purple-200 text-sm">No active bookings</p>
          <Link to="/venue-map" className="inline-block mt-3 text-sm text-purple-300 hover:text-purple-100 transition">
            Book your first seats →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
      <div className="flex items-center gap-3 mb-4">
        <CheckCircle2 className="text-green-400" size={20} />
        <h3 className="text-xl font-bold text-white">Latest Booking</h3>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center py-2 border-b border-white/10">
          <span className="text-purple-300">Seats</span>
          <span className="text-white font-semibold">{booking.seatIds.join(', ')}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-white/10">
          <span className="text-purple-300">Gate</span>
          <span className="text-white">{booking.gate}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-white/10">
          <span className="text-purple-300">Parking</span>
          <span className="text-white">{booking.parkingZone}</span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-purple-300">Amount</span>
          <span className="text-white font-bold">₹{booking.amount}</span>
        </div>
      </div>
    </div>
  );
}

function LoadingPanel({ className = '', label }: { className?: string; label: string }) {
  return (
    <div className={`flex flex-col items-center justify-center min-h-[400px] ${className}`}>
      <div className="relative">
        <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Waves className="text-purple-400" size={24} />
        </div>
      </div>
      <p className="mt-4 text-purple-200">{label}</p>
    </div>
  );
}

export default App;