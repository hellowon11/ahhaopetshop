// 直接使用MongoDB命令更新猫咪ID
// 用法: node scripts/directUpdateCatIds.js

const { MongoClient } = require('mongodb');

// 配置信息 - 根据您的环境修改
const DB_URI = 'mongodb://localhost:27017';
const DB_NAME = 'ah-hao-pet-shop';
const COLLECTION_NAME = 'shop_pets'; // MongoDB集合名通常是复数形式

// ID映射表
const idMappings = [
  { from: 'C003', to: 'C002' },
  { from: 'C005', to: 'C003' },
  { from: 'C007', to: 'C004' },
  { from: 'C009', to: 'C005' }
];

async function run() {
  let client;
  
  try {
    // 连接到MongoDB
    console.log('连接到MongoDB...');
    client = new MongoClient(DB_URI);
    await client.connect();
    console.log('连接成功!');
    
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);
    
    console.log(`使用数据库: ${DB_NAME}, 集合: ${COLLECTION_NAME}`);
    
    // 1. 检查目标ID是否已存在且不在映射列表中
    for (const mapping of idMappings) {
      const existing = await collection.findOne({ petId: mapping.to });
      if (existing && !idMappings.some(m => m.from === mapping.to)) {
        console.log(`警告: ID ${mapping.to} 已存在且不在映射列表中。将备份并替换。`);
        
        // 临时重命名以避免冲突
        await collection.updateOne(
          { petId: mapping.to },
          { $set: { petId: `${mapping.to}_old` } }
        );
        console.log(`已将冲突的 ${mapping.to} 重命名为 ${mapping.to}_old`);
      }
    }
    
    // 2. 使用临时ID避免更新过程中的冲突
    for (const mapping of idMappings) {
      const pet = await collection.findOne({ petId: mapping.from });
      if (pet) {
        await collection.updateOne(
          { petId: mapping.from },
          { $set: { petId: `${mapping.from}_temp` } }
        );
        console.log(`临时重命名: ${mapping.from} → ${mapping.from}_temp`);
      } else {
        console.log(`未找到ID: ${mapping.from}`);
      }
    }
    
    // 3. 更新为目标ID
    for (const mapping of idMappings) {
      const result = await collection.updateOne(
        { petId: `${mapping.from}_temp` },
        { $set: { petId: mapping.to } }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`成功更新: ${mapping.from} → ${mapping.to}`);
      } else {
        console.log(`更新失败: ${mapping.from} → ${mapping.to} (可能未找到源ID)`);
      }
    }
    
    // 4. 显示所有猫咪的当前状态
    console.log('\n更新后的猫咪列表:');
    const cats = await collection.find({ type: 'cat' }).sort({ petId: 1 }).toArray();
    
    if (cats.length === 0) {
      console.log('未找到任何猫咪');
    } else {
      cats.forEach(cat => {
        console.log(`${cat.petId}: ${cat.name} (${cat.breed})`);
      });
    }
    
    console.log('\n操作完成!');
  } catch (error) {
    console.error('出错:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('数据库连接已关闭');
    }
  }
}

// 运行脚本
run(); 