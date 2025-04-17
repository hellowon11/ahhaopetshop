import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { auth } from '../middleware/auth';

interface AuthRequest extends Request {
  user?: {
    id: string;
  };
}

const router = express.Router();

// 用户注册
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, phone } = req.body;

    // 检查用户是否已存在
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'This email is already registered' });
    }

    // 创建新用户
    const user = new User({
      email,
      password,
      name,
      phone
    });

    await user.save();

    // 生成token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'pet-shop-secret-key-2024', {
      expiresIn: '7d'
    });

    res.status(201).json({ 
      token, 
      user: { 
        id: user._id, 
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role
      } 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// 获取用户信息
router.get('/me', auth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 