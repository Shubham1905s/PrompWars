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
  id: string; // e.g., "A1"
  section: string; // e.g., "A"
  price: number;
  isBooked: boolean;
  lockedUntil?: number; // timestamp
  lockedBy?: string; // user id
  gate: number;
  parking: string;
}

export interface Booking {
  id: string;
  userId: string;
  eventId: string;
  seatId: string;
  gate: number;
  parking: string;
  status: 'PENDING' | 'CONFIRMED';
  timestamp: number;
}

export interface FoodItem {
  id: string;
  name: string;
  price: number;
  category: string;
}

export interface FoodOrder {
  id: string;
  userId: string;
  seatId: string;
  items: { itemId: string; quantity: number }[];
  status: 'PLACED' | 'PREPARING' | 'DELIVERED';
}
