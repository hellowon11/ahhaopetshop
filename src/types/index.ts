export interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  phone: string;
  role?: 'user' | 'admin';
}

export interface Pet {
  _id?: string;
  owner: string;
  name: string;
  breed: string;
  age: number;
  gender: 'male' | 'female';
  specialNeeds: string;
  imageUrl: string;
  type?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TimeSlot {
  time: string;
  currentBookings: number;
}

export interface Appointment {
  _id: string;
  user?: string;
  petName: string;
  petType: 'dog' | 'cat';
  date: string;
  time: string;
  utcDateTime?: string;
  serviceType: string;
  duration: number;
  dayCareOptions?: {
    type: 'daily' | 'longTerm';
    days?: number;
  };
  totalPrice: number;
  basePrice: number;
  discount: number;
  dayCarePrice: number;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  notes?: string;
  status: 'Booked' | 'Completed' | 'Cancelled';
  createdAt?: string;
  updatedAt?: string;
}

export interface ShopPet {
  _id: string;
  petId: string;
  name: string;
  breed: string;
  age: string;
  gender: 'Male' | 'Female';
  imageUrl: string;
  type: 'dog' | 'cat';
  description?: string;
  isForSale: boolean;
  status?: 'Listed' | 'Unlisted' | 'Sold';
  createdAt: Date;
  updatedAt: Date;
}

export interface Favourite {
  _id: string;
  userId: string;
  petId: string | ShopPet;
  createdAt: Date;
  updatedAt: Date;
}

// 美容服务接口
export interface GroomingService {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  discount: number;
  features: Array<{ text: string }>;
  recommended?: boolean;
  displayPrice?: string;
  displayDuration?: string;
}

// 日托选项接口
export interface DayCareOption {
  type: string;
  description: string;
  price: number;
  displayPrice?: string;
}

// PetListing 接口
export interface PetListing {
  id: string;
  petId: string;
  name: string;
  breed: string;
  age: string;
  gender: 'Male' | 'Female';
  imageUrl: string;
  type: 'dog' | 'cat';
  description?: string;
  isForSale: boolean;
  status?: 'Listed' | 'Unlisted' | 'Sold';
  createdAt: Date;
  updatedAt: Date;
} 