import { Request, Response } from 'express';
import { GroomingService } from '../models/GroomingService';
import { Appointment } from '../models/Appointment';

const getAvailableSlots = async (req: Request, res: Response): Promise<void> => {
  try {
    const { date } = req.query as { date: string };
    
    // 获取所有服务及其容量限制
    const services = await GroomingService.find({});
    const servicesMap = new Map(
      services.map(service => [service.name, service.capacityLimit || 0])
    );

    // 获取当天的所有预约
    const appointments = await Appointment.find({
      date: new Date(date),
      status: { $ne: 'Cancelled' }
    });

    // 初始化时间槽
    const timeSlots: { [key: string]: number } = {};
    const workingHours = {
      start: 10, // 10 AM
      end: 22,   // 10 PM
    };

    // 为每个时间槽设置初始可用数量
    for (let hour = workingHours.start; hour < workingHours.end; hour++) {
      const time = `${hour.toString().padStart(2, '0')}:00`;
      // 使用默认的最大容量限制
      const defaultLimit = 5;
      timeSlots[time] = defaultLimit;
    }

    // 根据预约减少可用槽位
    appointments.forEach(appointment => {
      const time = appointment.time;
      if (timeSlots[time] !== undefined) {
        const serviceLimit = servicesMap.get(appointment.serviceType) || 5;
        if (typeof timeSlots[time] === 'number') {
          timeSlots[time] = Math.max(0, Math.min(
            serviceLimit - 1,
            timeSlots[time] - 1
          ));
        }
      }
    });

    // 过滤掉已经过去的时间槽
    const now = new Date();
    const today = new Date(date);
    if (today.toDateString() === now.toDateString()) {
      const currentHour = now.getHours();
      Object.keys(timeSlots).forEach(time => {
        const hour = parseInt(time.split(':')[0], 10);
        if (hour <= currentHour) {
          delete timeSlots[time];
        }
      });
    }

    res.json(timeSlots);
  } catch (error) {
    console.error('Error getting available slots:', error);
    res.status(500).json({ message: 'Error getting available slots' });
  }
}; 