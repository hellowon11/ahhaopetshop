import mongoose, { Document, Schema } from 'mongoose';

export interface IShopPet extends Document {
  petId: string;  // 例如 #001 或 C001 的格式
  name: string;
  breed: string;
  age: string;  // 例如 "2 months" 或 "1 year"
  gender: 'Male' | 'Female';
  imageUrl: string;
  type: 'dog' | 'cat';
  description?: string;
  isForSale: boolean; // 是否可售卖
  status: 'Listed' | 'Unlisted' | 'Sold'; // 商品状态
  createdAt: Date;
  updatedAt: Date;
}

const shopPetSchema = new Schema<IShopPet>(
  {
    petId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    breed: {
      type: String,
      required: true,
    },
    age: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female'],
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['dog', 'cat'],
      required: true,
    },
    description: {
      type: String,
    },
    isForSale: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['Listed', 'Unlisted', 'Sold'],
      default: 'Listed',
    },
  },
  {
    timestamps: true,
  }
);

// 创建索引以优化查询
shopPetSchema.index({ type: 1 });
shopPetSchema.index({ name: 1 });
shopPetSchema.index({ breed: 1 });
shopPetSchema.index({ isForSale: 1 });
shopPetSchema.index({ status: 1 });

export const ShopPet = mongoose.model<IShopPet>('ShopPet', shopPetSchema); 