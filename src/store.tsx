import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  vehicle: string | null;
}

export interface StadiumEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  teams: [string, string];
  category: string;
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
  seatId: string;
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

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  events: StadiumEvent[];
  seats: Seat[];
  bookings: VenueBooking[];
  orders: FoodOrder[];
  bookSeat: (eventId: string, seatId: string) => Promise<boolean>;
  lockSeat: (seatId: string) => boolean;
  confirmBooking: (bookingId: string) => void;
  placeOrder: (seatId: string, items: any[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [bookings, setBookings] = useState<VenueBooking[]>([]);
  const [orders, setOrders] = useState<FoodOrder[]>([]);

  const events: StadiumEvent[] = [
    { id: '1', title: 'Global Champions Cup', teams: ['Strikers FC', 'Titans'], date: '2026-05-20', time: '19:00', category: 'Football' },
    { id: '2', title: 'Grand Slam Finals', teams: ['Nadal', 'Alcaraz'], date: '2026-05-22', time: '15:00', category: 'Tennis' },
  ];

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
  }, []);

  const lockSeat = (seatId: string) => {
    const seat = seats.find(s => s.id === seatId);
    if (!seat || seat.isBooked || (seat.lockedUntil && seat.lockedUntil > Date.now())) return false;
    
    setSeats(prev => prev.map(s => 
      s.id === seatId ? { ...s, lockedUntil: Date.now() + 120000, lockedBy: currentUser?.id } : s
    ));
    return true;
  };

  const bookSeat = async (eventId: string, seatId: string) => {
    if (!currentUser) return false;
    
    const seat = seats.find(s => s.id === seatId);
    if (!seat) return false;

    const newBooking: VenueBooking = {
      id: Math.random().toString(36).substr(2, 9),
      userId: currentUser.id,
      eventId,
      seatId,
      gate: seat.gate,
      parking: seat.parking,
      status: 'PENDING',
      timestamp: Date.now()
    };

    setBookings(prev => [...prev, newBooking]);
    return true;
  };

  const confirmBooking = (bookingId: string) => {
    const booking = bookings.find(b => b.id === bookingId);
    if (!booking) return;

    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'CONFIRMED' } : b));
    setSeats(prev => prev.map(s => s.id === booking.seatId ? { ...s, isBooked: true, lockedUntil: undefined, lockedBy: undefined } : s));
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
  };

  return (
    <AppContext.Provider value={{ 
      currentUser, setCurrentUser, events, seats, bookings, orders,
      lockSeat, bookSeat, confirmBooking, placeOrder 
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
