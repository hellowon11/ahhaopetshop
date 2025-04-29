import mongoose from 'mongoose';
import dotenv from 'dotenv';
import app from './app';

dotenv.config();

// 设置时区为马来西亚时间 (UTC+8)
process.env.TZ = 'Asia/Kuala_Lumpur';
console.log(`服务器时区已设置为: ${process.env.TZ}`);
console.log(`当前服务器时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Kuala_Lumpur' })}`);

// 数据库连接
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pet-shop';
    console.log('正在连接到 MongoDB:', mongoURI);
    
    const conn = await mongoose.connect(mongoURI);
    console.log(`MongoDB 连接成功: ${conn.connection.host}`);
    
    // 监听数据库连接事件
    mongoose.connection.on('error', err => {
      console.error('MongoDB 连接错误:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB 连接断开');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB 重新连接成功');
    });

  } catch (error) {
    console.error('MongoDB 连接失败:', error);
    process.exit(1);
  }
};

// 启动服务器
const startServer = async () => {
  try {
    await connectDB();
    
    const PORT = Number(process.env.PORT) || 4003;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`服务器运行在端口 ${PORT}`);
      console.log(`你可以通过以下地址访问：`);
      console.log(`- 本机: http://localhost:${PORT}`);
      console.log(`- 局域网: 使用你电脑的IP地址，如http://192.168.x.x:${PORT}`);
    });
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
};

startServer(); 