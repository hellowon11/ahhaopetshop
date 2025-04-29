import mongoose, { Document, Schema } from 'mongoose';

export interface IAppointment extends Document {
  _id: mongoose.Types.ObjectId;
  user?: mongoose.Types.ObjectId;
  petName: string;
  petType: 'dog' | 'cat';
  date: string | Date;
  time: string;
  utcDateTime?: Date;
  serviceType: string;
  serviceId: mongoose.Types.ObjectId;
  duration: number;
  dayCareOptions?: {
    type: 'daily' | 'longTerm';
    days?: number;
  };
  totalPrice: number;
  basePrice: number;      // 美容服务的原始价格
  discount: number;       // 折扣率
  dayCarePrice: number;   // 日托服务的价格
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  notes?: string;
  status: 'Booked' | 'Completed' | 'Cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const appointmentSchema = new Schema<IAppointment>({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  petName: { type: String, required: true },
  petType: { type: String, enum: ['dog', 'cat'], required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  utcDateTime: { type: Date },
  serviceType: { 
    type: String,
    required: true 
  },
  serviceId: {
    type: Schema.Types.ObjectId,
    ref: 'GroomingService',
    required: true
  },
  duration: { type: Number, required: true },
  dayCareOptions: {
    type: { type: String, enum: ['daily', 'longTerm'] },
    days: Number
  },
  totalPrice: { type: Number, required: true },
  basePrice: { type: Number, required: true },
  discount: { type: Number, required: true, default: 0 },
  dayCarePrice: { type: Number, required: true, default: 0 },
  ownerName: { type: String, required: true },
  ownerPhone: { type: String, required: true },
  ownerEmail: { type: String, required: true },
  notes: { type: String },
  status: { 
    type: String, 
    enum: ['Booked', 'Completed', 'Cancelled'],
    default: 'Booked'
  }
}, {
  timestamps: true
});

// 创建索引以优化查询性能
appointmentSchema.index({ date: 1, time: 1 });
appointmentSchema.index({ ownerEmail: 1 });
appointmentSchema.index({ utcDateTime: 1 });
appointmentSchema.index({ serviceId: 1 });

// 添加中间件来验证服务类型和同步 duration
appointmentSchema.pre('save', async function(next) {
  try {
    // 导入 GroomingService 模型
    const GroomingService = mongoose.model('GroomingService');
    
    // 查找对应的美容服务
    const service = await GroomingService.findById(this.serviceId);
    if (!service) {
      throw new Error(`Invalid service ID: ${this.serviceId}`);
    }
    
    // 同步 serviceType 和 duration
    this.serviceType = service.name;
    this.duration = service.duration;
    
    next();
  } catch (error) {
    next(error as Error);
  }
});

// 添加中间件来验证更新操作
appointmentSchema.pre('findOneAndUpdate', async function(next) {
  try {
    const update: any = this.getUpdate();
    if (update && update.serviceId) {
      // 导入 GroomingService 模型
      const GroomingService = mongoose.model('GroomingService');
      
      // 查找对应的美容服务
      const service = await GroomingService.findById(update.serviceId);
      if (!service) {
        throw new Error(`Invalid service ID: ${update.serviceId}`);
      }
      
      // 同步 serviceType 和 duration
      update.serviceType = service.name;
      update.duration = service.duration;
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

export const Appointment = mongoose.model<IAppointment>('Appointment', appointmentSchema); 