import express from 'express';
import multer from 'multer';
import path from 'path';
import { auth } from '../middleware/auth';
import { isAdmin } from '../middleware/admin';
import {
  getShopInformation,
  updateShopInformation,
  updateShopLogo,
  updateBusinessHours,
  updateSocialMedia
} from '../controllers/shopInformation';

const router = express.Router();

// 配置 multer 用于处理文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/shop/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.mimetype)) {
      cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'));
      return;
    }
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 限制文件大小为 5MB
  }
});

// 获取店铺信息 - 公开访问
router.get('/', getShopInformation);

// 以下路由需要管理员权限
router.use(auth, isAdmin);

// 更新店铺基本信息
router.put('/', updateShopInformation);

// 更新店铺logo
router.put('/logo', upload.single('logo'), updateShopLogo);

// 更新营业时间
router.put('/business-hours', updateBusinessHours);

// 更新社交媒体链接
router.put('/social-media', updateSocialMedia);

export default router; 