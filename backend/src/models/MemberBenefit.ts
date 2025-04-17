import mongoose, { Schema, Document } from 'mongoose';

// 折扣项接口
export interface IDiscountItem {
  serviceName: string;     // 服务名称 (Basic Grooming, Full Grooming, Spa Treatment)
  discountPercentage: number; // 折扣百分比 (8% = 8)
}

// 会员福利接口
export interface IMemberBenefit extends Document {
  benefitType: string;     // 福利类型 (birthdaySpecial, discounts)
  title: string;           // 福利名称 (Birthday Month Special, Grooming Discounts)
  description: string;     // 详细说明
  discountItems?: IDiscountItem[]; // 对应服务的折扣项
  iconName?: string;       // 前端显示用的图标名称
  active: boolean;         // 是否启用该福利
  updatedAt: Date;         // 最后更新时间
}

// 创建会员福利模型
const MemberBenefitSchema: Schema = new Schema({
  benefitType: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  discountItems: [{
    serviceName: { type: String, required: true },
    discountPercentage: { type: Number, required: true }
  }],
  iconName: { type: String },
  active: { type: Boolean, default: true },
  updatedAt: { type: Date, default: Date.now }
});

export const MemberBenefit = mongoose.model<IMemberBenefit>('MemberBenefit', MemberBenefitSchema); 