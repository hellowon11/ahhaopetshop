import mongoose from 'mongoose';

const userLoginStatusSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isLoggedIn: {
    type: Boolean,
    default: false
  },
  lastLoginAt: {
    type: Date,
    default: null
  },
  lastLogoutAt: {
    type: Date,
    default: null
  },
  lastActivityAt: {
    type: Date,
    default: null
  },
  deviceInfo: {
    type: String,
    default: null
  },
  loginToken: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// 添加索引以提高查询性能
userLoginStatusSchema.index({ user: 1 });
userLoginStatusSchema.index({ lastActivityAt: 1 });

export const UserLoginStatus = mongoose.model('UserLoginStatus', userLoginStatusSchema); 