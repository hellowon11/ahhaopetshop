import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { auth } from '../middleware/auth';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import { createTransporter } from '../config/email';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role?: string;
  };
}

const router = express.Router();

// 创建邮件传输器
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: 'ahhaopetshop@gmail.com',
    pass: process.env.EMAIL_PASSWORD
  }
});

// 验证邮件配置
transporter.verify(function(error, success) {
  if (error) {
    console.error('Email configuration error:', error);
  } else {
    console.log('Email server is ready to send messages');
  }
});

// 生成随机验证码的函数
const generateVerificationCode = (): string => {
  // 生成6位数字验证码
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// 获取当前用户信息
router.get('/me', auth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id).select('-password -token -tokenExpiresAt -verificationCode -verificationCodeExpires');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Failed to get user information' });
  }
});

// 更新用户信息
router.put('/me', auth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone } = req.body;
    const user = await User.findById(req.user?.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 更新用户信息
    user.name = name || user.name;
    user.phone = phone || user.phone;
    await user.save();

    // 返回更新后的用户信息（不包含敏感信息）
    const updatedUser = {
      id: user._id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified
    };

    res.json(updatedUser);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Failed to update user information' });
  }
});

// 用户登录
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    console.log('Login attempt for email:', email);

    // 查找用户
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(401).json({ message: 'Email or password is incorrect' });
    }
    console.log('User found:', user.email);

    // 验证密码 - using bcrypt directly
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match result:', isMatch);
    
    if (!isMatch) {
      console.log('Password does not match for user:', email);
      return res.status(401).json({ message: 'Email or password is incorrect' });
    }

    // 生成 token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'pet-shop-secret-key-2024',
      { expiresIn: '30d' } // Extended to 30 days
    );
    console.log('Token generated successfully');

    // 保存 token 到数据库
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 30); // 30 days
    
    user.token = token;
    user.tokenExpiresAt = tokenExpiresAt;
    await user.save();
    console.log('Token saved to database');

    // Set HTTP-only cookie with token - more compatible format
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
      sameSite: 'lax', // Changed from 'strict' to 'lax' for better cross-site compatibility
      path: '/'
    });
    
    // Also set non-httpOnly cookie for JavaScript access
    res.cookie('auth', 'true', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
      path: '/'
    });
    
    // Include token in Authorization header for client reuse
    res.setHeader('Authorization', `Bearer ${token}`);

    // Send user data and token in response body
    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified
      }
    });
    console.log('Login successful for user:', email);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

// 预注册 - 发送验证码
router.post('/pre-register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, phone } = req.body;

    // 检查用户是否已存在
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'This email is already registered' });
    }

    // 生成验证码
    const verificationCode = generateVerificationCode();
    const codeExpiry = new Date();
    codeExpiry.setMinutes(codeExpiry.getMinutes() + 15); // 15分钟有效期

    // 先创建未验证的用户
    const tempUser = new User({
      email,
      password,
      name,
      phone,
      role: 'user',
      isVerified: false,
      verificationCode,
      verificationCodeExpires: codeExpiry
    });

    await tempUser.save();
    console.log('Temporary user created with verification code:', verificationCode);

    // 发送验证码邮件
    const mailOptions = {
      from: `"AH HAO PET SHOP" <${process.env.EMAIL_USER || 'ahhaopetshop@gmail.com'}>`,
      to: email,
      subject: 'AH HAO Pet Shop - Email Verification Code',
      text: `Your verification code is: ${verificationCode}. This code will expire in 15 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">AH HAO Pet Shop - Email Verification</h2>
          <p>Hello ${name},</p>
          <p>Thank you for registering with AH HAO Pet Shop. Please use the following verification code to complete your registration:</p>
          <div style="text-align: center; margin: 20px 0;">
            <div style="display: inline-block; padding: 16px 24px; background-color: #f5f5f5; color: #333; font-size: 24px; font-weight: bold; letter-spacing: 4px; border-radius: 4px; border: 1px solid #ddd;">
              ${verificationCode}
            </div>
          </div>
          <p>This code will expire in 15 minutes.</p>
          <p>If you did not request this verification code, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply to this email.</p>
        </div>
      `
    };

    try {
      const emailTransporter = await createTransporter();
      const info = await emailTransporter.sendMail(mailOptions);
      console.log('Verification email sent successfully:', info.messageId);
      
      res.status(200).json({ 
        message: 'Verification code sent to your email',
        userId: tempUser._id
      });
    } catch (emailError: any) {
      console.error('Failed to send verification email:', emailError);
      res.status(500).json({ 
        message: 'Failed to send verification email. Please try again.',
        error: emailError.message
      });
    }
  } catch (error: any) {
    console.error('Pre-registration error:', error);
    res.status(500).json({ 
      message: 'Registration process failed',
      error: error.message 
    });
  }
});

// 验证邮箱验证码完成注册
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { email, verificationCode } = req.body;
    
    // 查找待验证的用户
    const userToVerify = await User.findOne({
      email,
      verificationCode,
      verificationCodeExpires: { $gt: new Date() }
    });

    if (!userToVerify) {
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    // 更新用户为已验证状态
    userToVerify.isVerified = true;
    userToVerify.verificationCode = undefined;
    userToVerify.verificationCodeExpires = undefined;

    // 生成 token
    const token = jwt.sign(
      { userId: userToVerify._id },
      process.env.JWT_SECRET || 'pet-shop-secret-key-2024',
      { expiresIn: '30d' }
    );

    // 保存 token 到数据库
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 30); // 30 days
    
    userToVerify.token = token;
    userToVerify.tokenExpiresAt = tokenExpiresAt;
    await userToVerify.save();

    // Set HTTP-only cookie with token
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
      sameSite: 'lax',
      path: '/'
    });
    
    // Also set non-httpOnly cookie for JavaScript access
    res.cookie('auth', 'true', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
      path: '/'
    });
    
    // Include token in Authorization header for client reuse
    res.setHeader('Authorization', `Bearer ${token}`);

    res.json({
      message: 'Email verified successfully',
      token,
      user: {
        id: userToVerify._id,
        email: userToVerify.email,
        name: userToVerify.name,
        phone: userToVerify.phone,
        role: userToVerify.role,
        isVerified: userToVerify.isVerified
      }
    });
  } catch (error: any) {
    console.error('Email verification error:', error);
    res.status(500).json({ 
      message: 'Failed to verify email',
      error: error.message 
    });
  }
});

// 重新发送验证码
router.post('/resend-verification', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // 查找用户
    const user = await User.findOne({ email, isVerified: false });
    if (!user) {
      return res.status(404).json({ message: 'User not found or already verified' });
    }

    // 生成新的验证码
    const verificationCode = generateVerificationCode();
    const codeExpiry = new Date();
    codeExpiry.setMinutes(codeExpiry.getMinutes() + 15); // 15分钟有效期

    user.verificationCode = verificationCode;
    user.verificationCodeExpires = codeExpiry;
    await user.save();

    // 发送验证码邮件
    const mailOptions = {
      from: `"AH HAO PET SHOP" <${process.env.EMAIL_USER || 'ahhaopetshop@gmail.com'}>`,
      to: email,
      subject: 'AH HAO Pet Shop - New Email Verification Code',
      text: `Your new verification code is: ${verificationCode}. This code will expire in 15 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">AH HAO Pet Shop - New Email Verification Code</h2>
          <p>Hello ${user.name},</p>
          <p>You requested a new verification code. Please use the following code to complete your registration:</p>
          <div style="text-align: center; margin: 20px 0;">
            <div style="display: inline-block; padding: 16px 24px; background-color: #f5f5f5; color: #333; font-size: 24px; font-weight: bold; letter-spacing: 4px; border-radius: 4px; border: 1px solid #ddd;">
              ${verificationCode}
            </div>
          </div>
          <p>This code will expire in 15 minutes.</p>
          <p>If you did not request this verification code, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply to this email.</p>
        </div>
      `
    };

    try {
      const emailTransporter = await createTransporter();
      const info = await emailTransporter.sendMail(mailOptions);
      console.log('New verification email sent successfully:', info.messageId);
      
      res.status(200).json({ message: 'New verification code sent to your email' });
    } catch (emailError: any) {
      console.error('Failed to send new verification email:', emailError);
      res.status(500).json({ 
        message: 'Failed to send new verification email. Please try again.',
        error: emailError.message
      });
    }
  } catch (error: any) {
    console.error('Resend verification error:', error);
    res.status(500).json({ 
      message: 'Failed to resend verification code',
      error: error.message 
    });
  }
});

// 用户登出
router.post('/logout', auth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id);
    if (user) {
      user.token = '';
      user.tokenExpiresAt = new Date(0);
      await user.save();
    }
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Logout failed' });
  }
});

// 请求重置密码
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    console.log('Starting password reset process for:', email);

    // 检查环境变量
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.error('Missing email configuration');
      return res.status(500).json({ message: 'Email service configuration error' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found:', email);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('User found:', user.email);

    // 生成较短的重置令牌 (16字节/32个字符，之前是32字节/64个字符)
    const resetToken = crypto.randomBytes(16).toString('hex');
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1);

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();
    console.log('Reset token generated and saved:', resetToken.substring(0, 5) + '...' + resetToken.substring(resetToken.length - 5));

    // 构建重置URL - 使用路径参数而非查询参数，提高兼容性
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    // 确保baseUrl没有结尾的斜杠
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    // 创建重置链接，使用路径参数而非查询参数
    const resetUrl = `${cleanBaseUrl}/reset-password/${resetToken}`;
    console.log('Reset URL generated (partial):', resetUrl.substring(0, 60) + '...');

    const mailOptions = {
      from: `"AH HAO PET SHOP" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'AH HAO Pet Shop - Password Reset Request',
      text: `You have requested to reset your password. Please click the following link to reset your password: ${resetUrl}\n\nThis link will expire in 1 hour.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">AH HAO Pet Shop - Password Reset</h2>
          <p>Hello,</p>
          <p>You have requested to reset your password. Please click the button below to reset your password:</p>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${resetUrl}" 
               style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Reset Password
            </a>
          </div>
          <p style="word-break: break-all;">If the button does not work, please copy the following link to your browser address bar:<br>${resetUrl}</p>
          <p>If you did not request this password reset, please ignore this email.</p>
          <p>This link will expire in 1 hour.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply to this email.</p>
        </div>
      `
    };

    console.log('Creating email transporter...');
    const transporter = await createTransporter();
    
    console.log('Attempting to send email...');
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', {
        messageId: info.messageId,
        response: info.response
      });
      res.json({ 
        message: 'Password reset email sent',
        debug: {
          messageId: info.messageId,
          response: info.response
        }
      });
    } catch (emailError: any) {
      console.error('Email sending failed:', {
        error: emailError.message,
        code: emailError.code,
        command: emailError.command,
        response: emailError.response
      });
      
      return res.status(500).json({
        message: 'Failed to send reset email',
        error: emailError.message
      });
    }
  } catch (error: any) {
    console.error('Password reset process failed:', error);
    res.status(500).json({
      message: 'Password reset process failed',
      error: error.message
    });
  }
});

// 重置密码
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    let { token, newPassword } = req.body;
    
    console.log('Reset password request received');
    
    // 处理token格式化和净化
    if (token) {
      // 移除前后空格
      token = token.trim();
      // 尝试URL解码（如果被编码）
      try {
        const decodedToken = decodeURIComponent(token);
        // 如果解码后不同，说明可能是被编码过的
        if (decodedToken !== token) {
          console.log('Token was URL encoded, decoded successfully');
          token = decodedToken;
        }
      } catch (e) {
        // 解码失败，保持原样
        console.log('Token decoding failed, using original token');
      }
      
      console.log('Token received (processed):', token ? `${token.substring(0, 5)}...${token.substring(token.length - 5)}` : 'undefined');
    } else {
      console.log('Reset failed: No token provided');
      return res.status(400).json({ message: 'Reset token is required' });
    }
    
    if (!newPassword) {
      console.log('Reset failed: No new password provided');
      return res.status(400).json({ message: 'New password is required' });
    }
    
    // 查找有效的重置令牌
    console.log('Looking for user with valid reset token...');
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      // 查看是否有任何具有此令牌的用户
      const expiredUser = await User.findOne({ resetPasswordToken: token });
      
      if (expiredUser) {
        console.log('Reset failed: Token expired');
        return res.status(400).json({ message: 'Reset token has expired' });
      } else {
        console.log('Reset failed: Invalid token, no matching user found');
        return res.status(400).json({ message: 'Invalid reset token' });
      }
    }

    console.log('Valid token found, updating password for user:', user.email);
    
    // 更新密码
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    
    console.log('Password reset successful for user:', user.email);
    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Failed to reset password', error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// 更新现有用户的验证状态 (一次性迁移)
router.post('/migrate-verified-status', auth, async (req: AuthRequest, res: Response) => {
  try {
    // 检查是否是管理员
    const adminUser = await User.findById(req.user?.id);
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // 将所有现有用户设置为已验证
    const result = await User.updateMany(
      { isVerified: { $ne: true } }, 
      { $set: { isVerified: true } }
    );

    res.json({ 
      message: 'All existing users marked as verified',
      updated: result.modifiedCount
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ message: 'Failed to update user verification status' });
  }
});

// 测试用户权限
router.get('/test-auth', auth, async (req: AuthRequest, res: Response) => {
  try {
    console.log('Test auth endpoint hit');
    console.log('User in request:', JSON.stringify(req.user));
    
    res.json({
      message: 'Auth test successful',
      userInfo: {
        id: req.user?.id,
        role: req.user?.role || 'unknown'
      },
      isAdmin: req.user?.role === 'admin'
    });
  } catch (error) {
    console.error('Test auth error:', error);
    res.status(500).json({ message: 'Test failed' });
  }
});

export default router; 