export interface Appointment {
  _id?: string;
  petName: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  appointmentNumber: string;
  serviceType: string;
  date: string;  // ISO date string format
  time: string;  // 24-hour format HH:mm
  petType: string;
  contactInfo: {
    name: string;
    phone: string;
    email: string;
  };
  dayCareOptions?: {
    type: string;
    days: number;
    morning?: boolean;
    afternoon?: boolean;
    evening?: boolean;
  };
  price: number;
}

export interface TimeSlot {
  time: string;
  currentBookings: number;
  isAvailable: boolean;
}

export interface ExtendedAppointment extends Appointment {
  formattedDate?: string;
  formattedTime?: string;
} 