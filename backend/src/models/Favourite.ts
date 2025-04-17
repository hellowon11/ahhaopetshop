import mongoose, { Document, Schema } from 'mongoose';

export interface IFavourite extends Document {
  userId: string;
  petId: string;
  createdAt: Date;
  updatedAt: Date;
}

const favouriteSchema = new Schema<IFavourite>(
  {
    userId: {
      type: String,
      ref: 'User',
      required: true,
    },
    petId: {
      type: String,
      ref: 'ShopPet',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// 创建复合索引，确保每个用户对每个宠物只有一个收藏记录
favouriteSchema.index({ userId: 1, petId: 1 }, { unique: true });

export const Favourite = mongoose.model<IFavourite>('Favourite', favouriteSchema); 