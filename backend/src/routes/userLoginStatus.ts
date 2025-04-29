import express from 'express';
import { auth } from '../middleware/auth';
import { UserLoginStatus } from '../models/UserLoginStatus';
import { AuthRequest } from '../types';

const router = express.Router();

// Update login status when user logs in
router.post('/login', auth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized access' });
    }

    const deviceInfo = req.headers['user-agent'] || 'unknown';
    const loginToken = req.headers.authorization?.split(' ')[1];

    // Update or create login status
    await UserLoginStatus.findOneAndUpdate(
      { user: req.user.id },
      {
        isLoggedIn: true,
        lastLoginAt: new Date(),
        lastActivityAt: new Date(),
        deviceInfo,
        loginToken
      },
      { upsert: true, new: true }
    );

    res.json({ message: 'Login status updated' });
  } catch (error) {
    console.error('Failed to update login status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update status when user logs out
router.post('/logout', auth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized access' });
    }

    await UserLoginStatus.findOneAndUpdate(
      { user: req.user.id },
      {
        isLoggedIn: false,
        lastLogoutAt: new Date(),
        loginToken: null
      }
    );

    res.json({ message: 'Logout status updated' });
  } catch (error) {
    console.error('Failed to update logout status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user activity time
router.post('/activity', auth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized access' });
    }

    await UserLoginStatus.findOneAndUpdate(
      { user: req.user.id },
      { lastActivityAt: new Date() }
    );

    res.json({ message: 'Activity time updated' });
  } catch (error) {
    console.error('Failed to update activity time:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check user login status
router.get('/status', auth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized access' });
    }

    const loginStatus = await UserLoginStatus.findOne({ user: req.user.id });
    
    if (!loginStatus) {
      return res.json({ isLoggedIn: false });
    }

    // Check if inactive for more than 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (loginStatus.lastActivityAt && loginStatus.lastActivityAt < twentyFourHoursAgo) {
      // Auto logout
      await UserLoginStatus.findOneAndUpdate(
        { user: req.user.id },
        {
          isLoggedIn: false,
          lastLogoutAt: new Date(),
          loginToken: null
        }
      );
      return res.json({ isLoggedIn: false, message: 'Session timeout' });
    }

    // Update last activity time
    await UserLoginStatus.findOneAndUpdate(
      { user: req.user.id },
      { lastActivityAt: new Date() }
    );

    res.json({
      isLoggedIn: loginStatus.isLoggedIn,
      lastLoginAt: loginStatus.lastLoginAt,
      lastActivityAt: loginStatus.lastActivityAt
    });
  } catch (error) {
    console.error('Failed to check login status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 