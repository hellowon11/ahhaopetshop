// 简单的宠物ID更新脚本
// 使用方法: node scripts/updatePetIdsSimple.js

const axios = require('axios');

// 配置API基础URL - 根据您的实际环境修改
const API_URL = 'http://localhost:4003/api'; // 根据您的API端点修改

// ID映射表
const ID_MAPPINGS = [
  { from: 'C003', to: 'C002' },
  { from: 'C005', to: 'C003' },
  { from: 'C007', to: 'C004' },
  { from: 'C009', to: 'C005' }
];

// 创建API实例
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 获取所有宠物
async function getAllPets() {
  try {
    const response = await api.get('/shop-pets');
    return response.data;
  } catch (error) {
    console.error('获取宠物列表失败:', error.message);
    return [];
  }
}

// 更新宠物ID
async function updatePetId(oldId, newId, pet) {
  try {
    // 获取宠物的完整信息
    const petData = {
      ...pet,
      petId: newId
    };
    
    // 删除可能导致问题的字段
    delete petData._id;
    delete petData.createdAt;
    delete petData.updatedAt;
    delete petData.__v;
    
    // 使用PUT请求更新宠物
    await api.put(`/shop-pets/${oldId}`, petData);
    console.log(`成功: ${oldId} → ${newId} (${pet.name})`);
    return true;
  } catch (error) {
    console.error(`更新宠物ID失败 ${oldId} → ${newId}:`, error.message);
    if (error.response) {
      console.error('服务器响应:', error.response.data);
    }
    return false;
  }
}

// 主函数
async function updatePetIds() {
  console.log('开始更新宠物ID...');
  
  // 获取所有宠物
  const pets = await getAllPets();
  if (pets.length === 0) {
    console.log('没有找到宠物或API连接失败');
    return;
  }
  
  console.log(`找到 ${pets.length} 个宠物`);
  
  // 创建ID到宠物对象的映射
  const petsMap = {};
  pets.forEach(pet => {
    petsMap[pet.petId] = pet;
  });
  
  // 检查ID冲突
  for (const mapping of ID_MAPPINGS) {
    if (petsMap[mapping.to] && !ID_MAPPINGS.some(m => m.from === mapping.to)) {
      console.error(`错误: 目标ID ${mapping.to} 已存在，无法继续更新`);
      return;
    }
  }
  
  // 执行ID更新
  const success = [];
  const failed = [];
  
  // 按照依赖顺序进行更新（从后往前）
  const reversedMappings = [...ID_MAPPINGS].reverse();
  
  for (const mapping of reversedMappings) {
    const pet = petsMap[mapping.from];
    if (!pet) {
      console.log(`警告: 未找到ID为 ${mapping.from} 的宠物`);
      failed.push(mapping);
      continue;
    }
    
    const result = await updatePetId(mapping.from, mapping.to, pet);
    if (result) {
      success.push(mapping);
    } else {
      failed.push(mapping);
    }
  }
  
  // 总结
  console.log('\n===== 更新总结 =====');
  console.log(`成功: ${success.length}`);
  console.log(`失败: ${failed.length}`);
  
  if (failed.length > 0) {
    console.log('\n失败的更新:');
    failed.forEach(f => console.log(`${f.from} → ${f.to}`));
  }
  
  console.log('\n操作完成');
}

// 运行脚本
updatePetIds(); 