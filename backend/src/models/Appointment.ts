import mongoose, { Document, Schema } from 'mongoose';

export interface IAppointment extends Document {
  _id: mongoose.Types.ObjectId;
  user?: mongoose.Types.ObjectId;
  petName: string;
  petType: 'dog' | 'cat';
  date: string;
  time: string;
  utcDateTime?: Date;
  serviceType: 'Basic Grooming' | 'Full Grooming' | 'Spa Treatment';
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
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<IAppointment>({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  petName: { type: String, required: true },
  petType: { type: String, enum: ['dog', 'cat'], required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  utcDateTime: { type: Date },
  serviceType: { 
    type: String, 
    enum: ['Basic Grooming', 'Full Grooming', 'Spa Treatment'],
    required: true 
  },
  duration: { type: Number, required: true },
  dayCareOptions: {
    type: { type: String, enum: ['daily', 'longTerm'] },
    days: { type: Number, min: 1 },
    morning: { type: Boolean, default: false },
    afternoon: { type: Boolean, default: false },
    evening: { type: Boolean, default: false }
  },
  totalPrice: { type: Number, required: true },
  ownerName: { type: String, required: true },
  ownerPhone: { type: String, required: true },
  ownerEmail: { type: String, required: true },
  notes: { type: String },
  status: { 
    type: String, 
    enum: ['Booked', 'Completed', 'Cancelled'],
    default: 'Booked'
  }
}, {
  timestamps: true
});

// 创建索引以优化查询性能
appointmentSchema.index({ date: 1, time: 1 });
appointmentSchema.index({ ownerEmail: 1 });
appointmentSchema.index({ utcDateTime: 1 });

export const Appointment = mongoose.model<IAppointment>('Appointment', appointmentSchema); 