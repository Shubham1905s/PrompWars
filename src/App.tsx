import React, { useState } from 'react';
import { AppProvider, useApp } from './store';
import { 
  Users, MapPin, Zap, Bell, Search, 
  ChevronRight, CreditCard, Ticket as TicketIcon, 
  Navigation, Coffee, User as UserIcon, LogIn,
  ArrowLeft, CheckCircle, Smartphone, Activity, AlertTriangle,
  Clock, Shield, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const { sendOTP, verifyOTP } = useApp();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');
    const success = await sendOTP(email, name);
    setLoading(false);
    if (success) {
      setStep('otp');
    } else {
      setError('Failed to send OTP. Please try again.');
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    setLoading(true);
    setError('');
    const success = await verifyOTP(email, otp);
    setLoading(false);
    if (success) {
      onLogin();
    } else {
      setError('Invalid OTP. Please check and try again.');
    }
  };

  return (
    <div className="flex flex-col gap-8 py-12">
      <div className="text-center">
        <div className="logo-icon mx-auto mb-6" style={{ width: 80, height: 80 }}><Zap size={40} color="white" fill="white" /></div>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 900 }}>Venue<span style={{ color: 'var(--accent-primary)' }}>Sync</span></h2>
        <p style={{ color: 'var(--text-muted)' }}>Professional Stadium & Crowd Management</p>
      </div>

      <div className="glass" style={{ maxWidth: '400px', margin: '0 auto', width: '100%' }}>
        {step === 'email' ? (
          <form onSubmit={handleSendOTP} className="flex flex-col gap-4">
            <h3 className="text-xl font-bold mb-2">Sign In</h3>
            <input 
              className="search-bar" 
              placeholder="Full Name" 
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <input 
              className="search-bar" 
              placeholder="Email Address" 
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            {error && <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>{error}</p>}
            <button type="submit" disabled={loading} className="primary py-4">
              {loading ? 'SENDING CODE...' : 'GET VERIFICATION CODE'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="flex flex-col gap-4">
            <h3 className="text-xl font-bold mb-2">Verify OTP</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>We've sent a 6-digit code to <strong>{email}</strong></p>
            <input 
              className="search-bar text-center text-2xl tracking-[1rem]" 
              placeholder="000000" 
              maxLength={6}
              value={otp}
              onChange={e => setOtp(e.target.value)}
            />
            {error && <p style={{ color: '#ef4444', fontSize: '0.875rem' }}>{error}</p>}
            <button type="submit" disabled={loading} className="primary py-4">
              {loading ? 'VERIFYING...' : 'VERIFY & LOGIN'}
            </button>
            <button type="button" onClick={() => setStep('email')} className="glass py-2" style={{ border: 'none', background: 'transparent', color: 'var(--accent-primary)' }}>
              Change Email
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
  const { queueTimes, safetyLogs, currentUser, logout } = useApp();
  
  return (
    <div className="flex flex-col gap-6">
      <nav className="flex justify-between items-center glass">
        <div className="flex items-center gap-4">
          <div className="logo-icon"><Zap size={20} /></div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 900 }}>COMMAND CENTER</h1>
            <p style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', fontWeight: 800 }}>STADIUM OPERATIONAL HUD</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="badge badge-blue">OFFICER: {currentUser?.name}</span>
          <button onClick={logout} className="glass p-2 hover:bg-red-500/20"><LogIn size={18} /></button>
        </div>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* HEATMAP RE-USED */}
        <div className="md:col-span-2 flex flex-col gap-6">
           <StadiumMap />
           
           <div className="grid grid-cols-3 gap-4">
              <div className="glass border-l-4 border-blue-500">
                <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>TOTAL ATTENDEES</p>
                <h3 className="text-2xl font-black">42,850</h3>
                <p style={{ fontSize: '0.6rem', color: '#10b981' }}>+4% vs last hour</p>
              </div>
              <div className="glass border-l-4 border-orange-500">
                <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>AVG WAIT TIME</p>
                <h3 className="text-2xl font-black">12 MIN</h3>
                <p style={{ fontSize: '0.6rem', color: '#ef4444' }}>PEAK at Gate 2</p>
              </div>
              <div className="glass border-l-4 border-purple-500">
                <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>RESOURCES ACTIVE</p>
                <h3 className="text-2xl font-black">124</h3>
                <p style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Staff & Medical</p>
              </div>
           </div>
        </div>

        {/* SIDE BAR STATUS */}
        <div className="flex flex-col gap-6">
           <div className="glass flex flex-col gap-4">
              <h3 className="flex items-center gap-2 font-bold text-sm"><Activity size={16} /> GATE PRESSURE</h3>
              {queueTimes.map(q => (
                <div key={q.area} className="flex flex-col gap-1">
                  <div className="flex justify-between text-[0.65rem]">
                    <span>{q.area}</span>
                    <span style={{ color: q.status === 'CONGESTED' ? '#ef4444' : '#10b981' }}>{q.waitMinutes}m</span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(q.waitMinutes * 4, 100)}%`, background: q.status === 'CONGESTED' ? '#ef4444' : '#3b82f6' }} />
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
              <button className="primary w-full mt-4 py-2 text-xs">DISPATCH RESPONSE</button>
           </div>
        </div>
      </div>
    </div>
  );
};

// --- SCREEN 2: EVENT DISCOVERY ---
const DiscoveryScreen = ({ onSelectEvent, onBack }: { onSelectEvent: (id: string) => void, onBack: () => void }) => {
  const { events, currentUser, logout } = useApp();
  return (
    <div className="flex flex-col gap-6">
      <nav className="flex justify-between items-center glass">
        <div className="flex items-center gap-4">
           <div className="logo-icon"><Zap size={20} /></div>
           <h1 style={{ fontSize: '1rem', fontWeight: 900 }}>Hello, {currentUser?.name || 'Guest'}</h1>
        </div>
        <button onClick={logout} className="glass p-2 hover:bg-red-500/20"><LogIn size={18} /></button>
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

// --- SCREEN 3: SEAT BOOKING ---
const BookingScreen = ({ eventId, onConfirm, onBack }: { eventId: string, onConfirm: (bookingId: string) => void, onBack: () => void }) => {
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
const StadiumMap = () => (
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
        
        {/* Stand Labels */}
        <text x="150" y="60" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="8" fontWeight="bold">NORTH STAND</text>
        <text x="150" y="250" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="8" fontWeight="bold">SOUTH STAND</text>
        <text x="50" y="150" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="8" fontWeight="bold" transform="rotate(-90, 50, 150)">WEST STAND</text>
        <text x="250" y="150" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="8" fontWeight="bold" transform="rotate(90, 250, 150)">EAST STAND</text>
     </svg>
     
     {/* GATES */}
     <div className="gate-marker" style={{ top: '10%', left: '50%', transform: 'translateX(-50%)' }}>G1</div>
     <div className="gate-marker" style={{ bottom: '10%', left: '50%', transform: 'translateX(-50%)' }}>G3</div>
     <div className="gate-marker" style={{ top: '50%', left: '10%', transform: 'translateY(-50%)' }}>G4</div>
     <div className="gate-marker" style={{ top: '50%', right: '10%', transform: 'translateY(-50%)' }}>G2</div>

     {/* HEATMAP BLOBS */}
     <div className="heatmap-blob" style={{ top: '25%', left: '35%', width: '60px', height: '60px', background: 'rgba(239, 68, 68, 0.4)' }} />
     <div className="heatmap-blob" style={{ top: '65%', left: '60%', width: '90px', height: '90px', background: 'rgba(245, 158, 11, 0.3)' }} />
     
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

// --- SCREEN 6: IN-VENUE EXPERIENCE ---
const VenueDashboard = ({ onBack }: { onBack: () => void }) => {
  const [activeTab, setActiveTab] = useState<'map' | 'food' | 'status'>('map');
  const { placeOrder, queueTimes, safetyLogs } = useApp();

  return (
    <div className="flex flex-col gap-6">
      <Header title="Venue Live" onBack={onBack} />
      <nav className="flex justify-around glass p-1" style={{ borderRadius: '1rem' }}>
         <button onClick={() => setActiveTab('map')} className={activeTab === 'map' ? 'tab-active' : 'tab-inactive'}><MapPin size={20} /></button>
         <button onClick={() => setActiveTab('food')} className={activeTab === 'food' ? 'tab-active' : 'tab-inactive'}><Coffee size={20} /></button>
         <button onClick={() => setActiveTab('status')} className={activeTab === 'status' ? 'tab-active' : 'tab-inactive'}><Activity size={20} /></button>
      </nav>

      <AnimatePresence mode="wait">
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
                  <button onClick={() => placeOrder('A1', [{ itemId: item, quantity: 1 }])} className="primary py-2 px-4 text-xs">ADD • $12</button>
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

// --- MAIN ROUTER ---
const AppInner = () => {
  const { currentUser } = useApp();
  const [step, setStep] = useState<'discovery' | 'booking' | 'payment' | 'ticket' | 'venue'>('discovery');
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [activeBookingId, setActiveBookingId] = useState<string | null>(null);

  if (!currentUser) {
    return (
      <div className="container" style={{ maxWidth: '800px' }}>
        <LoginScreen onLogin={() => setStep('discovery')} />
      </div>
    );
  }

  // If Manager, show Manager HUD
  if (currentUser.role === 'manager') {
    return (
      <div className="container" style={{ maxWidth: '1200px' }}>
        <ManagerDashboard />
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: step === 'discovery' ? '900px' : '500px', padding: '1rem' }}>
      <AnimatePresence mode="wait">
        <motion.div 
          key={step} 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          {step === 'discovery' && (
            <DiscoveryScreen 
              onSelectEvent={(id) => { setActiveEventId(id); setStep('booking'); }} 
              onBack={() => {}}
            />
          )}

          {step === 'booking' && activeEventId && (
            <BookingScreen 
              eventId={activeEventId} 
              onConfirm={(id) => { setActiveBookingId(id); setStep('payment'); }} 
              onBack={() => setStep('discovery')}
            />
          )}

          {step === 'payment' && activeBookingId && (
            <PaymentScreen 
              bookingId={activeBookingId} 
              onComplete={() => setStep('ticket')} 
              onBack={() => setStep('booking')}
            />
          )}

          {step === 'ticket' && activeBookingId && (
            <TicketScreen 
              bookingId={activeBookingId} 
              onEnter={() => setStep('venue')} 
              onBack={() => setStep('booking')}
            />
          )}

          {step === 'venue' && (
            <VenueDashboard onBack={() => setStep('discovery')} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const App = () => (
  <AppProvider>
    <AppInner />
  </AppProvider>
);

export default App;
