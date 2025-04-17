import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { auth } from '../middleware/auth';

const router = express.Router();

// 创建上传目录
const uploadsDir = path.join(__dirname, '../../public/uploads/pets');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名
    const uniqueFilename = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueFilename);
  }
});

// 文件过滤器
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // 只接受 jpeg 和 png
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG and PNG images are allowed'));
  }
};

// 配置上传
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 限制5MB
  }
});

// 上传宠物图片路由 (需要管理员权限)
router.post('/pet-image', auth, upload.single('image'), (req: Request, res: Response) => {
  try {
    // 检查是否有管理员权限
    const user = (req as any).user;
    if (user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin permission required' });
    }

    // 确保文件已上传
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    // 构建图片URL
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 4003}`;
    const imageUrl = `${baseUrl}/uploads/pets/${req.file.filename}`;

    // 返回图片URL
    res.json({ imageUrl });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ message: 'Failed to upload image' });
  }
});

export default router; 