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

// 更新所有狗商品ID
const updateDogIds = async (): Promise<void> => {
  try {
    // 获取所有狗商品
    const dogs = await ShopPet.find({ 
      type: 'dog',
      petId: { $regex: '^#' } // 只查找以#开头的ID
    });
    
    console.log(`找到 ${dogs.length} 只需要更新ID的狗`);
    
    // 逐个更新ID
    for (const dog of dogs) {
      const oldId = dog.petId;
      const newId = oldId.replace('#', 'D');
      
      // 更新ID
      await ShopPet.updateOne(
        { _id: dog._id },
        { $set: { petId: newId } }
      );
      
      console.log(`已更新: ${oldId} -> ${newId} (${dog.name})`);
    }
    
    console.log('所有狗商品ID更新完成');
  } catch (error) {
    console.error('更新狗商品ID时出错:', error);
  }
};

// 主函数
const main = async (): Promise<void> => {
  let conn: mongoose.Connection | null = null;
  try {
    conn = await connectDB();
    await updateDogIds();
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