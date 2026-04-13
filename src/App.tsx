import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './store';
import { 
  Users, MapPin, Zap, 
  ChevronRight, CreditCard, Ticket as TicketIcon, 
  Navigation, Coffee, User as UserIcon, LogIn,
  ArrowLeft, Smartphone, Activity, AlertTriangle,
  Clock, Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';

// --- SHARED COMPONENTS ---
const Header = ({ onBack, title }: { onBack?: () => void, title?: string }) => (
  <nav className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
    <div className="flex items-center gap-4">
      {onBack && <button onClick={onBack} className="glass p-2"><ArrowLeft size={18} /></button>}
      <div className="logo-icon"><Zap size={20} color="white" fill="white" /></div>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 900 }}>{title || 'VenueSync'}</h1>
    </div>
    <button className="glass p-2"><UserIcon size={18} /></button>
  </nav>
);

// --- SCREEN 1: LOGIN ---
const LoginScreen = ({ onLogin }: { onLogin: () => void }) => {
  const { checkEmail, signupOTP, verifySignup, login: loginApi, loginGoogle } = useApp();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [mode, setMode] = useState<'email' | 'login' | 'signup' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');
    const exists = await checkEmail(email);
    setLoading(false);
    if (exists) {
      setMode('login');
    } else {
      setMode('signup');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const success = await loginApi(email, password);
    setLoading(false);
    if (success) onLogin();
    else setError('Invalid password. Please try again.');
  };

  const handleSignupNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const success = await signupOTP(email);
    setLoading(false);
    if (success) setMode('otp');
    else setError('Failed to send verification code.');
  };

  const handleVerifySignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const success = await verifySignup({ email, otp, password, name });
    setLoading(false);
    if (success) onLogin();
    else setError('Invalid code. Please check your email.');
  };

  return (
    <div className="flex flex-col gap-8 py-12">
      <div className="text-center">
        <div className="logo-icon mx-auto mb-6" style={{ width: 80, height: 80 }}><Zap size={40} color="white" fill="white" /></div>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 900 }}>Venue<span style={{ color: 'var(--accent-primary)' }}>Sync</span></h2>
        <p style={{ color: 'var(--text-muted)' }}>Professional Stadium & Crowd Management</p>
      </div>

      <div className="glass" style={{ maxWidth: '400px', margin: '0 auto', width: '100%' }}>
        {mode === 'email' && (
          <form onSubmit={handleEmailNext} className="flex flex-col gap-4">
            <h3 className="text-xl font-bold mb-2">Sign In</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Enter your email to get started.</p>
            <input 
              className="search-bar" 
              placeholder="Email Address" 
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            {error && <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>{error}</p>}
            <button type="submit" className="primary py-4" disabled={loading}>
              {loading ? 'Checking...' : 'Continue'}
            </button>

            <div className="flex items-center gap-4 my-2 opacity-50">
               <div className="flex-grow h-[1px] bg-white"></div>
               <span className="text-[10px] font-bold">OR</span>
               <div className="flex-grow h-[1px] bg-white"></div>
            </div>

            <div className="flex justify-center">
              <GoogleLogin 
                onSuccess={async (res) => {
                  if (res.credential) {
                    const ok = await loginGoogle(res.credential);
                    if (ok) onLogin();
                    else setError('Google Login Failed');
                  }
                }}
                onError={() => setError('Google Login Error')}
                width="340"
              />
            </div>
          </form>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <h3 className="text-xl font-bold mb-2">Welcome Back</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Enter password for <strong>{email}</strong></p>
            <input 
              className="search-bar" 
              placeholder="Password" 
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            {error && <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>{error}</p>}
            <button type="submit" disabled={loading} className="primary py-4">
              {loading ? 'LOGGING IN...' : 'LOGIN'}
            </button>
            <button type="button" onClick={() => setMode('email')} className="text-sm text-blue-400 mt-2">Use different account</button>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignupNext} className="flex flex-col gap-4">
            <h3 className="text-xl font-bold mb-2">Create Account</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>New user detected. Please provide your details.</p>
            <input 
              className="search-bar" 
              placeholder="Full Name" 
              required
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <input 
              className="search-bar" 
              placeholder="New Password" 
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            {error && <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>{error}</p>}
            <button type="submit" disabled={loading} className="primary py-4">
              {loading ? 'SENDING OTP...' : 'SIGN UP & GET CODE'}
            </button>
            <button type="button" onClick={() => setMode('email')} className="text-sm text-blue-400 mt-2">Back</button>
          </form>
        )}

        {mode === 'otp' && (
          <form onSubmit={handleVerifySignup} className="flex flex-col gap-4">
            <h3 className="text-xl font-bold mb-2">Verify Email</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>We've sent a code to <strong>{email}</strong></p>
            <input 
              className="search-bar text-center text-2xl tracking-[1rem]" 
              placeholder="000000" 
              maxLength={6}
              value={otp}
              onChange={e => setOtp(e.target.value)}
            />
            {error && <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>{error}</p>}
            <button type="submit" disabled={loading} className="primary py-4">
              {loading ? 'VERIFYING...' : 'COMPLETE SIGNUP'}
            </button>
          </form>
        )}
      </div>
      
      <div className="flex justify-center gap-8 mt-4">
         <div className="text-center">
            <Shield size={20} className="mx-auto mb-2 text-blue-500" />
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Secure Auth</p>
         </div>
         <div className="text-center">
            <Activity size={20} className="mx-auto mb-2 text-purple-500" />
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Real-time Sync</p>
         </div>
         <div className="text-center">
            <Users size={20} className="mx-auto mb-2 text-pink-500" />
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Crowd Analytics</p>
         </div>
      </div>
    </div>
  );
};

// --- MANAGER DASHBOARD ---
const ManagerDashboard = () => {
  const { queueTimes, safetyLogs, currentUser, logout, updateQueueTime } = useApp();
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  return (
    <div className="flex flex-col gap-6">
      <nav className="flex justify-between items-center glass">
        <div className="flex items-center gap-4">
          <div className="logo-icon"><Zap size={20} /></div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 900 }}>COMMAND CENTER</h1>
            <p style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', fontWeight: 800 }}>LIVE SYSTEM TIME: {time}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="badge badge-blue">OFFICER: {currentUser?.name}</span>
          <button onClick={logout} className="glass p-2 hover:bg-red-500/20"><LogIn size={18} /></button>
        </div>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 flex flex-col gap-6">
           <StadiumMap />
           
           <div className="grid grid-cols-3 gap-4">
              <div className="glass border-l-4 border-blue-500">
                <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>TOTAL ATTENDEES</p>
                <h3 className="text-2xl font-black">42,850</h3>
                <p style={{ fontSize: '0.6rem', color: '#10b981' }}>LIVE UPDATING...</p>
              </div>
              <div className="glass border-l-4 border-orange-500">
                <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>SYSTEM STATUS</p>
                <h3 className="text-2xl font-black">ACTIVE</h3>
                <p style={{ fontSize: '0.6rem', color: '#10b981' }}>All systems nominal</p>
              </div>
              <div className="glass border-l-4 border-purple-500">
                <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>STAFF ON SITE</p>
                <h3 className="text-2xl font-black">124</h3>
                <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>4 Medics deployed</p>
              </div>
           </div>
        </div>

        <div className="flex flex-col gap-6">
           <div className="glass flex flex-col gap-4">
              <h3 className="flex items-center gap-2 font-bold text-sm"><Activity size={16} /> GATE CONTROL</h3>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Manually override or monitor gate pressure.</p>
              {queueTimes.map(q => (
                <div key={q.area} className="flex flex-col gap-2 p-2 bg-slate-900/50 rounded-lg">
                  <div className="flex justify-between text-[0.7rem]">
                    <span className="font-bold">{q.area}</span>
                    <span style={{ color: q.status === 'CONGESTED' ? '#ef4444' : '#10b981' }}>{q.waitMinutes}m</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => updateQueueTime(q.area, Math.max(0, q.waitMinutes - 1))} className="glass p-1 px-3 text-xs">-</button>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', flexGrow: 1, alignSelf: 'center' }}>
                      <div style={{ height: '100%', width: `${Math.min(q.waitMinutes * 5, 100)}%`, background: q.status === 'CONGESTED' ? '#ef4444' : '#3b82f6', transition: 'width 0.3s ease' }} />
                    </div>
                    <button onClick={() => updateQueueTime(q.area, q.waitMinutes + 1)} className="glass p-1 px-3 text-xs">+</button>
                  </div>
                </div>
              ))}
           </div>

           <div className="glass">
              <h3 className="flex items-center gap-2 font-bold text-sm mb-4"><Shield size={16} /> INCIDENT LOG</h3>
              <div className="flex flex-col gap-4">
                {safetyLogs.map(log => (
                  <div key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                    <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{log.time} • {log.officer}</p>
                    <p style={{ fontSize: '0.75rem' }}>{log.message}</p>
                  </div>
                ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

// --- VENDOR DASHBOARD ---
const VendorDashboard = () => {
  const { orders, logout, currentUser } = useApp();
  
  return (
    <div className="flex flex-col gap-6">
      <nav className="flex justify-between items-center glass">
        <div className="flex items-center gap-4">
          <div className="logo-icon bg-orange-500"><Coffee size={20} /></div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 900 }}>VENDOR KITCHEN</h1>
            <p style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', fontWeight: 800 }}>LIVE ORDERS • {currentUser?.name}</p>
          </div>
        </div>
        <button onClick={logout} className="glass p-2 hover:bg-red-500/20"><LogIn size={18} /></button>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {orders.length === 0 ? (
          <div className="glass col-span-full py-20 text-center opacity-50">
             <Coffee size={40} className="mx-auto mb-4" />
             <p>No active orders in the queue.</p>
          </div>
        ) : (
          orders.map(order => (
            <div key={order.id} className="glass flex flex-col gap-4 border-l-4 border-orange-500">
               <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-black text-lg">{order.id}</h3>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SEAT: {order.seatId}</p>
                  </div>
                  <span className="badge badge-orange">{order.status}</span>
               </div>
               
               <div className="bg-slate-900/50 p-3 rounded-lg flex flex-col gap-2">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                       <span>{(item as any).name || item.itemId}</span>
                       <span className="opacity-50">x{item.quantity}</span>
                    </div>
                  ))}
               </div>

               <div className="flex gap-2">
                  <button 
                    onClick={() => updateOrderStatus(order.id, 'PREPARING')} 
                    className="primary flex-grow py-2 text-xs"
                    disabled={order.status === 'PREPARING'}
                  >
                    {order.status === 'PREPARING' ? 'COOKING...' : 'PREPARE'}
                  </button>
                  <button 
                    onClick={() => updateOrderStatus(order.id, 'DELIVERED')} 
                    className="glass flex-grow py-2 text-xs"
                  >
                    READY
                  </button>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// --- SCREEN 2: EVENT DISCOVERY ---
const DiscoveryScreen = ({ onSelectEvent, onBack }: { onSelectEvent: (id: string) => void, onBack: () => void }) => {
  const { events, currentUser, logout } = useApp();
  const [timeLeft, setTimeLeft] = useState('04:12:05');

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const parts = prev.split(':').map(Number);
        let [h, m, s] = parts;
        if (s > 0) s--;
        else if (m > 0) { m--; s = 59; }
        else if (h > 0) { h--; m = 59; s = 59; }
        return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex justify-between items-center glass">
        <div className="flex items-center gap-4">
           <div className="logo-icon"><Zap size={20} /></div>
           <h1 style={{ fontSize: '1rem', fontWeight: 900 }}>Hello, {currentUser?.name || 'Guest'}</h1>
        </div>
        <div className="flex items-center gap-4">
           <div className="glass flex items-center gap-2 py-1 px-3" style={{ borderRadius: '2rem' }}>
              <Clock size={14} className="text-orange-500" />
              <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>LIVE: {timeLeft}</span>
           </div>
           <button onClick={logout} className="glass p-2 hover:bg-red-500/20"><LogIn size={18} /></button>
        </div>
      </nav>
      
      <div className="flex flex-col gap-2">
         <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Upcoming Matches</h2>
         <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Experience the stadium atmosphere with real-time crowd navigation.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {events.map(event => (
        <motion.div 
          key={event.id}
          whileHover={{ scale: 1.02, y: -5 }}
          onClick={() => onSelectEvent(event.id)}
          className="glass cursor-pointer glow-hover"
          style={{ padding: 0, overflow: 'hidden' }}
        >
          <div style={{ height: '180px', overflow: 'hidden', position: 'relative' }}>
             <img src={event.image} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
             <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--bg-dark), transparent)' }} />
             <span className="badge badge-blue" style={{ position: 'absolute', top: 12, left: 12 }}>{event.category}</span>
          </div>
          <div style={{ padding: '1.5rem' }}>
            <div className="flex justify-between items-center">
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{event.title}</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{event.date}</span>
            </div>
            <p style={{ color: 'var(--accent-primary)', fontWeight: 600, marginTop: '0.5rem' }}>
              {event.teams[0]} vs {event.teams[1]}
            </p>
          </div>
        </motion.div>
      ))}
      </div>
    </div>
  );
};

// --- SCREEN 3: SEAT SELECTION ---
const SeatSelectionScreen = ({ eventId, onConfirm, onBack }: { eventId: string, onConfirm: (bookingId: string) => void, onBack: () => void }) => {
  const { seats, lockSeat, unlockSeat, bookSeats } = useApp();
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSeatClick = (id: string) => {
    if (selectedSeats.includes(id)) {
      unlockSeat(id);
      setSelectedSeats(prev => prev.filter(s => s !== id));
    } else {
      if (lockSeat(id)) {
        setSelectedSeats(prev => [...prev, id]);
      }
    }
  };

  const handleBook = async () => {
    if (selectedSeats.length === 0) return;
    setIsProcessing(true);
    const bookingId = await bookSeats(eventId, selectedSeats);
    setIsProcessing(false);
    if (bookingId) onConfirm(bookingId);
  };

  return (
    <div className="flex flex-col gap-6">
      <Header onBack={onBack} title="Select Seats" />
      <div className="glass" style={{ padding: '2rem 1rem', textAlign: 'center' }}>
        <div style={{ width: '80%', height: '4px', background: 'var(--accent-primary)', margin: '0 auto 2rem', borderRadius: '4px', opacity: 0.5 }}>FIELD / STAGE</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '8px' }}>
          {seats.filter(s => s.section === 'A').map(seat => (
            <button 
              key={seat.id}
              disabled={seat.isBooked && !selectedSeats.includes(seat.id)}
              onClick={() => handleSeatClick(seat.id)}
              style={{ 
                aspectRatio: '1', 
                borderRadius: '4px',
                background: seat.isBooked ? '#1e293b' : (selectedSeats.includes(seat.id) ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)'),
                border: selectedSeats.includes(seat.id) ? '2px solid white' : '1px solid rgba(255,255,255,0.1)',
                fontSize: '0.5rem',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {seat.id}
            </button>
          ))}
        </div>
      </div>
      <div className="glass flex justify-between items-center">
        <div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{selectedSeats.length} Seats Selected</p>
          <p style={{ fontWeight: 800 }}>{selectedSeats.join(', ') || 'None'}</p>
        </div>
        <button onClick={handleBook} disabled={selectedSeats.length === 0 || isProcessing} className="primary">
          {isProcessing ? 'PROCESSING...' : 'PROCEED TO PAY'}
        </button>
      </div>
    </div>
  );
};

// --- SCREEN 4: PAYMENT ---
const PaymentScreen = ({ bookingId, onComplete, onBack }: { bookingId: string, onComplete: () => void, onBack: () => void }) => {
  const { confirmBooking } = useApp();
  
  const handlePayment = () => {
    confirmBooking(bookingId);
    onComplete();
  };

  return (
    <div className="flex flex-col gap-8 text-center pt-8">
      <Header onBack={onBack} title="Checkout" />
      <div className="stat-icon" style={{ margin: '0 auto' }}><CreditCard size={32} /></div>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Secure Checkout</h2>
        <p style={{ color: 'var(--text-muted)' }}>Select your preferred payment method</p>
      </div>
      <div className="flex flex-col gap-4">
        {['Apple Pay', 'Google Pay', 'Stripe / Credit Card'].map(m => (
          <button key={m} onClick={handlePayment} className="glass py-4 font-bold flex justify-between px-6 hover:bg-slate-800 transition-colors">
            {m} <ChevronRight size={18} />
          </button>
        ))}
      </div>
    </div>
  );
};

// --- SCREEN 5: TICKET PASSPORT ---
const TicketScreen = ({ bookingId, onEnter, onBack }: { bookingId: string, onEnter: () => void, onBack: () => void }) => {
  const { bookings, seats, currentUser } = useApp();
  const booking = bookings.find(b => b.id === bookingId);
  const seat = seats.find(s => s.id === booking?.seatIds[0]);

  if (!booking) return null;

  return (
    <div className="flex flex-col gap-8">
      <Header title="Your Digital Pass" onBack={onBack} />
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass" 
        style={{ padding: 0, overflow: 'hidden' }}
      >
        <div style={{ padding: '2rem', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', textAlign: 'center' }}>
          <TicketIcon size={48} color="white" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontWeight: 900, letterSpacing: '0.1em' }}>MATCH DAY ADMIT</h2>
        </div>
        <div style={{ padding: '2rem' }}>
          <div className="grid grid-cols-2 gap-8">
            <div><p className="badge badge-blue">SEATS</p><h3 style={{ fontSize: '1.25rem', fontWeight: 900 }}>{booking.seatIds.join(', ')}</h3></div>
            <div><p className="badge badge-orange">GATE</p><h3 style={{ fontSize: '1.25rem', fontWeight: 900 }}>{seat?.gate}</h3></div>
            <div><p className="badge badge-green">PARKING</p><h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{seat?.parking}</h3></div>
            <div><p className="badge">SEC</p><h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{seat?.section}</h3></div>
          </div>
          <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '1rem', border: '1px dashed rgba(255,255,255,0.1)', textAlign: 'center' }}>
             <p style={{ fontSize: '0.75rem', fontWeight: 600 }}>{currentUser?.name}'s Holder ID: TX-9921</p>
          </div>
        </div>
      </motion.div>
      <div className="glass bg-blue-500/10 border-blue-500/20 text-center">
        <p style={{ fontSize: '0.875rem' }}>It's match day! High density detected near Gate 2.</p>
        <button onClick={onEnter} className="primary w-full mt-4">START NAVIGATION</button>
      </div>
    </div>
  );
};

// --- STADIUM MAP COMPONENT ---
const StadiumMap = () => {
  const { queueTimes } = useApp();
  
  // Find specific gate wait times for the heatmap
  const gate2Wait = queueTimes.find(q => q.area === 'Gate 2 Entrance')?.waitMinutes || 0;
  const concourseWait = queueTimes.find(q => q.area === 'Main Concourse')?.waitMinutes || 0;

  return (
  <div className="glass map-container" style={{ height: '350px', background: '#020617', position: 'relative', overflow: 'hidden' }}>
     {/* STADIUM STRUCTURE */}
     <svg viewBox="0 0 300 300" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {/* Outer Perimeter */}
        <rect x="30" y="30" width="240" height="240" rx="60" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        {/* Stands (Inner Ring) */}
        <rect x="70" y="70" width="160" height="160" rx="30" fill="none" stroke="rgba(59, 130, 246, 0.2)" strokeWidth="20" />
        {/* Field */}
        <rect x="110" y="110" width="80" height="80" rx="5" fill="rgba(16, 185, 129, 0.1)" stroke="#10b981" strokeWidth="1" />
        <line x1="110" y1="150" x2="190" y2="150" stroke="#10b981" strokeWidth="0.5" />
        <circle cx="150" cy="150" r="15" fill="none" stroke="#10b981" strokeWidth="0.5" />
     </svg>
     
     {/* DYNAMIC HEATMAP BLOBS */}
     <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="heatmap-blob" 
        style={{ 
          top: '25%', left: '35%', 
          width: 60 + concourseWait, height: 60 + concourseWait, 
          background: concourseWait > 10 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.3)' 
        }} 
     />
     <motion.div 
        animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="heatmap-blob" 
        style={{ 
          top: '50%', right: '5%', 
          width: 40 + gate2Wait, height: 40 + gate2Wait, 
          background: gate2Wait > 20 ? 'rgba(239, 68, 68, 0.5)' : 'rgba(59, 130, 246, 0.2)' 
        }} 
     />
     
     {/* NAVIGATION PATH */}
     <svg viewBox="0 0 300 300" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <motion.path 
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          d="M 150 40 L 150 100 L 220 150" 
          stroke="var(--accent-primary)" 
          fill="none" 
          strokeWidth="3" 
          strokeDasharray="8,8" 
        />
     </svg>
     
     {/* GATES */}
     <div className="gate-marker" style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)' }}>G1</div>
     <div className="gate-marker" style={{ position: 'absolute', bottom: '10%', left: '50%', transform: 'translateX(-50%)' }}>G3</div>
     <div className="gate-marker" style={{ position: 'absolute', top: '50%', left: '10%', transform: 'translateY(-50%)' }}>G4</div>
     <div className="gate-marker" style={{ position: 'absolute', top: '50%', right: '10%', transform: 'translateY(-50%)' }}>G2</div>

     {/* LEGEND */}
     <div style={{ position: 'absolute', bottom: 10, left: 10, pointerEvents: 'none' }}>
        <p className="text-[10px] font-black opacity-30 uppercase tracking-widest mb-1">Live Stadium Density</p>
        <div className="flex gap-2">
           <div className="flex items-center gap-1"><div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} /> <span className="text-[8px] opacity-50">FLUID</span></div>
           <div className="flex items-center gap-1"><div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} /> <span className="text-[8px] opacity-50">BUSY</span></div>
           <div className="flex items-center gap-1"><div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} /> <span className="text-[8px] opacity-50">HEAVY</span></div>
        </div>
     </div>
     
     {/* MARKERS */}
     <div style={{ position: 'absolute', top: '10%', left: '46%', color: 'var(--accent-primary)' }} className="pulse">
       <div className="flex items-center gap-1 glass p-1 px-2" style={{ borderRadius: '2rem', fontSize: '0.6rem', border: '1px solid var(--accent-primary)' }}>
          <Smartphone size={10} /> <span>YOU</span>
       </div>
     </div>
     
     <div style={{ position: 'absolute', top: '50%', left: '70%', color: 'var(--accent-tertiary)' }}>
       <div className="flex items-center gap-1 glass p-1 px-2" style={{ borderRadius: '2rem', fontSize: '0.6rem', border: '1px solid var(--accent-tertiary)' }}>
          <MapPin size={10} /> <span>SEAT</span>
       </div>
     </div>
  </div>
);
};

// --- SCREEN 6: IN-VENUE EXPERIENCE ---
const InVenueExperience = ({ onBack }: { onBack: () => void }) => {
  const [activeTab, setActiveTab] = useState<'map' | 'food' | 'status' | 'pass'>('pass');
  const { placeOrder, queueTimes, safetyLogs } = useApp();

  return (
    <div className="flex flex-col gap-6">
      <Header title="Venue Live" onBack={onBack} />
      <nav className="flex justify-around glass p-1" style={{ borderRadius: '1rem' }}>
         <button onClick={() => setActiveTab('map')} className={activeTab === 'map' ? 'tab-active' : 'tab-inactive'}><MapPin size={20} /></button>
         <button onClick={() => setActiveTab('food')} className={activeTab === 'food' ? 'tab-active' : 'tab-inactive'}><Coffee size={20} /></button>
         <button onClick={() => setActiveTab('status')} className={activeTab === 'status' ? 'tab-active' : 'tab-inactive'}><Activity size={20} /></button>
      </nav>
      
      <div className="flex gap-4 border-b border-white/10 mb-6 overflow-x-auto">
        <button onClick={() => setActiveTab('pass')} className={`pb-2 px-2 text-sm font-bold ${activeTab === 'pass' ? 'border-b-2 border-accent-primary' : 'opacity-50' }`}>MY PASS</button>
        <button onClick={() => setActiveTab('status')} className={`pb-2 px-2 text-sm font-bold ${activeTab === 'status' ? 'border-b-2 border-accent-primary' : 'opacity-50' }`}>NAVIGATE</button>
        <button onClick={() => setActiveTab('food')} className={`pb-2 px-2 text-sm font-bold ${activeTab === 'food' ? 'border-b-2 border-accent-primary' : 'opacity-50' }`}>FOOD</button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'pass' && (
           <motion.div key="pass" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
              <div className="glass bg-white p-6 flex flex-col items-center gap-4 text-slate-900 shadow-2xl overflow-hidden relative" style={{ borderRadius: '24px' }}>
                 <div className="flex justify-between w-full items-start mb-4">
                    <div>
                      <h4 className="text-xs font-black opacity-40 uppercase">Global Champions Cup</h4>
                      <p className="text-lg font-black tracking-tighter">PREMIUM PASS</p>
                    </div>
                    <div className="bg-slate-900 text-white p-2 rounded-lg"><Zap size={16} /></div>
                 </div>
                 
                 <div className="w-48 h-48 bg-slate-100 rounded-xl flex items-center justify-center p-4 border-2 border-dashed border-slate-300">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=PASS-12345" alt="QR" className="w-full h-full opacity-80" />
                 </div>

                 <div className="grid grid-cols-2 w-full gap-4 mt-4">
                    <div className="bg-slate-50 p-3 rounded-xl">
                       <p className="text-[10px] opacity-40 font-bold uppercase">GATE</p>
                       <p className="text-xl font-black">GATE 02</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl">
                       <p className="text-[10px] opacity-40 font-bold uppercase">PARKING</p>
                       <p className="text-xl font-black">ZONE P4</p>
                    </div>
                 </div>

                 <div className="mt-4 pt-4 border-t border-slate-100 w-full text-center">
                    <p className="text-xs font-bold opacity-60">ROW G • SEAT 42</p>
                 </div>
              </div>

              <div className="glass border-l-4 border-blue-500">
                 <p className="text-xs font-bold text-blue-400 mb-1">PARKING INSTRUCTIONS</p>
                 <p className="text-sm">Enter via <strong>South Stadium Link</strong>. Parking Zone P4 is currently at 85% capacity.</p>
              </div>
           </motion.div>
        )}

        {activeTab === 'map' && (
          <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
            <StadiumMap />
            
            <div className="flex gap-4">
              <div className="glass flex-1 flex items-center justify-between">
                 <div>
                   <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>ARRIVAL</p>
                   <p style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>4 MIN</p>
                 </div>
                 <Navigation size={18} />
              </div>
              <div className="glass flex-1 flex items-center justify-between">
                 <div>
                   <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>CROWD</p>
                   <p style={{ fontWeight: 800, color: '#f59e0b' }}>MODERATE</p>
                 </div>
                 <Users size={18} />
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'food' && (
          <motion.div key="food" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
             <div className="flex justify-between items-center mb-2">
               <h3 style={{ fontWeight: 800 }}>In-Seat Delivery</h3>
               <span className="badge badge-green">LIVE</span>
             </div>
             {['Classic Burger', 'Spicy Wings', 'Large Cola', 'Popcorn XL'].map((item, idx) => (
                <div key={item} className="glass flex justify-between items-center border-l-4" style={{ borderColor: idx === 0 ? 'var(--accent-primary)' : 'transparent' }}>
                  <div className="flex items-center gap-4">
                    <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.05)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Coffee size={20} color="var(--text-muted)" />
                    </div>
                    <div>
                      <p style={{ fontWeight: 700 }}>{item}</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Prep time: 10m</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      placeOrder('A1', [{ itemId: item, quantity: 1, name: item }]);
                    }} 
                    className="primary py-2 px-4 text-xs"
                  >
                    ADD • $12
                  </button>
                </div>
             ))}
          </motion.div>
        )}

        {activeTab === 'status' && (
          <motion.div key="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
             {/* ALERT */}
             <div className="glass bg-orange-500/10 border-orange-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={18} color="#f59e0b" />
                  <h4 style={{ fontWeight: 800, fontSize: '0.9rem' }}>High Congestion: Gate 2</h4>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Gate 2 is experiencing heavy flow. We recommend using <strong>Gate 3</strong> for 40% faster entry.</p>
             </div>

             {/* QUEUE TIMES */}
             <div className="flex flex-col gap-3">
               <h4 className="flex items-center gap-2" style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                 <Clock size={14} /> LIVE QUEUE ESTIMATES
               </h4>
               <div className="grid grid-cols-2 gap-3">
                 {queueTimes.map(q => (
                   <div key={q.area} className="glass p-3 flex flex-col gap-1">
                      <p style={{ fontSize: '0.65rem', fontWeight: 700 }}>{q.area}</p>
                      <div className="flex justify-between items-end">
                        <p style={{ fontSize: '1.25rem', fontWeight: 900 }}>{q.waitMinutes}m</p>
                        <span style={{ fontSize: '0.5rem', color: q.status === 'CONGESTED' ? '#ef4444' : (q.status === 'BUSY' ? '#f59e0b' : '#10b981') }}>
                          {q.status}
                        </span>
                      </div>
                   </div>
                 ))}
               </div>
             </div>

             {/* SAFETY TIMELINE */}
             <div className="flex flex-col gap-3">
               <h4 className="flex items-center gap-2" style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)' }}>
                 <Shield size={14} /> SAFETY & OPS TIMELINE
               </h4>
               <div className="flex flex-col gap-0">
                 {safetyLogs.map((log, idx) => (
                   <div key={log.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: idx === 0 ? 'var(--accent-primary)' : 'var(--text-muted)', marginTop: '4px' }} />
                        {idx !== safetyLogs.length - 1 && <div style={{ width: 1, flexGrow: 1, background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />}
                      </div>
                      <div className="pb-4">
                        <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{log.time} • {log.officer}</p>
                        <p style={{ fontSize: '0.8rem', fontWeight: 500 }}>{log.message}</p>
                      </div>
                   </div>
                 ))}
               </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- NOTIFICATION TOASTS ---
const ToastContainer = () => {
  const { notifications, clearNotification } = useApp();
  return (
    <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <AnimatePresence>
        {notifications.map(n => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            onClick={() => clearNotification(n.id)}
            className="glass shadow-2xl"
            style={{ 
              padding: '0.75rem 1.25rem', 
              borderLeft: `4px solid ${n.type === 'warning' ? '#f59e0b' : n.type === 'alert' ? '#ef4444' : '#3b82f6'}`,
              cursor: 'pointer',
              minWidth: '250px'
            }}
          >
            <div className="flex justify-between items-center gap-4">
               <div>
                 <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{n.type.toUpperCase()}</p>
                 <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{n.message}</p>
               </div>
               <AlertTriangle size={14} className={n.type === 'warning' ? 'text-orange-500' : 'text-blue-500'} />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

const AppInner = () => {
  const { currentUser } = useApp();
  const [view, setView] = useState<'discovery' | 'seats' | 'payment' | 'ticket' | 'experience'>('discovery');
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  return (
    <>
      <ToastContainer />
      {!currentUser ? (
        <div className="container" style={{ maxWidth: '800px' }}>
          <LoginScreen onLogin={() => setView('discovery')} />
        </div>
      ) : currentUser.role === 'manager' ? (
        <div className="container py-8" style={{ maxWidth: '1400px' }}>
          <ManagerDashboard />
        </div>
      ) : currentUser.role === 'vendor' ? (
        <div className="container py-8" style={{ maxWidth: '1200px' }}>
          <VendorDashboard />
        </div>
      ) : (
        <div className="container py-8" style={{ maxWidth: view === 'discovery' ? '1200px' : '600px' }}>
          <AnimatePresence mode="wait">
            {view === 'discovery' && (
              <motion.div key="discovery" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <DiscoveryScreen 
                  onSelectEvent={(id) => { setSelectedEventId(id); setView('seats'); }} 
                  onBack={() => {}} 
                />
              </motion.div>
            )}

            {view === 'seats' && selectedEventId && (
              <motion.div key="seats" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <SeatSelectionScreen 
                  eventId={selectedEventId} 
                  onConfirm={(bookingId) => { setActiveBookingId(bookingId); setView('payment'); }} 
                  onBack={() => setView('discovery')} 
                />
              </motion.div>
            )}

            {view === 'payment' && activeBookingId && (
              <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <PaymentScreen 
                  bookingId={activeBookingId} 
                  onComplete={() => setView('ticket')} 
                  onBack={() => setView('seats')} 
                />
              </motion.div>
            )}

            {view === 'ticket' && activeBookingId && (
              <motion.div key="ticket" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                <TicketScreen 
                  bookingId={activeBookingId} 
                  onEnter={() => setView('experience')} 
                  onBack={() => setView('payment')} 
                />
              </motion.div>
            )}

            {view === 'experience' && (
              <motion.div key="experience" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                <InVenueExperience onBack={() => setView('discovery')} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </>
  );
};

const App = () => (
  <AppProvider>
    <AppInner />
  </AppProvider>
);

export default App;
