// 更新狗商品ID前缀从#改为D
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// 数据库连接
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pet-shop', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

// 定义宠物模型
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
  status: String,
  createdAt: Date,
  updatedAt: Date
});

const ShopPet = mongoose.model('ShopPet', shopPetSchema);

// 更新所有狗商品ID
const updateDogIds = async () => {
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
const main = async () => {
  let conn;
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