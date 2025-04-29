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

    console.log('Admin updating appointment:', id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));

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

    // 特别处理dayCareOptions字段，专门解决MongoDB不更新null值的问题
    console.log('处理日托选项:', dayCareOptions === null ? '移除日托' : '更新日托');
    
    // 如果dayCareOptions是null，我们需要显式地从数据库中删除此字段
    if (dayCareOptions === null) {
      console.log('从数据库中删除日托选项');
      // 我们不在appointmentData中设置dayCareOptions
      // 而是在update操作中使用$unset
    } else if (dayCareOptions !== undefined) {
      // 只有当dayCareOptions有值且不是undefined时才设置
      console.log('更新日托选项:', JSON.stringify(dayCareOptions));
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
    console.log('最终更新数据:', JSON.stringify(appointmentData, null, 2));
    
    let updateOperation: any;
    if (dayCareOptions === null) {
      // 如果要删除dayCareOptions字段，使用$unset
      updateOperation = {
        $set: appointmentData,
        $unset: { dayCareOptions: 1 }
      };
    } else {
      // 否则只使用$set
      updateOperation = {
        $set: appointmentData
      };
    }
    
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      id,
      updateOperation,
      { new: true }
    );

    console.log('更新后的预约:', JSON.stringify(updatedAppointment, null, 2));
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