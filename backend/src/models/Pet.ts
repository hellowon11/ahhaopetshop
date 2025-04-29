import mongoose from 'mongoose';

const petSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  breed: {
    type: String,
    trim: true,
    default: ''
  },
  age: {
    type: mongoose.Schema.Types.Mixed,
    default: ''
  },
  gender: {
    type: String,
    enum: ['male', 'female'],
    required: true
  },
  specialNeeds: {
    type: String,
    trim: true,
    default: ''
  },
  imageUrl: {
    type: String,
    trim: true,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 更新 updatedAt 字段
petSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Pet = mongoose.model('Pet', petSchema); 