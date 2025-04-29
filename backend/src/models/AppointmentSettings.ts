import mongoose from 'mongoose';

// 定义预约设置接口
interface IAppointmentSettings extends mongoose.Document {
  settingName: string;
  maxBookingsPerTimeSlot: number;
  updatedBy?: string;
  description?: string;
}

// 创建预约设置Schema
const appointmentSettingsSchema = new mongoose.Schema({
  settingName: {
    type: String,
    required: true,
    unique: true,
    default: 'default'
  },
  maxBookingsPerTimeSlot: {
    type: Number,
    required: true,
    default: 5
  },
  updatedBy: {
    type: String,
    ref: 'User'
  },
  description: {
    type: String
  }
}, {
  timestamps: true
});

// 创建和导出模型
export const AppointmentSettings = mongoose.model<IAppointmentSettings>(
  'AppointmentSettings', 
  appointmentSettingsSchema
);

// 初始化默认设置的函数
export const initializeDefaultSettings = async (): Promise<void> => {
  try {
    // 检查是否已存在默认设置
    const existingSettings = await AppointmentSettings.findOne({ 
      settingName: 'default' 
    });
    
    // 如果不存在，创建默认设置
    if (!existingSettings) {
      await AppointmentSettings.create({
        settingName: 'default',
        maxBookingsPerTimeSlot: 5,
        description: 'Default application settings'
      });
      console.log('Default appointment settings initialized');
    }
  } catch (error) {
    console.error('Failed to initialize default appointment settings:', error);
  }
}; 