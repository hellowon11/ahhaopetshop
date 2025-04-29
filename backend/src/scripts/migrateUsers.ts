import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User';

// 加载环境变量
dotenv.config();

// 连接数据库
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/pet-shop';
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  }
};

// 更新所有用户为已验证状态
const migrateUsers = async () => {
  try {
    console.log('Starting user verification migration...');
    
    // 查询需要更新的用户数量
    const unverifiedCount = await User.countDocuments({ isVerified: { $ne: true } });
    console.log(`Found ${unverifiedCount} unverified users`);
    
    // 更新所有用户为已验证状态
    const result = await User.updateMany(
      { isVerified: { $ne: true } }, 
      { $set: { isVerified: true } }
    );
    
    console.log(`Migration completed: ${result.modifiedCount} users updated to verified status`);
    return result.modifiedCount;
  } catch (err) {
    console.error('Error during migration:', err);
    throw err;
  }
};

// 执行迁移
const run = async () => {
  try {
    await connectDB();
    const updatedCount = await migrateUsers();
    console.log(`Successfully migrated ${updatedCount} users to verified status`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
};

run(); 