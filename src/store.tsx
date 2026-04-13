import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'attendee' | 'manager' | 'staff' | 'vendor';
  phone?: string;
  vehicle?: string | null;
}

export interface StadiumEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  teams: [string, string];
  category: string;
  image: string;
}

export interface Seat {
  id: string;
  section: string;
  price: number;
  isBooked: boolean;
  lockedUntil?: number;
  lockedBy?: string;
  gate: number;
  parking: string;
}

export interface VenueBooking {
  id: string;
  userId: string;
  eventId: string;
  seatIds: string[];
  gate: number;
  parking: string;
  status: 'PENDING' | 'CONFIRMED';
  timestamp: number;
}

export interface FoodOrder {
  id: string;
  userId: string;
  seatId: string;
  items: { itemId: string; quantity: number }[];
  status: 'PLACED' | 'PREPARING' | 'DELIVERED';
}

export interface QueueTime {
  area: string;
  waitMinutes: number;
  status: 'FLUID' | 'BUSY' | 'CONGESTED';
}

export interface SafetyLog {
  id: string;
  time: string;
  message: string;
  officer: string;
}

export interface AppNotification {
  id: string;
  type: 'info' | 'warning' | 'alert';
  message: string;
  timestamp: number;
}

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  events: StadiumEvent[];
  seats: Seat[];
  bookings: VenueBooking[];
  orders: FoodOrder[];
  queueTimes: QueueTime[];
  safetyLogs: SafetyLog[];
  bookSeats: (eventId: string, seatIds: string[]) => Promise<string | null>;
  lockSeat: (seatId: string) => boolean;
  unlockSeat: (seatId: string) => void;
  confirmBooking: (bookingId: string) => void;
  placeOrder: (seatId: string, items: any[]) => void;
  updateQueueTime: (area: string, minutes: number) => void;
  notifications: AppNotification[];
  clearNotification: (id: string) => void;
  checkEmail: (email: string) => Promise<boolean>;
  signupOTP: (email: string) => Promise<boolean>;
  verifySignup: (data: any) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const API_URL = 'http://localhost:5000/api';
const socket = io('http://localhost:5000');

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [seats, setSeats] = useState<Seat[]>([]);
  const [bookings, setBookings] = useState<VenueBooking[]>([]);
  const [orders, setOrders] = useState<FoodOrder[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  
  const [queueTimes, setQueueTimes] = useState<QueueTime[]>([
    { area: 'Main Concourse', waitMinutes: 5, status: 'FLUID' },
    { area: 'Gate 2 Entrance', waitMinutes: 18, status: 'CONGESTED' },
    { area: 'South Food Court', waitMinutes: 12, status: 'BUSY' },
    { area: 'East Restrooms', waitMinutes: 2, status: 'FLUID' },
  ]);

  const safetyLogs: SafetyLog[] = [
    { id: '1', time: '14:20', message: 'Perimeter check clear.', officer: 'Sgt. Barnes' },
    { id: '2', time: '14:45', message: 'Gate 2 pressure valve opened.', officer: 'Officer Reed' },
    { id: '3', time: '15:10', message: 'Section C medic deployment.', officer: 'Rescue 4' },
  ];

  const events: StadiumEvent[] = [
    { id: '1', title: 'Global Champions Cup', teams: ['Strikers FC', 'Titans'], date: '2026-04-20', time: '19:00', category: 'Football', image: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&q=80&w=1000' },
    { id: '2', title: 'Grand Slam Finals', teams: ['Nadal', 'Alcaraz'], date: '2026-04-22', time: '15:00', category: 'Tennis', image: 'https://images.unsplash.com/photo-1543351611-58f69d7c1781?auto=format&fit=crop&q=80&w=1000' },
  ];

  const updateQueueTime = (area: string, minutes: number) => {
    setQueueTimes(prev => prev.map(q => {
      if (q.area === area) {
        let status: 'FLUID' | 'BUSY' | 'CONGESTED' = 'FLUID';
        if (minutes > 15) status = 'CONGESTED';
        else if (minutes > 8) status = 'BUSY';
        return { ...q, waitMinutes: minutes, status };
      }
      return q;
    }));
  };
  const addNotification = (message: string, type: 'info' | 'warning' | 'alert' = 'info') => {
    setNotifications(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      message,
      type,
      timestamp: Date.now()
    }, ...prev].slice(0, 5));
  };

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    const initialSeats: Seat[] = [];
    const sections = ['A', 'B', 'C', 'D', 'E', 'F'];
    sections.forEach((sec, idx) => {
      for (let i = 1; i <= 20; i++) {
        initialSeats.push({
          id: `${sec}${i}`,
          section: sec,
          price: 150 + (idx * 20),
          isBooked: false,
          gate: idx + 1,
          parking: `P${idx + 1}`
        });
      }
    });
    setSeats(initialSeats);

    // SOCKET LISTENERS
    socket.on('initialLocks', (initialLocks) => {
      setSeats(prev => prev.map(s => {
        if (initialLocks[s.id]) {
          return { ...s, isBooked: true, lockedBy: initialLocks[s.id] };
        }
        return s;
      }));
    });

    socket.on('seatLocked', ({ seatId, userId }) => {
      setSeats(prev => prev.map(s => s.id === seatId ? { ...s, isBooked: true, lockedBy: userId } : s));
    });

    socket.on('seatUnlocked', (seatId) => {
      setSeats(prev => prev.map(s => s.id === seatId ? { ...s, isBooked: false, lockedBy: undefined } : s));
    });

    socket.on('crowdUpdate', (updates: { area: string, waitMinutes: number }[]) => {
      updates.forEach(u => {
        updateQueueTime(u.area, u.waitMinutes);
        if (u.waitMinutes > 20) {
           addNotification(`Alert: High congestion at ${u.area}!`, 'warning');
        }
      });
    });

    socket.on('newOrder', (order) => {
      setOrders(prev => [...prev, order]);
    });

    return () => {
      socket.off('seatLocked');
      socket.off('seatUnlocked');
      socket.off('crowdUpdate');
      socket.off('newOrder');
    };
  }, []);

  const checkEmail = async (email: string) => {
    try {
      const res = await fetch(`${API_URL}/auth/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      return data.exists;
    } catch { return false; }
  }

  const signupOTP = async (email: string) => {
    try {
      const res = await fetch(`${API_URL}/auth/signup-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      return res.ok;
    } catch { return false; }
  };

  const verifySignup = async (payload: any) => {
    try {
      const res = await fetch(`${API_URL}/auth/verify-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
        return true;
      }
      return false;
    } catch { return false; }
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
        return true;
      }
      return false;
    } catch { return false; }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  const lockSeat = (seatId: string) => {
    const seat = seats.find(s => s.id === seatId);
    if (!seat || seat.isBooked) return false;
    
    setSeats(prev => prev.map(s => 
      s.id === seatId ? { ...s, isBooked: true, lockedBy: currentUser?.id } : s
    ));
    socket.emit('lockSeat', { seatId, userId: currentUser?.id });
    return true;
  };

  const unlockSeat = (seatId: string) => {
    setSeats(prev => prev.map(s => 
      s.id === seatId ? { ...s, isBooked: false, lockedBy: undefined } : s
    ));
    socket.emit('unlockSeat', seatId);
  };

  const bookSeats = async (eventId: string, seatIds: string[]) => {
    if (!currentUser || seatIds.length === 0) return null;
    
    const representativeSeat = seats.find(s => s.id === seatIds[0]);
    if (!representativeSeat) return null;

    const bookingId = Math.random().toString(36).substr(2, 9);
    const newBooking: VenueBooking = {
      id: bookingId,
      userId: currentUser.id,
      eventId,
      seatIds,
      gate: representativeSeat.gate,
      parking: representativeSeat.parking,
      status: 'PENDING',
      timestamp: Date.now()
    };

    setBookings(prev => [...prev, newBooking]);
    return bookingId;
  };

  const confirmBooking = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'CONFIRMED' } : b));
    setSeats(prev => prev.map(s => booking.seatIds.includes(s.id) ? { ...s, isBooked: true, lockedUntil: undefined, lockedBy: undefined } : s));
  };

  const placeOrder = (seatId: string, items: any[]) => {
    if (!currentUser) return;
    const newOrder: FoodOrder = {
      id: `ORD-${Math.random().toString(36).substr(2, 5)}`,
      userId: currentUser.id,
      seatId,
      items,
      status: 'PLACED'
    };
    setOrders(prev => [...prev, newOrder]);
    socket.emit('placeOrder', newOrder);
  };

  return (
    <AppContext.Provider value={{ 
      currentUser, setCurrentUser, events, seats, bookings, orders,
      queueTimes, safetyLogs,
      lockSeat, unlockSeat, bookSeats, confirmBooking, placeOrder,
      sendOTP: signupOTP, verifyOTP: verifySignup, // backwards compat if needed
      checkEmail, signupOTP, verifySignup, login, logout,
      updateQueueTime, notifications, clearNotification
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

