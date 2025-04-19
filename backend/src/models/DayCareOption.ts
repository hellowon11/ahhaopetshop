import mongoose, { Document, Schema } from 'mongoose';

export interface IDayCareOption extends Document {
  type: 'daily' | 'longTerm';
  price: number;
  displayPrice: string;
  description: string;
  __v?: number;
}

const dayCareOptionSchema = new Schema<IDayCareOption>({
  type: {
    type: String,
    required: true,
    enum: ['daily', 'longTerm']
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  displayPrice: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  }
});

// 中间件：在保存前自动生成 displayPrice
dayCareOptionSchema.pre('save', function(next) {
  if (this.isModified('price')) {
    this.displayPrice = `RM ${this.price.toFixed(2)}`;
  }
  next();
});

// 中间件：在更新前自动生成 displayPrice
dayCareOptionSchema.pre('findOneAndUpdate', function(next) {
  const update: any = this.getUpdate();
  if (update && update.price !== undefined) {
    update.displayPrice = `RM ${update.price.toFixed(2)}`;
  }
  next();
});

export const DayCareOption = mongoose.model<IDayCareOption>('DayCareOption', dayCareOptionSchema); 