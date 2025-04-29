import mongoose, { Schema, Document } from 'mongoose';

// 特性（描述服务包含的具体项目）
export interface IServiceFeature {
  text: string; // 特性文本描述
}

// 服务定义接口
export interface IGroomingService extends Document {
  id: string;               // 服务ID (basic, full, spa)
  name: string;             // 服务名称 (Basic Grooming, Full Grooming, Spa Treatment)
  description: string;      // 简短描述
  price: number;            // 价格（不含RM符号，纯数字）
  displayPrice: string;     // 显示价格（包含RM符号）
  duration: number;         // 服务时长（小时）
  displayDuration: string;  // 显示时长（例如：1 hour）
  features: IServiceFeature[]; // 服务包含的特性列表
  discount: number;         // 会员折扣（百分比，例如10表示10%折扣，0.9倍价格）
  recommended: boolean;     // 是否推荐 
  capacityLimit: number;    // 容量限制
}

// 创建服务模型
const GroomingServiceSchema: Schema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  displayPrice: { type: String, required: true },
  duration: { type: Number, required: true },
  displayDuration: { type: String, required: true },
  features: [{ 
    text: { type: String, required: true }
  }],
  discount: { type: Number, default: 0 },
  recommended: { type: Boolean, default: false },
  capacityLimit: { type: Number, default: 5 }
});

export const GroomingService = mongoose.model<IGroomingService>('GroomingService', GroomingServiceSchema); 