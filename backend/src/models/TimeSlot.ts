import mongoose from 'mongoose';

// Define interface for the time slot document
interface ITimeSlot extends mongoose.Document {
  date: string;
  time: string;
  bookedCount: number;
  maxCapacity: number;
  isAvailable: boolean;
}

const timeSlotSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  bookedCount: {
    type: Number,
    default: 0
  },
  maxCapacity: {
    type: Number,
    default: 2
  },
  isAvailable: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create a compound index for date and time to ensure uniqueness
timeSlotSchema.index({ date: 1, time: 1 }, { unique: true });

// Virtual getter to calculate availability
timeSlotSchema.virtual('available').get(function() {
  return this.isAvailable && this.bookedCount < this.maxCapacity;
});

export const TimeSlot = mongoose.model<ITimeSlot>('TimeSlot', timeSlotSchema); 