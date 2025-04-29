import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { auth } from '../middleware/auth';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = express.Router();

// 创建上传目录
const backendUploadsDir = path.join(__dirname, '../../public/uploads/pets');
const frontendImgsDir = path.join(__dirname, '../../../public/imgs');

// 确保目录存在
[backendUploadsDir, frontendImgsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, backendUploadsDir);
  },
  filename: (req, file, cb) => {
    // 使用UUID和原始扩展名
    const ext = path.extname(file.originalname);
    const uniqueFilename = `${uuidv4()}${ext}`;
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

// 自动将新图片添加到Git
async function addImageToGit(imagePath: string) {
  try {
    // 获取项目根目录
    const rootDir = path.join(__dirname, '../../..');
    
    // 执行git命令
    await execAsync('git add "' + imagePath + '"', { cwd: rootDir });
    await execAsync('git commit -m "Add new pet image: ' + path.basename(imagePath) + '"', { cwd: rootDir });
    
    console.log('Successfully added image to git:', imagePath);
  } catch (error) {
    console.error('Failed to add image to git:', error);
    // 不抛出错误，因为这不应该影响上传功能
  }
}

// 上传宠物图片路由 (需要管理员权限)
router.post('/pet-image', auth, upload.single('image'), async (req: Request, res: Response) => {
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

    // 复制文件到前端目录
    const frontendPath = path.join(frontendImgsDir, req.file.filename);
    fs.copyFileSync(req.file.path, frontendPath);

    // 返回图片URL（使用相对路径）
    const imageUrl = `/imgs/${req.file.filename}`;
    console.log('Image uploaded successfully:', {
      originalPath: req.file.path,
      frontendPath,
      imageUrl
    });

    // 将新图片添加到Git（异步操作，不等待完成）
    addImageToGit(path.relative(path.join(__dirname, '../../..'), frontendPath));

    // 返回图片URL
    res.json({ imageUrl });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ message: 'Failed to upload image' });
  }
});

export default router; 