import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import path from 'path';
import authRoutes from './routes/auth';
import petRoutes from './routes/pets';
import appointmentRoutes from './routes/appointments';
import notificationRoutes from './routes/notifications';
import userLoginStatusRouter from './routes/userLoginStatus';
import adminRoutes from './routes/admin';
import shopPetsRoutes from './routes/shopPets';
import favouriteRoutes from './routes/favouriteRoutes';
import uploadRoutes from './routes/upload';
import groomingServicesRoutes from './routes/groomingServices';
import memberBenefitsRoutes from './routes/memberBenefits';
import { initializeDefaultServices } from './controllers/groomingServices';
import { initializeDefaultBenefits } from './controllers/memberBenefits';
import settingsRoutes from './routes/settings';
import { initializeDefaultSettings } from './models/AppointmentSettings';

dotenv.config();

const app = express();

// Configure CORS for cross-domain requests with credentials
app.use(cors({
  origin: function(origin, callback) {
    // 允许所有来源访问，包括移动设备
    // 或者你可以使用特定IP：
    // const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://192.168.1.100:3000'];
    // if (!origin || allowedOrigins.indexOf(origin) !== -1) {
    //   callback(null, true);
    // } else {
    //   callback(new Error('Not allowed by CORS'));
    // }
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(cookieParser());

// 设置静态文件目录
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
app.use('/public', express.static(path.join(__dirname, '../public')));
app.use(express.static(path.join(__dirname, '../public')));

// Log all requests for debugging purposes
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.cookies && req.cookies.token) {
    console.log('Cookie token detected');
  }
  if (req.headers.authorization) {
    console.log('Authorization header detected');
  }
  next();
});

// Set default security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// 路由
app.use('/auth', authRoutes);
app.use('/pets', petRoutes);
app.use('/appointments', appointmentRoutes);
app.use('/notifications', notificationRoutes);
app.use('/user-login-status', userLoginStatusRouter);
app.use('/admin', adminRoutes);
app.use('/shop-pets', shopPetsRoutes);
app.use('/favourites', favouriteRoutes);
app.use('/upload', uploadRoutes);
app.use('/services', groomingServicesRoutes);
app.use('/settings', settingsRoutes);
app.use('/benefits', memberBenefitsRoutes);

// 添加根路径处理
app.get('/', (req, res) => {
  res.json({
    message: 'AH HAO Pet Shop API is running',
    version: '1.0.0',
    endpoints: [
      '/auth',
      '/pets',
      '/appointments',
      '/notifications',
      '/user-login-status',
      '/admin',
      '/shop-pets',
      '/favourites',
      '/upload',
      '/services',
      '/settings',
      '/benefits'
    ]
  });
});

// 初始化默认服务数据
initializeDefaultServices().catch(err => {
  console.error('Failed to initialize default services:', err);
});

// 初始化默认会员福利
initializeDefaultBenefits().catch(err => {
  console.error('Failed to initialize default member benefits:', err);
});

// 初始化默认设置
initializeDefaultSettings();

// 错误处理中间件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ message: '服务器错误' });
});

export default app; 