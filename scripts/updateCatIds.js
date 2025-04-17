// 脚本：更新猫咪的ID序列
// 使用方法：在项目根目录运行 node scripts/updateCatIds.js

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// 首先尝试加载模型
let ShopPet;
try {
  // 检查后端模型是否存在
  if (fs.existsSync(path.join(__dirname, '../backend/src/models/ShopPet.js'))) {
    // 加载后端模型
    require(path.join(__dirname, '../backend/src/models/ShopPet'));
    ShopPet = mongoose.model('ShopPet');
  } else if (fs.existsSync(path.join(__dirname, '../backend/src/models/ShopPet.ts'))) {
    // 这是TypeScript项目，我们需要先编译
    console.log('检测到TypeScript项目，请确保已编译TS文件');
    ShopPet = mongoose.model('ShopPet');
  } else {
    // 尝试直接连接数据库并直接修改数据
    console.log('未找到ShopPet模型，将创建临时模型');
    const shopPetSchema = new mongoose.Schema({
      petId: String,
      name: String,
      type: String,
      breed: String,
      age: String,
      gender: String,
      imageUrl: String,
      description: String,
      isForSale: Boolean,
      status: String
    });
    ShopPet = mongoose.model('ShopPet', shopPetSchema);
  }
} catch (error) {
  console.error('加载模型时出错:', error);
  process.exit(1);
}

// ID映射表
const idMapping = [
  { from: 'C003', to: 'C002' },
  { from: 'C005', to: 'C003' },
  { from: 'C007', to: 'C004' },
  { from: 'C009', to: 'C005' }
];

// 连接数据库
const connectDB = async () => {
  try {
    // 尝试从环境变量获取MongoDB URI
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ah-hao-pet-shop';
    await mongoose.connect(mongoURI);
    console.log('数据库连接成功');
  } catch (error) {
    console.error('数据库连接失败:', error);
    process.exit(1);
  }
};

// 更新猫咪ID
const updateCatIds = async () => {
  try {
    await connectDB();
    
    console.log('开始更新ID...');
    
    // 检查是否有冲突（如果目标ID已存在）
    for (const mapping of idMapping) {
      const existingTarget = await ShopPet.findOne({ petId: mapping.to });
      if (existingTarget) {
        console.error(`错误: 目标ID ${mapping.to} 已存在，请先处理这个冲突`);
        process.exit(1);
      }
    }
    
    // 执行更新操作
    for (const mapping of idMapping) {
      const result = await ShopPet.updateOne(
        { petId: mapping.from },
        { $set: { petId: mapping.to } }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`成功: ${mapping.from} 已更新为 ${mapping.to}`);
      } else {
        console.log(`注意: 未找到ID为 ${mapping.from} 的宠物`);
      }
    }
    
    console.log('ID更新完成');
    
    // 显示所有猫咪的ID
    const cats = await ShopPet.find({ type: 'cat' }).sort({ petId: 1 });
    console.log('\n当前所有猫咪:');
    cats.forEach(cat => {
      console.log(`${cat.petId}: ${cat.name} (${cat.breed})`);
    });
    
    mongoose.connection.close();
    console.log('\n数据库连接已关闭');
  } catch (error) {
    console.error('更新ID时出错:', error);
    process.exit(1);
  }
};

// 执行更新
updateCatIds(); 