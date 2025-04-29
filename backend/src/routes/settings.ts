import express, { Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { adminAuth } from '../middleware/adminAuth';
import { AppointmentSettings } from '../models/AppointmentSettings';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role?: string;
  };
}

const router = express.Router();

// 获取当前预约设置
router.get('/appointment', async (req: Request, res: Response) => {
  try {
    const settings = await AppointmentSettings.findOne({ 
      settingName: 'default' 
    });
    
    if (!settings) {
      return res.status(404).json({ message: 'Settings not found' });
    }
    
    res.json(settings);
  } catch (error) {
    console.error('Failed to get appointment settings:', error);
    res.status(500).json({ message: 'Failed to get appointment settings' });
  }
});

// 更新预约设置 (仅管理员)
router.put('/appointment', auth, adminAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { maxBookingsPerTimeSlot, description } = req.body;
    
    // 验证输入
    if (typeof maxBookingsPerTimeSlot !== 'number' || maxBookingsPerTimeSlot < 1) {
      return res.status(400).json({ 
        message: 'Max bookings per time slot must be a positive number' 
      });
    }
    
    // 查找并更新设置
    const settings = await AppointmentSettings.findOneAndUpdate(
      { settingName: 'default' },
      { 
        maxBookingsPerTimeSlot,
        description: description || 'Updated settings',
        updatedBy: req.user?.id
      },
      { new: true, upsert: true }
    );
    
    res.json(settings);
  } catch (error) {
    console.error('Failed to update appointment settings:', error);
    res.status(500).json({ message: 'Failed to update appointment settings' });
  }
});

export default router; 