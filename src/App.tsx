import React, { useState } from 'react';
import { AppProvider, useApp } from './store';
import { 
  Users, MapPin, Zap, Bell, Search, 
  ChevronRight, CreditCard, Ticket as TicketIcon, 
  Navigation, Coffee, User as UserIcon, LogIn,
  ArrowLeft, CheckCircle, Smartphone, Activity, AlertTriangle
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
  const { setCurrentUser } = useApp();
  const [formData, setFormData] = useState({ name: '', email: '', vehicle: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentUser({
      id: 'USR1',
      name: formData.name || 'Alex Johnson',
      email: formData.email || 'alex@example.com',
      phone: '+1 234 567 8900',
      vehicle: formData.vehicle
    });
    onLogin();
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h2 style={{ fontSize: '2rem', fontWeight: 900 }}>Welcome to Venue<span style={{ color: 'var(--accent-primary)' }}>Sync</span></h2>
        <p style={{ color: 'var(--text-muted)' }}>Sign in to start your event journey</p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="glass flex flex-col gap-4">
          <input 
            className="search-bar w-full" 
            placeholder="Full Name" 
            style={{ width: '100%', display: 'block' }}
            onChange={e => setFormData({...formData, name: e.target.value})}
          />
          <input 
            className="search-bar w-full" 
            placeholder="Email Address" 
            onChange={e => setFormData({...formData, email: e.target.value})}
          />
          <div className="flex flex-col gap-2">
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Are you bringing a vehicle?</p>
            <input 
              className="search-bar w-full" 
              placeholder="Vehicle Number (Optional)" 
              onChange={e => setFormData({...formData, vehicle: e.target.value})}
            />
          </div>
        </div>
        <button type="submit" className="primary py-4 text-lg">CREATE ACCOUNT</button>
      </form>
    </div>
  );
};

// --- SCREEN 2: EVENT DISCOVERY ---
const DiscoveryScreen = ({ onSelectEvent }: { onSelectEvent: (id: string) => void }) => {
  const { events } = useApp();
  return (
    <div className="flex flex-col gap-6">
      <Header title="Upcoming Events" />
      {events.map(event => (
        <motion.div 
          key={event.id}
          whileHover={{ scale: 1.02 }}
          onClick={() => onSelectEvent(event.id)}
          className="glass p-6 cursor-pointer glow-hover"
        >
          <div className="flex justify-between items-start">
            <span className="badge badge-blue mb-2">{event.category}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{event.date}</span>
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{event.title}</h3>
          <p style={{ color: 'var(--accent-primary)', fontWeight: 600, marginTop: '0.5rem' }}>
            {event.teams[0]} vs {event.teams[1]}
          </p>
        </motion.div>
      ))}
    </div>
  );
};

// --- SCREEN 3: SEAT BOOKING ---
const BookingScreen = ({ eventId, onConfirm }: { eventId: string, onConfirm: (bookingId: string) => void }) => {
  const { seats, lockSeat, bookSeat } = useApp();
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);

  const handleSeatClick = (id: string) => {
    if (lockSeat(id)) setSelectedSeat(id);
  };

  const handleBook = async () => {
    if (!selectedSeat) return;
    const success = await bookSeat(eventId, selectedSeat);
    if (success) onConfirm(selectedSeat); // Using seatId for simplicity in mock
  };

  return (
    <div className="flex flex-col gap-6">
      <Header onBack={() => {}} title="Select Your Seat" />
      <div className="glass" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
        <div style={{ width: '80%', height: '4px', background: 'var(--accent-primary)', margin: '0 auto 2rem', borderRadius: '4px', opacity: 0.5 }}>FIELD / STAGE</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '8px' }}>
          {seats.filter(s => s.section === 'A').map(seat => (
            <button 
              key={seat.id}
              disabled={seat.isBooked}
              onClick={() => handleSeatClick(seat.id)}
              style={{ 
                aspectRatio: '1', 
                borderRadius: '4px',
                background: seat.isBooked ? '#1e293b' : (selectedSeat === seat.id ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)'),
                border: '1px solid rgba(255,255,255,0.1)',
                fontSize: '0.5rem',
                color: 'white'
              }}
            >
              {seat.id}
            </button>
          ))}
        </div>
      </div>
      <div className="glass flex justify-between items-center">
        <div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Selected Seat</p>
          <p style={{ fontWeight: 800 }}>{selectedSeat || 'None'}</p>
        </div>
        <button onClick={handleBook} disabled={!selectedSeat} className="primary">PROCEED TO PAY</button>
      </div>
    </div>
  );
};

// --- SCREEN 4: PAYMENT ---
const PaymentScreen = ({ onComplete }: { onComplete: () => void }) => (
  <div className="flex flex-col gap-8 text-center pt-8">
    <div className="stat-icon" style={{ margin: '0 auto' }}><CreditCard size={32} /></div>
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Secure Checkout</h2>
      <p style={{ color: 'var(--text-muted)' }}>Select your preferred payment method</p>
    </div>
    <div className="flex flex-col gap-4">
      {['Apple Pay', 'Google Pay', 'Stripe / Credit Card'].map(m => (
        <button key={m} onClick={onComplete} className="glass py-4 font-bold flex justify-between px-6 hover:bg-slate-800 transition-colors">
          {m} <ChevronRight size={18} />
        </button>
      ))}
    </div>
  </div>
);

// --- SCREEN 5: TICKET PASSPORT ---
const TicketScreen = ({ seatId, onEnter }: { seatId: string, onEnter: () => void }) => {
  const { seats, currentUser } = useApp();
  const seat = seats.find(s => s.id === seatId);

  return (
    <div className="flex flex-col gap-8">
      <Header title="Your Digital Pass" />
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
            <div><p className="badge badge-blue">SEAT</p><h3 style={{ fontSize: '2rem', fontWeight: 900 }}>{seatId}</h3></div>
            <div><p className="badge badge-orange">GATE</p><h3 style={{ fontSize: '2rem', fontWeight: 900 }}>{seat?.gate}</h3></div>
            <div><p className="badge badge-green">PARKING</p><h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{seat?.parking}</h3></div>
            <div><p className="badge">SEC</p><h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{seat?.section}</h3></div>
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

// --- SCREEN 6: IN-VENUE EXPERIENCE ---
const VenueDashboard = () => {
  const [activeTab, setActiveTab] = useState<'map' | 'food' | 'status'>('map');
  const { placeOrder } = useApp();

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex justify-around glass p-2">
         <button onClick={() => setActiveTab('map')} style={{ color: activeTab === 'map' ? 'var(--accent-primary)' : 'gray' }}><MapPin size={24} /></button>
         <button onClick={() => setActiveTab('food')} style={{ color: activeTab === 'food' ? 'var(--accent-primary)' : 'gray' }}><Coffee size={24} /></button>
         <button onClick={() => setActiveTab('status')} style={{ color: activeTab === 'status' ? 'var(--accent-primary)' : 'gray' }}><Activity size={24} /></button>
      </nav>

      <AnimatePresence mode="wait">
        {activeTab === 'map' && (
          <motion.div key="map" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
            <div className="glass" style={{ height: '300px', background: '#000', position: 'relative' }}>
               <div style={{ position: 'absolute', top: '10%', left: '10%', color: 'var(--accent-primary)' }}><Smartphone size={16} /> <span style={{ fontSize: '0.7rem' }}>You</span></div>
               <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                  <path d="M 40 40 L 200 150 L 280 250" stroke="var(--accent-primary)" fill="none" strokeWidth="2" strokeDasharray="5,5" />
               </svg>
               <div style={{ position: 'absolute', bottom: '10%', right: '10%', color: 'var(--accent-tertiary)' }}><MapPin size={16} /> <span style={{ fontSize: '0.7rem' }}>Your Seat</span></div>
            </div>
            <div className="glass flex items-center justify-between">
               <div>
                 <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Estimated Arrival</p>
                 <p style={{ fontWeight: 800 }}>4 Minutes</p>
               </div>
               <Navigation size={24} color="var(--accent-primary)" />
            </div>
          </motion.div>
        )}

        {activeTab === 'food' && (
          <motion.div key="food" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
             <h3 style={{ fontWeight: 800 }}>In-Seat Delivery</h3>
             {['Classic Burger', 'Spicy Wings', 'Large Cola'].map(item => (
               <div key={item} className="glass flex justify-between items-center">
                 <span>{item}</span>
                 <button onClick={() => placeOrder('A1', [{ itemId: item, quantity: 1 }])} className="badge badge-blue">ADD • $12</button>
               </div>
             ))}
          </motion.div>
        )}

        {activeTab === 'status' && (
          <motion.div key="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
             <div className="glass bg-orange-500/10 border-orange-500/20">
                <AlertTriangle size={20} color="#f59e0b" style={{ marginBottom: '0.5rem' }} />
                <h4 style={{ fontWeight: 800 }}>Crowded Area: Gate 2</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Strongly suggest using Gate 3 or North Exit to avoid delays.</p>
             </div>
             <div className="glass">
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Event Status</p>
                <div className="flex items-center gap-2 mt-1">
                   <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                   <p style={{ fontWeight: 700 }}>2nd Quarter • 08:12</p>
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
  const [step, setStep] = useState<'login' | 'discovery' | 'booking' | 'payment' | 'ticket' | 'venue'>('login');
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [activeSeatId, setActiveSeatId] = useState<string | null>(null);

  return (
    <div className="container" style={{ maxWidth: '500px', padding: '1rem' }}>
      <AnimatePresence mode="wait">
        <motion.div 
          key={step} 
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }} 
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {step === 'login' && <LoginScreen onLogin={() => setStep('discovery')} />}
          
          {step === 'discovery' && (
            <DiscoveryScreen onSelectEvent={(id) => { setActiveEventId(id); setStep('booking'); }} />
          )}

          {step === 'booking' && activeEventId && (
            <BookingScreen eventId={activeEventId} onConfirm={(seatId) => { setActiveSeatId(seatId); setStep('payment'); }} />
          )}

          {step === 'payment' && <PaymentScreen onComplete={() => setStep('ticket')} />}

          {step === 'ticket' && activeSeatId && <TicketScreen seatId={activeSeatId} onEnter={() => setStep('venue')} />}

          {step === 'venue' && <VenueDashboard />}
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
