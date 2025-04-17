import mongoose from 'mongoose';
import { ShopPet } from '../models/ShopPet';
import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// 数据库连接
const connectDB = async (): Promise<mongoose.Connection> => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pet-shop');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn.connection;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
};

// 恢复C002猫
const restoreC002 = async (): Promise<void> => {
  try {
    // 查找C002猫
    const cat = await ShopPet.findOne({ petId: 'C002' });
    
    if (cat) {
      console.log('找到C002猫:', cat);
      
      // 恢复为Listed状态
      cat.status = 'Listed';
      cat.isForSale = true;
      
      await cat.save();
      console.log('已成功恢复C002猫的状态为"Listed"');
    } else {
      console.log('数据库中未找到C002猫');
    }
  } catch (error) {
    console.error('恢复C002猫时出错:', error);
  }
};

// 主函数
const main = async (): Promise<void> => {
  let conn: mongoose.Connection | null = null;
  try {
    conn = await connectDB();
    await restoreC002();
  } catch (error) {
    console.error('程序执行出错:', error);
  } finally {
    // 关闭数据库连接
    if (conn) {
      await mongoose.connection.close();
      console.log('数据库连接已关闭');
    }
    process.exit(0);
  }
};

// 执行主函数
main(); 