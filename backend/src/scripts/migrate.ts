import mongoose from 'mongoose';
import { User } from '../models/User';
import { Pet } from '../models/Pet';
import { Notification } from '../models/Notification';
import { Appointment } from '../models/Appointment';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// 设置Mongoose调试模式
mongoose.set('debug', true);

// 添加连接事件监听器
mongoose.connection.on('connected', () => {
  console.log('MongoDB连接成功！');
  console.log('连接状态:', mongoose.connection.readyState);
  if (mongoose.connection.db) {
    console.log('数据库名称:', mongoose.connection.db.databaseName);
  }
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB连接错误:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB连接断开');
});

async function connectWithRetry(retries = 5, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`尝试连接MongoDB (尝试 ${i + 1}/${retries})...`);
      console.log('使用连接字符串:', process.env.MONGODB_URI);
      
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pet-shop');
      
      // 检查连接状态
      const state = mongoose.connection.readyState;
      console.log('MongoDB连接状态:', state);
      console.log('0 = disconnected');
      console.log('1 = connected');
      console.log('2 = connecting');
      console.log('3 = disconnecting');
      
      if (state === 1) {
        console.log('成功连接到MongoDB');
        return;
      } else {
        throw new Error(`连接状态异常: ${state}`);
      }
    } catch (error) {
      console.error(`连接失败 (尝试 ${i + 1}/${retries}):`, error);
      if (i < retries - 1) {
        console.log(`等待 ${delay/1000} 秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

async function migrateData() {
  try {
    console.log('开始数据迁移过程...');
    console.log('当前工作目录:', process.cwd());
    console.log('环境变量:', {
      MONGODB_URI: process.env.MONGODB_URI,
      PORT: process.env.PORT
    });
    
    // 连接数据库（带重试）
    await connectWithRetry();

    // 读取导出的数据文件
    const dataPath = path.join(__dirname, '../../pet-shop-data.json');
    console.log('正在读取数据文件:', dataPath);
    
    if (!fs.existsSync(dataPath)) {
      console.error('错误：找不到数据文件 pet-shop-data.json');
      console.log('请确保您已经从前端导出了数据文件');
      process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    console.log('成功读取数据文件，数据大小:', JSON.stringify(data).length, '字节');
    
    // 处理用户数据
    const userEmails = Object.keys(data).filter(key => key.startsWith('user_'));
    console.log(`找到 ${userEmails.length} 个用户`);

    // 迁移用户数据
    console.log('\n开始迁移用户数据...');
    for (const userKey of userEmails) {
      try {
        const userData = JSON.parse(data[userKey]);
        console.log('处理用户:', userData.email);
        
        const existingUser = await User.findOne({ email: userData.email });
        if (!existingUser) {
          const newUser = new User({
            email: userData.email,
            password: userData.password,
            name: userData.name,
            phone: userData.phone,
            role: userData.role || 'user'
          });
          await newUser.save();
          console.log(`✓ 已迁移用户: ${userData.email}`);
        } else {
          console.log(`- 用户已存在: ${userData.email}`);
        }
      } catch (error) {
        console.error(`× 迁移用户失败 ${userKey}:`, error);
      }
    }

    // 处理宠物数据
    const petKeys = Object.keys(data).filter(key => key.startsWith('pets_'));
    console.log(`\n开始迁移宠物数据...`);
    for (const petKey of petKeys) {
      try {
        const email = petKey.replace('pets_', '');
        console.log('处理用户的宠物:', email);
        
        const user = await User.findOne({ email });
        if (user) {
          const pets = JSON.parse(data[petKey] || '[]');
          for (const pet of pets) {
            const newPet = new Pet({
              name: pet.name,
              type: pet.type,
              breed: pet.breed,
              age: pet.age,
              gender: pet.gender,
              owner: user._id,
              medicalHistory: pet.medicalHistory || [],
              imageUrl: pet.imageUrl
            });
            await newPet.save();
            console.log(`✓ 已迁移宠物: ${pet.name}`);
          }
        } else {
          console.log(`- 找不到用户: ${email}`);
        }
      } catch (error) {
        console.error(`× 迁移宠物失败 ${petKey}:`, error);
      }
    }

    // 处理通知数据
    const notificationKeys = Object.keys(data).filter(key => key.startsWith('notifications_'));
    console.log(`\n开始迁移通知数据...`);
    for (const notificationKey of notificationKeys) {
      try {
        const email = notificationKey.replace('notifications_', '');
        console.log('处理用户的通知:', email);
        
        const user = await User.findOne({ email });
        if (user) {
          const notifications = JSON.parse(data[notificationKey] || '[]');
          for (const notification of notifications) {
            const newNotification = new Notification({
              user: user._id,
              title: notification.title,
              message: notification.message,
              isRead: notification.isRead || false,
              type: notification.type || 'system'
            });
            await newNotification.save();
            console.log(`✓ 已迁移通知: ${notification.title}`);
          }
        } else {
          console.log(`- 找不到用户: ${email}`);
        }
      } catch (error) {
        console.error(`× 迁移通知失败 ${notificationKey}:`, error);
      }
    }

    // 处理预约数据
    console.log(`\n开始迁移预约数据...`);
    try {
      const appointments = JSON.parse(data['appointments_[object Object]'] || '[]');
      const bookedAppointments = JSON.parse(data['bookedAppointments'] || '[]');
      
      console.log('找到预约数量:', bookedAppointments.length);
      
      for (const appointment of bookedAppointments) {
        const newAppointment = new Appointment({
          date: new Date(appointment.date),
          time: appointment.time,
          duration: appointment.duration,
          status: 'booked'
        });
        await newAppointment.save();
        console.log(`✓ 已迁移预约: ${appointment.date} ${appointment.time}`);
      }
    } catch (error) {
      console.error('× 迁移预约失败:', error);
    }

    console.log('\n数据迁移完成！');
    console.log('请检查MongoDB Atlas中的数据是否正确迁移');
    process.exit(0);
  } catch (error) {
    console.error('迁移过程中出错:', error);
    process.exit(1);
  }
}

migrateData(); 