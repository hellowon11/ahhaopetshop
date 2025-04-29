import { Request, Response, NextFunction } from 'express';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role?: string;
  };
}

// 管理员权限验证中间件
export const adminAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // 验证用户是否是管理员
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied: Admin privileges required' });
    }
    
    next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    res.status(500).json({ message: 'Admin authentication failed' });
  }
}; 