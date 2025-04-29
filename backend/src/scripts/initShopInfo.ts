import mongoose from 'mongoose';
import { ShopInformation } from '../models/ShopInformation';
import dotenv from 'dotenv';

dotenv.config();

const initShopInformation = async () => {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pet-shop');

    // 检查是否已存在店铺信息
    const existingInfo = await ShopInformation.findOne();
    if (existingInfo) {
      console.log('Shop information already exists');
      return;
    }

    // 创建初始店铺信息
    const initialShopInfo = new ShopInformation({
      name: 'AH HAO PET SHOP',
      logo: '/images/logo.png',
      email: 'ahhaopetshop@gmail.com',
      phone: '60102568641',
      businessHours: {
        monday: {
          open: '10:00',
          close: '22:00',
          isOpen: true
        },
        tuesday: {
          open: '10:00',
          close: '22:00',
          isOpen: true
        },
        wednesday: {
          open: '10:00',
          close: '22:00',
          isOpen: true
        },
        thursday: {
          open: '10:00',
          close: '22:00',
          isOpen: true
        },
        friday: {
          open: '10:00',
          close: '22:00',
          isOpen: true
        },
        saturday: {
          open: '10:00',
          close: '22:00',
          isOpen: true
        },
        sunday: {
          open: '10:00',
          close: '22:00',
          isOpen: true
        }
      },
      socialMedia: {
        instagram: 'https://www.instagram.com/ahhaopetshop',
        facebook: 'https://www.facebook.com/ahhaopetshop',
        whatsapp: '60102568641'
      },
      address: {
        street: 'No.2, Jalan Persiaran Seksyen 1/3',
        city: 'Bandar Teknologi Kajang',
        state: 'Selangor',
        postalCode: '43500',
        country: 'Malaysia',
        coordinates: {
          latitude: 2.9927,
          longitude: 101.7909
        }
      }
    });

    // 保存到数据库
    await initialShopInfo.save();
    console.log('Shop information initialized successfully');

  } catch (error) {
    console.error('Error initializing shop information:', error);
  } finally {
    // 关闭数据库连接
    await mongoose.connection.close();
  }
};

// 运行初始化脚本
initShopInformation(); 