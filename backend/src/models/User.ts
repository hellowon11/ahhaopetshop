import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

// Define interface for the user document
interface IUser extends mongoose.Document {
  email: string;
  password: string;
  name: string;
  phone: string;
  role: 'user' | 'admin';
  token: string;
  tokenExpiresAt: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  isVerified: boolean;
  verificationCode?: string;
  verificationCodeExpires?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  token: {
    type: String,
    default: ''
  },
  tokenExpiresAt: {
    type: Date,
    default: Date.now
  },
  resetPasswordToken: {
    type: String,
    default: undefined
  },
  resetPasswordExpires: {
    type: Date,
    default: undefined
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationCode: {
    type: String,
    default: undefined
  },
  verificationCodeExpires: {
    type: Date,
    default: undefined
  }
}, {
  timestamps: true
});

// 密码加密
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// 验证密码
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

export const User = mongoose.model<IUser>('User', userSchema); 