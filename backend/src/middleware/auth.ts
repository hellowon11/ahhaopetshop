import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import mongoose from 'mongoose';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role?: string;
  };
  file?: Express.Multer.File;
}

export const auth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Check auth header first
    let token = '';
    const authHeader = req.header('Authorization');
    if (authHeader) {
      token = authHeader.replace('Bearer ', '');
      console.log('Token extracted from Authorization header');
    }
    
    // If no token in auth header, check cookies
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
      console.log('Token extracted from cookies');
    }
    
    // If still no token, return error
    if (!token) {
      console.log('No token found in request');
      return res.status(401).json({ message: 'Please login first' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pet-shop-secret-key-2024') as { userId: string };
    console.log('Token verified successfully for userId:', decoded.userId);
    
    // Find user in database - only check token expiry, not exact match
    const user = await User.findOne({
      _id: decoded.userId,
      tokenExpiresAt: { $gt: new Date() }
    });

    if (!user) {
      console.log('Token validation failed: User not found or token expired');
      return res.status(401).json({ message: 'Login expired, please login again' });
    }

    // Always refresh token in response if it exists
    // Set in cookie with long expiration
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30); // 30 days
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
      sameSite: 'lax',
      path: '/'
    });
    
    // Also include token in response header for client use
    res.setHeader('Authorization', `Bearer ${token}`);

    // Always update user's token to the current one
    if (user.token !== token) {
      console.log('Updating stored token for user');
      user.token = token;
      user.tokenExpiresAt = expiryDate;
      await user.save();
    }

    // Type assertion to access _id safely
    const userId = user._id as unknown as mongoose.Types.ObjectId;
    
    // 确保用户角色信息正确传递
    console.log('Setting user info on request:', {
      id: userId.toString(),
      role: user.role || 'user' // 提供默认角色
    });
    
    req.user = { 
      id: userId.toString(),
      role: user.role || 'user' // 确保始终有角色信息
    };
    
    // 额外检查
    console.log('Final req.user object:', JSON.stringify(req.user));
    
    next();
  }
  catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      console.log('JWT Verification failed:', error.message);
      return res.status(401).json({ message: 'Invalid token, please login again' });
    }
    
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 