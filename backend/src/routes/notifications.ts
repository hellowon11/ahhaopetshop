import express, { Request, Response } from 'express';
import { Notification } from '../models/Notification';
import { auth, AuthRequest } from '../middleware/auth';

const router = express.Router();

// 创建通知
router.post('/create', auth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '未授权访问' });
    }

    const { title, message, type } = req.body;
    
    const notification = new Notification({
      user: req.user.id,
      title,
      message,
      type,
      read: false
    });

    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ message: '创建通知失败' });
  }
});

// Get all notifications
router.get('/', auth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized access' });
    }

    const notifications = await Notification.find({ 
      user: req.user.id,
      isDeleted: { $ne: true } 
    }).sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.put('/:id/read', auth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized access' });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.put('/read-all', auth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized access' });
    }

    const result = await Notification.updateMany(
      { user: req.user.id, isRead: false, isDeleted: { $ne: true } },
      { isRead: true }
    );

    res.json({ 
      message: 'All notifications marked as read',
      count: result.modifiedCount
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Failed to mark all notifications as read' });
  }
});

// 删除通知
router.delete('/:id', auth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: '未授权访问' });
    }
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { isDeleted: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ message: '通知不存在' });
    }
    res.json({ message: '通知已删除' });
  } catch (error) {
    res.status(500).json({ message: '服务器错误' });
  }
});

// 删除多个通知
router.post('/delete-multiple', auth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized access' });
    }
    
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Invalid notification IDs' });
    }

    const result = await Notification.updateMany(
      { 
        _id: { $in: ids },
        user: req.user.id 
      },
      { isDeleted: true }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'No matching notifications found' });
    }

    res.json({ 
      message: `${result.modifiedCount} notifications deleted successfully`,
      count: result.modifiedCount
    });
  } catch (error) {
    console.error('Delete multiple notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// 删除所有通知
router.delete('/', auth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized access' });
    }
    
    const result = await Notification.updateMany(
      { user: req.user.id },
      { isDeleted: true }
    );
    
    res.json({ 
      message: 'All notifications deleted successfully',
      count: result.modifiedCount
    });
  } catch (error) {
    console.error('Delete all notifications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 