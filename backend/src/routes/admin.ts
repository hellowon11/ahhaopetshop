import express from 'express';
import { auth, AuthRequest } from '../middleware/auth';
import { isAdmin } from '../middleware/admin';
import { User } from '../models/User';
import { Appointment } from '../models/Appointment';
import { TimeSlot } from '../models/TimeSlot';

const router = express.Router();

// Middleware for all admin routes
router.use(auth);
router.use(isAdmin);

// Get all users
router.get('/users', async (req: AuthRequest, res) => {
  try {
    const users = await User.find({}).select('-password -token -tokenExpiresAt -resetPasswordToken -resetPasswordExpires');
    res.json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all appointments
router.get('/appointments', async (req: AuthRequest, res) => {
  try {
    const appointments = await Appointment.find({});
    
    // 检查是否有预约时间已过但状态仍为Booked的预约
    const currentDateTime = new Date();
    const needsUpdate: any[] = [];
    
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
      
      // 创建日期对象用于比较
      const apptDateTime = new Date(`${apptDate}T${apptTime}`);
      
      // 如果预约时间已过但状态仍为Booked，更新为Completed
      if (apptDateTime < currentDateTime && appt.status === 'Booked') {
        console.log(`Admin: Auto-marking appointment ${appt._id} as Completed: ${apptDate} ${apptTime}`);
        needsUpdate.push(appt._id);
        const updatedAppt = appt.toObject();
        updatedAppt.status = 'Completed';
        return updatedAppt;
      }
      
      return appt;
    });
    
    // 如果有需要更新的预约，在数据库中更新
    if (needsUpdate.length > 0) {
      console.log(`Admin: Updating ${needsUpdate.length} appointments to Completed`);
      await Appointment.updateMany(
        { _id: { $in: needsUpdate } },
        { $set: { status: 'Completed' } }
      );
    }
    
    res.json(updatedAppointments);
  } catch (error) {
    console.error('Error getting appointments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update appointment
router.put('/appointments/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { date, time, serviceType, notes, status, dayCareOptions, oldDateTime, oldServiceType } = req.body;

    // Validate input
    if (!date || !time || !serviceType || !status) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate status
    if (!['Booked', 'Completed', 'Cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    // Find the appointment to update
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Manage time slots - release old time slot
    if (oldDateTime && oldServiceType) {
      const oldDate = oldDateTime.split('T')[0];
      const oldTime = oldDateTime.split('T')[1];
      
      await TimeSlot.updateOne(
        { date: oldDate, time: oldTime },
        { $inc: { bookedCount: -1 } }
      );
    }

    // Prepare updated appointment data
    const appointmentData: any = {
      date,
      time,
      serviceType,
      notes,
      status
    };

    // Add daycare options if provided
    if (serviceType === 'Daycare' && dayCareOptions) {
      appointmentData.dayCareOptions = dayCareOptions;
    }

    // Check if date or time has changed and update time slot
    const newDateTime = `${date}T${time}`;
    if (newDateTime !== oldDateTime || serviceType !== oldServiceType) {
      // Book the new time slot
      await TimeSlot.updateOne(
        { date, time },
        { $inc: { bookedCount: 1 } },
        { upsert: true }
      );
    }

    // Update the appointment
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      id,
      appointmentData,
      { new: true }
    );

    res.json(updatedAppointment);
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete appointment
router.delete('/appointments/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { dateTime, serviceType } = req.query;

    // Find the appointment to delete
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Manage time slots - release the time slot
    if (dateTime && typeof dateTime === 'string') {
      const date = dateTime.split('T')[0];
      const time = dateTime.split('T')[1];
      
      await TimeSlot.updateOne(
        { date, time },
        { $inc: { bookedCount: -1 } }
      );
    }

    // Delete the appointment
    await Appointment.findByIdAndDelete(id);

    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 