// 强制更新猫咪ID脚本
// 用法: node scripts/forceUpdateCatIds.js

require('dotenv').config();
const mongoose = require('mongoose');

// 连接信息 - 请根据您的环境进行修改
const MONGODB_URI = 'mongodb://localhost:27017/ah-hao-pet-shop';

// ID映射表
const idMappings = [
  { from: 'C003', to: 'C002' },
  { from: 'C005', to: 'C003' },
  { from: 'C007', to: 'C004' },
  { from: 'C009', to: 'C005' }
];

// 创建临时模型
const createTempModels = () => {
  const shopPetSchema = new mongoose.Schema({
    petId: String,
    name: String,
    breed: String,
    age: String,
    gender: String,
    imageUrl: String,
    type: String,
    description: String,
    isForSale: Boolean,
    status: String
  }, { 
    timestamps: true,
    collection: 'shop_pets' // 指定集合名称
  });

  // 如果模型已存在，先删除它
  try {
    if (mongoose.model('ShopPet')) {
      mongoose.deleteModel('ShopPet');
    }
  } catch (e) {
    // 模型不存在，忽略错误
  }

  return mongoose.model('ShopPet', shopPetSchema);
};

// 连接数据库并执行更新
async function run() {
  try {
    console.log('连接到数据库...');
    await mongoose.connect(MONGODB_URI);
    console.log('连接成功!');

    // 创建模型
    const ShopPet = createTempModels();

    // 1. 检查目标IDs是否存在冲突
    for (const mapping of idMappings) {
      const existing = await ShopPet.findOne({ petId: mapping.to });
      if (existing && !idMappings.some(m => m.from === mapping.to)) {
        console.log(`警告: ID ${mapping.to} 已存在且不在映射列表中。将备份并替换。`);
        
        // 给冲突的ID添加后缀
        await ShopPet.updateOne(
          { petId: mapping.to },
          { $set: { petId: `${mapping.to}_old` } }
        );
        console.log(`已将冲突的 ${mapping.to} 重命名为 ${mapping.to}_old`);
      }
    }

    // 2. 临时重命名所有源ID，避免更新过程中的冲突
    for (const mapping of idMappings) {
      const pet = await ShopPet.findOne({ petId: mapping.from });
      if (pet) {
        await ShopPet.updateOne(
          { petId: mapping.from },
          { $set: { petId: `${mapping.from}_temp` } }
        );
        console.log(`临时重命名: ${mapping.from} → ${mapping.from}_temp`);
      } else {
        console.log(`未找到: ${mapping.from}`);
      }
    }

    // 3. 正式更新ID
    for (const mapping of idMappings) {
      const result = await ShopPet.updateOne(
        { petId: `${mapping.from}_temp` },
        { $set: { petId: mapping.to } }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`成功: ${mapping.from} → ${mapping.to}`);
      } else {
        console.log(`失败: ${mapping.from} → ${mapping.to} (未找到源ID)`);
      }
    }

    // 4. 列出所有猫咪的当前ID
    const cats = await ShopPet.find({ type: 'cat' }).sort({ petId: 1 });
    console.log('\n更新后的猫咪ID:');
    cats.forEach(cat => {
      console.log(`${cat.petId}: ${cat.name} (${cat.breed})`);
    });

    console.log('\n操作完成!');
  } catch (error) {
    console.error('错误:', error);
  } finally {
    await mongoose.connection.close();
    console.log('数据库连接已关闭');
  }
}

// 执行脚本
run(); 