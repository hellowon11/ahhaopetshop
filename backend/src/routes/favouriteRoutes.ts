import express from 'express';
import { 
  getUserFavourites, 
  addFavourite, 
  removeFavourite,
  checkFavouriteStatus
} from '../controllers/favouriteController';
import { authenticate } from '../middleware/authMiddleware';

const router = express.Router();

// 所有收藏相关路由都需要认证
router.use(authenticate);

// 获取用户的所有收藏
router.get('/', getUserFavourites);

// 添加收藏
router.post('/', addFavourite);

// 删除收藏
router.delete('/:petId', removeFavourite);

// 检查宠物是否已收藏
router.get('/check/:petId', checkFavouriteStatus);

export default router; 