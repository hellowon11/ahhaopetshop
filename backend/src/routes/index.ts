import express from 'express';
import appointmentRoutes from './appointments';
import authRoutes from './auth';
import userRoutes from './users';
import shopInformationRoutes from './shopInformation';

const router = express.Router();

router.use('/appointments', appointmentRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/shop-information', shopInformationRoutes);

export default router; 