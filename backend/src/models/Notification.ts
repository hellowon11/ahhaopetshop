import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['appointment', 'welcome', 'reminder', 'update', 'success', 'system'],
    default: 'system',
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// 为了向后兼容性，将isRead映射为read字段
notificationSchema.virtual('read').get(function() {
  return this.isRead;
});

// 导出模型时确保虚拟字段包含在JSON中
export const Notification = mongoose.model('Notification', notificationSchema); 