export interface Pet {
  _id?: string;
  owner: string;
  name: string;
  breed: string;
  age: number;
  gender: 'male' | 'female';
  specialNeeds: string;
  imageUrl: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface User {
  _id?: string;
  email: string;
  password?: string;
  name: string;
  phone: string;
  role: 'user' | 'admin';
  createdAt?: string;
}

export interface Appointment {
  _id?: string;
  user?: string;
  petName: string;
  petType?: string;
  date: string;
  time: string;
  serviceType: string;
  status: 'Booked' | 'Cancelled';
  dayCare?: {
    enabled: boolean;
    days: number;
  };
  ownerName?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  notes?: string;
  totalPrice?: number;
  duration?: number;
  createdAt?: string;
}

export interface Notification {
  _id: string;
  title: string;
  message: string;
  read: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
} 