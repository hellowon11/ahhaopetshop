import express, { Request, Response } from 'express';
import { Appointment, IAppointment } from '../models/Appointment';
import { User } from '../models/User';
import { auth } from '../middleware/auth';
import mongoose, { Document } from 'mongoose';
import { AppointmentSettings } from '../models/AppointmentSettings';

interface AuthRequest extends Request {
  user?: {
    id: string;
  };
}

// Extend the IAppointment interface to make _id property type explicit
interface IAppointmentDocument extends IAppointment {
  _id: mongoose.Types.ObjectId;
  toObject: () => IAppointmentObject;
}

// Interface for appointment after converting to plain object
interface IAppointmentObject extends Omit<IAppointment, '_id'> {
  _id: mongoose.Types.ObjectId;
  status: 'Booked' | 'Completed' | 'Cancelled';
}

// Define a simplified time slot interface for API responses
interface TimeSlotResponse {
  time: string;
  currentBookings: number;
  isAvailable: boolean;
  maxBookings?: number;
}

const router = express.Router();

// 获取所有预约
router.get('/', auth, async (req: AuthRequest, res: Response) => {
  try {
    console.log('Getting appointment list, user ID:', req.user?.id);
    const appointments = await Appointment.find({ user: req.user?.id });
    
    // 检查是否有预约时间已过但状态仍为Booked的预约
    const currentDateTime = new Date();
    const needsUpdate: string[] = [];
    
    // 更新预约状态
    const updatedAppointments = appointments.map(appt => {
      // 如果已是Completed或Cancelled，不需要处理
      if (appt.status === 'Completed' || appt.status === 'Cancelled') {
        return appt;
      }
      
      // 获取预约日期和时间
      const apptDate = typeof appt.date === 'string' 
        ? appt.date.split('T')[0] 
        : new Date(appt.date).toISOString().split('T')[0];
      const apptTime = appt.time || '';
      
      // 创建马来西亚时间的日期对象用于比较
      const apptDateTime = new Date(`${apptDate}T${apptTime}`);
      
      // 如果预约时间已过但状态仍为Booked，更新为Completed
      if (apptDateTime < currentDateTime && appt.status === 'Booked') {
        console.log(`Auto-marking appointment ${appt._id} as Completed: ${apptDate} ${apptTime}`);
        needsUpdate.push(appt._id.toString());
        const updatedAppt = appt.toObject();
        updatedAppt.status = 'Completed';
        return updatedAppt;
      }
      
      return appt;
    });
    
    // 如果有需要更新的预约，在数据库中更新
    if (needsUpdate.length > 0) {
      console.log(`Updating ${needsUpdate.length} appointments to Completed`);
      await Appointment.updateMany(
        { _id: { $in: needsUpdate } },
        { $set: { status: 'Completed' } }
      );
    }
    
    console.log('Found appointments:', updatedAppointments.length);
    res.json(updatedAppointments);
  } catch (error) {
    console.error('Failed to get appointment list:', error);
    res.status(500).json({ message: 'Failed to get appointment information' });
  }
});

// 检查时间段可用性
router.get('/availability/:date/:time', async (req: Request, res: Response) => {
  try {
    const { date, time } = req.params;
    
    // 从时间字符串中获取小时数
    const hour = parseInt(time.split(':')[0]);
    
    // 查找该日期的所有非取消预约
    const existingAppointments = await Appointment.find({
      date,
      status: { $ne: 'Cancelled' }
    });
    
    // 计算当前时间段的预约数量
    let bookingsCount = 0;
    existingAppointments.forEach(appointment => {
      const appointmentStartHour = parseInt(appointment.time.split(':')[0]);
      const appointmentEndHour = appointmentStartHour + appointment.duration;
      
      // 检查是否有重叠
      if (hour >= appointmentStartHour && hour < appointmentEndHour) {
        bookingsCount++;
      }
    });
    
    // 获取系统配置的最大预约数
    const settings = await AppointmentSettings.findOne({ settingName: 'default' });
    const maxBookings = settings?.maxBookingsPerTimeSlot || 5; // 如果没有设置，默认为5
    
    const isAvailable = bookingsCount < maxBookings;
    console.log(`Availability check for ${date} ${time}: ${bookingsCount}/${maxBookings} bookings, available: ${isAvailable}`);
    
    res.json({ 
      isAvailable, 
      currentBookings: bookingsCount,
      maxBookings: maxBookings
    });
  } catch (error) {
    console.error('Failed to check availability:', error);
    res.status(500).json({ message: 'Failed to check time slot availability' });
  }
});

// 创建预约
router.post('/', async (req: Request, res: Response) => {
  try {
    console.log('Creating new appointment, user data:', req.body.ownerName);
    console.log('Appointment data:', JSON.stringify(req.body));
    
    const {
      petName,
      petType,
      date,
      time,
      utcDateTime,
      serviceType,
      dayCareOptions,
      ownerName,
      ownerPhone,
      ownerEmail,
      notes,
      duration,
      user: userId // 重命名接收的用户ID
    } = req.body;
    
    // 验证必填字段
    if (!petName || !petType || !date || !time || !serviceType || !ownerName || !ownerPhone || !ownerEmail || !duration) {
      return res.status(400).json({ message: 'Please provide all required information' });
    }

    // 标准化服务类型名称
    let normalizedServiceType = serviceType;
    console.log('原始服务类型:', serviceType);
    
    // 规范化服务类型
    if (typeof serviceType === 'string') {
      if (serviceType.includes('Premium') || serviceType.toLowerCase().includes('full')) {
        normalizedServiceType = 'Full Grooming';
      } else if (serviceType.includes('Spa') || serviceType.toLowerCase().includes('spa')) {
        normalizedServiceType = 'Spa Treatment';
      } else {
        normalizedServiceType = 'Basic Grooming';
      }
    }
    
    console.log('规范化后的服务类型:', normalizedServiceType);

    // 获取系统配置的最大预约数
    const settings = await AppointmentSettings.findOne({ settingName: 'default' });
    const maxBookings = settings?.maxBookingsPerTimeSlot || 5; // 如果没有设置，默认为5

    // 获取预约的开始时间（小时）
    const startHour = parseInt(time.split(':')[0]);
    
    // 检查每个受影响的时间段
    for (let hour = startHour; hour < startHour + duration; hour++) {
      const currentTime = `${hour.toString().padStart(2, '0')}:00`;
      
      // 查找该时间段的所有预约
      const existingAppointments = await Appointment.find({
        date,
        status: { $ne: 'Cancelled' }
      });
      
      // 计算当前时间段的预约数量
      let bookingsCount = 0;
      existingAppointments.forEach(appointment => {
        const appointmentStartHour = parseInt(appointment.time.split(':')[0]);
        const appointmentEndHour = appointmentStartHour + appointment.duration;
        
        // 检查是否有重叠
        if (hour >= appointmentStartHour && hour < appointmentEndHour) {
          bookingsCount++;
        }
      });
      
      // 如果任何时间段的预约数量达到或超过最大限制，拒绝创建
      if (bookingsCount >= maxBookings) {
        return res.status(400).json({ 
          message: `Time slot ${currentTime} is fully booked (${bookingsCount}/${maxBookings} bookings)` 
        });
      }
    }

    // 计算价格
    let totalPrice = 0;
    switch (normalizedServiceType) {
      case 'Basic Grooming':
        totalPrice = 60;
        break;
      case 'Full Grooming':
        totalPrice = 120;
        break;
      case 'Spa Treatment':
        totalPrice = 220;
        break;
    }

    // 如果有日托服务，添加日托费用
    if (dayCareOptions) {
      if (dayCareOptions.type === 'daily') {
        totalPrice += 50;
      } else if (dayCareOptions.type === 'longTerm' && typeof dayCareOptions.days === 'number') {
        totalPrice += dayCareOptions.days * 80;
      }
    }

    // 检查是否是会员并应用折扣
    const memberUser = await User.findOne({ email: ownerEmail });
    if (memberUser) {
      if (normalizedServiceType === 'Spa Treatment') {
        totalPrice *= 0.9; // 10% discount for Spa
      } else if (normalizedServiceType === 'Basic Grooming' || normalizedServiceType === 'Full Grooming') {
        totalPrice *= 0.92; // 8% discount for Basic and Full Grooming
      }
    }

    // 创建预约对象
    const appointmentData: any = {
      petName,
      petType,
      date,
      time,
      serviceType: normalizedServiceType,
      duration,
      dayCareOptions,
      totalPrice,
      ownerName,
      ownerPhone,
      ownerEmail,
      notes,
      status: 'Booked'
    };

    // 如果有用户ID，添加到预约数据中
    if (userId) {
      appointmentData.user = userId;
      console.log('Associating appointment with user ID:', userId);
    }
    
    // 如果提供了UTC日期时间，添加到数据库
    if (utcDateTime) {
      appointmentData.utcDateTime = new Date(utcDateTime);
    }

    const appointment = new Appointment(appointmentData);

    const savedAppointment = await appointment.save();
    console.log('Appointment saved successfully:', savedAppointment);
    res.status(201).json(savedAppointment);
  } catch (error) {
    console.error('Failed to create appointment:', error);
    res.status(500).json({ message: 'Failed to create appointment' });
  }
});

// 更新预约
router.put('/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    console.log('Updating appointment, ID:', req.params.id);
    console.log('Update data:', req.body);
    
    const {
      petName,
      petType,
      date,
      time,
      serviceType,
      dayCareOptions,
      ownerName,
      ownerPhone,
      ownerEmail,
      notes,
      status
    } = req.body;
    
    const appointment = await Appointment.findOneAndUpdate(
      { _id: req.params.id, user: req.user?.id },
      {
        petName,
        petType,
        date,
        time,
        serviceType,
        dayCareOptions,
        ownerName,
        ownerPhone,
        ownerEmail,
        notes,
        status
      },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found or unauthorized' });
    }

    console.log('Appointment updated successfully:', appointment);
    res.json(appointment);
  } catch (error) {
    console.error('Failed to update appointment:', error);
    res.status(500).json({ message: 'Failed to update appointment' });
  }
});

// 删除预约
router.delete('/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    console.log('Deleting appointment, ID:', req.params.id);
    
    const appointment = await Appointment.findOneAndDelete({ _id: req.params.id, user: req.user?.id });
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found or unauthorized' });
    }

    console.log('Appointment deleted successfully:', appointment);
    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Failed to delete appointment:', error);
    res.status(500).json({ message: 'Failed to delete appointment' });
  }
});

// 为未登录用户创建预约的端点
router.post('/guest', async (req: Request, res: Response) => {
  try {
    console.log('Creating new guest appointment');
    console.log('Appointment data:', JSON.stringify(req.body));
    
    const {
      petName,
      petType,
      date,
      time,
      utcDateTime,
      serviceType,
      dayCareOptions,
      ownerName,
      ownerPhone,
      ownerEmail,
      notes,
      duration,
      userId
    } = req.body;
    
    // 验证必填字段
    if (!petName || !petType || !date || !time || !serviceType || !ownerName || !ownerPhone || !ownerEmail || !duration) {
      return res.status(400).json({ message: 'Please provide all required information' });
    }

    // 标准化服务类型名称
    let normalizedServiceType = serviceType;
    console.log('原始服务类型:', serviceType);
    
    // 规范化服务类型
    if (typeof serviceType === 'string') {
      if (serviceType.includes('Premium') || serviceType.toLowerCase().includes('full')) {
        normalizedServiceType = 'Full Grooming';
      } else if (serviceType.includes('Spa') || serviceType.toLowerCase().includes('spa')) {
        normalizedServiceType = 'Spa Treatment';
      } else {
        normalizedServiceType = 'Basic Grooming';
      }
    }
    
    console.log('规范化后的服务类型:', normalizedServiceType);

    // 获取预约的开始时间（小时）
    const startHour = parseInt(time.split(':')[0]);
    
    // 检查每个受影响的时间段
    for (let hour = startHour; hour < startHour + duration; hour++) {
      const currentTime = `${hour.toString().padStart(2, '0')}:00`;
      
      // 查找该时间段的所有预约
      const existingAppointments = await Appointment.find({
        date,
        status: { $ne: 'Cancelled' }
      });
      
      // 计算当前时间段的预约数量
      let bookingsCount = 0;
      existingAppointments.forEach(appointment => {
        const appointmentStartHour = parseInt(appointment.time.split(':')[0]);
        const appointmentEndHour = appointmentStartHour + appointment.duration;
        
        // 检查是否有重叠
        if (hour >= appointmentStartHour && hour < appointmentEndHour) {
          bookingsCount++;
        }
      });
      
      // 如果任何时间段的预约数量达到或超过5，拒绝创建
      if (bookingsCount >= 5) {
        return res.status(400).json({ 
          message: `Time slot ${currentTime} is fully booked (${bookingsCount}/5 bookings)` 
        });
      }
    }

    // 计算价格
    let totalPrice = 0;
    switch (normalizedServiceType) {
      case 'Basic Grooming':
        totalPrice = 60;
        break;
      case 'Full Grooming':
        totalPrice = 120;
        break;
      case 'Spa Treatment':
        totalPrice = 220;
        break;
    }

    // 如果有日托服务，添加日托费用
    if (dayCareOptions) {
      if (dayCareOptions.type === 'daily') {
        totalPrice += 50;
      } else if (dayCareOptions.type === 'longTerm' && typeof dayCareOptions.days === 'number') {
        totalPrice += dayCareOptions.days * 80;
      }
    }

    // 检查是否是会员并应用折扣
    const user = await User.findOne({ email: ownerEmail });
    if (user) {
      if (normalizedServiceType === 'Spa Treatment') {
        totalPrice *= 0.9; // 10% discount for Spa
      } else if (normalizedServiceType === 'Basic Grooming' || normalizedServiceType === 'Full Grooming') {
        totalPrice *= 0.92; // 8% discount for Basic and Full Grooming
      }
    }

    // 创建预约对象 - 如果提供了userId则关联用户
    const appointmentData: any = {
      petName,
      petType,
      date,
      time,
      serviceType: normalizedServiceType,
      duration,
      dayCareOptions,
      totalPrice,
      ownerName,
      ownerPhone,
      ownerEmail,
      notes,
      status: 'Booked'
    };

    // 如果提供了UTC日期时间，添加到数据库
    if (utcDateTime) {
      appointmentData.utcDateTime = new Date(utcDateTime);
    }

    // 如果提供了userId则关联用户
    if (userId) {
      appointmentData.user = userId;
    }

    const appointment = new Appointment(appointmentData);

    const savedAppointment = await appointment.save();
    console.log('Guest appointment saved successfully:', savedAppointment);
    res.status(201).json(savedAppointment);
  } catch (error) {
    console.error('Failed to create guest appointment:', error);
    res.status(500).json({ message: 'Failed to create appointment' });
  }
});

// 获取用户的历史预约（已完成和已取消的预约）
router.get('/history', auth, async (req: AuthRequest, res: Response) => {
  try {
    console.log('Getting appointment history, user ID:', req.user?.id);
    
    // 先检查和更新所有过期预约
    const appointments = await Appointment.find({ user: req.user?.id });
    
    // 检查是否有预约时间已过但状态仍为Booked的预约
    const currentDateTime = new Date();
    const needsUpdate: string[] = [];
    
    // 识别需要更新的预约
    appointments.forEach(appt => {
      if (appt.status !== 'Booked') return;
      
      // 获取预约日期和时间
      const apptDate = typeof appt.date === 'string' 
        ? appt.date.split('T')[0] 
        : new Date(appt.date).toISOString().split('T')[0];
      const apptTime = appt.time || '';
      
      // 创建日期对象用于比较
      const apptDateTime = new Date(`${apptDate}T${apptTime}`);
      
      // 如果预约时间已过但状态仍为Booked，标记为Completed
      if (apptDateTime < currentDateTime) {
        console.log(`History: Auto-marking appointment ${appt._id} as Completed: ${apptDate} ${apptTime}`);
        needsUpdate.push(appt._id.toString());
      }
    });
    
    // 更新数据库中的过期预约
    if (needsUpdate.length > 0) {
      console.log(`History: Updating ${needsUpdate.length} appointments to Completed`);
      await Appointment.updateMany(
        { _id: { $in: needsUpdate } },
        { $set: { status: 'Completed' } }
      );
    }
    
    // 获取已更新的历史预约
    const historyAppointments = await Appointment.find({
      user: req.user?.id,
      $or: [
        { status: 'Completed' },
        { status: 'Cancelled' }
      ]
    }).sort({ date: -1, time: -1 }); // 按日期和时间倒序排列
    
    console.log('Found history appointments:', historyAppointments.length);
    res.json(historyAppointments);
  } catch (error) {
    console.error('Failed to get appointment history:', error);
    res.status(500).json({ message: 'Failed to get appointment history information' });
  }
});

// Get all appointments (simple implementation to fix the import error)
router.get('/', async (req: Request, res: Response) => {
  try {
    // Just return an empty array for now
    res.json([]);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ message: 'Failed to fetch appointments' });
  }
});

// Get appointment history
router.get('/history', async (req: Request, res: Response) => {
  try {
    // Just return an empty array for now
    res.json([]);
  } catch (error) {
    console.error('Error fetching appointment history:', error);
    res.status(500).json({ message: 'Failed to fetch appointment history' });
  }
});

// Get time slots
router.get('/time-slots/:date', async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    
    // 查找该日期的所有非取消预约
    const existingAppointments = await Appointment.find({
      date,
      status: { $ne: 'Cancelled' }
    });
    
    // 创建工作时间内的所有时间槽（10:00 - 21:00）
    const timeSlots: TimeSlotResponse[] = [];
    
    // 获取系统配置的最大预约数
    const settings = await AppointmentSettings.findOne({ settingName: 'default' });
    const maxBookings = settings?.maxBookingsPerTimeSlot || 5; // 如果没有设置，默认为5
    
    for (let hour = 10; hour <= 21; hour++) {
      const time = `${hour.toString().padStart(2, '0')}:00`;
      
      // 计算当前时间段的预约数量
      let bookingsCount = 0;
      existingAppointments.forEach(appointment => {
        const appointmentStartHour = parseInt(appointment.time.split(':')[0]);
        const appointmentEndHour = appointmentStartHour + appointment.duration;
        
        // 检查是否有重叠
        if (hour >= appointmentStartHour && hour < appointmentEndHour) {
          bookingsCount++;
        }
      });
      
      const isAvailable = bookingsCount < maxBookings;
      
      // 检查是否是过去的时间
      const isPastTime = (() => {
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];
        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();
        
        return date === currentDate && (hour < currentHour || (hour === currentHour && 0 < currentMinutes));
      })();
      
      timeSlots.push({
        time,
        currentBookings: bookingsCount,
        isAvailable: !isPastTime && isAvailable,
        maxBookings: maxBookings
      });
    }
    
    console.log(`Returning ${timeSlots.length} time slots for date ${date}`);
    res.json(timeSlots);
  } catch (error) {
    console.error('Error fetching time slots:', error);
    res.status(500).json({ message: 'Failed to fetch time slots' });
  }
});

export default router; 