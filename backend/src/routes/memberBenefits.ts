import express from 'express';
import * as memberBenefitController from '../controllers/memberBenefits';
import { isAdmin } from '../middleware/admin';
import { auth } from '../middleware/auth';

const router = express.Router();

// 获取所有会员福利
router.get('/member-benefits', memberBenefitController.getAllMemberBenefits);

// 通过类型获取会员福利
router.get('/member-benefits/:benefitType', memberBenefitController.getMemberBenefitByType);

// 创建会员福利 (仅管理员)
router.post('/member-benefits', auth, isAdmin, memberBenefitController.createMemberBenefit);

// 更新会员福利 (仅管理员)
router.put('/member-benefits/:benefitType', auth, isAdmin, memberBenefitController.updateMemberBenefit);

// 删除会员福利 (仅管理员)
router.delete('/member-benefits/:benefitType', auth, isAdmin, memberBenefitController.deleteMemberBenefit);

export default router; 