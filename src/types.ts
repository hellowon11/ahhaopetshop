export interface User {
  _id: string;
  id?: string;
  email: string;
  name: string;
  phone: string;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
  lastLocation?: 'home' | 'dashboard';
}

export interface Pet {
  _id: string;
  name: string;
  type: string;
  breed: string;
  age: string | number;
  gender: 'male' | 'female';
  owner: string; // 用户ID
  specialNeeds?: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Appointment {
  _id?: string;
  user?: string;
  petName: string;
  petType: 'dog' | 'cat';
  date: string | Date;
  time: string;
  utcDateTime?: Date;
  serviceType: 'Basic Grooming' | 'Premium Grooming' | 'Spa Treatment' | 'Full Grooming';
  serviceId: string;
  duration: number;
  dayCareOptions?: {
    type: 'daily' | 'longTerm';
    days: number;
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
  };
  totalPrice: number;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  notes?: string;
  status: 'Booked' | 'Completed' | 'Cancelled';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Notification {
  _id: string;
  user: string; // 用户ID
  title: string;
  message: string;
  type: 'appointment' | 'welcome' | 'reminder' | 'update' | 'success';
  isRead: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface TimeSlotWithBookings extends TimeSlot {
  currentBookings: number;
}

export interface DayCareOption {
  _id: string;
  type: 'daily' | 'longTerm';
  price: number;
  displayPrice?: string;
  description: string;
  capacityLimit?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface GroomingService {
  id: string;
  name: string;
  description: string;
  price: number;
  displayPrice: string;
  duration: number;
  displayDuration: string;
  features: string[];
  discount: number;
  recommended: boolean;
}

export interface Feature {
  text: string;
} 