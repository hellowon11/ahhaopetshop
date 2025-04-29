import express from 'express';
import * as groomingServiceController from '../controllers/groomingServices';
import { isAdmin } from '../middleware/admin';
import { auth } from '../middleware/auth';

const router = express.Router();

// 获取所有美容服务
router.get('/grooming-services', groomingServiceController.getAllGroomingServices);

// 通过ID获取美容服务
router.get('/grooming-services/:id', groomingServiceController.getGroomingServiceById);

// 创建美容服务 (仅管理员)
router.post('/grooming-services', auth, isAdmin, groomingServiceController.createGroomingService);

// 更新美容服务 (仅管理员)
router.put('/grooming-services/:id', auth, isAdmin, groomingServiceController.updateGroomingService);

// 删除美容服务 (仅管理员)
router.delete('/grooming-services/:id', auth, isAdmin, groomingServiceController.deleteGroomingService);

// 获取所有日托选项
router.get('/day-care-options', groomingServiceController.getAllDayCareOptions);

// 通过类型获取日托选项
router.get('/day-care-options/:type', groomingServiceController.getDayCareOptionByType);

// 创建日托选项 (仅管理员)
router.post('/day-care-options', auth, isAdmin, groomingServiceController.createDayCareOption);

// 更新日托选项 (仅管理员)
router.put('/day-care-options/:type', auth, isAdmin, groomingServiceController.updateDayCareOption);

// 删除日托选项 (仅管理员)
router.delete('/day-care-options/:type', auth, isAdmin, groomingServiceController.deleteDayCareOption);

// 计算总价格
router.post('/calculate-price', groomingServiceController.calculateTotalPrice);

export default router; 