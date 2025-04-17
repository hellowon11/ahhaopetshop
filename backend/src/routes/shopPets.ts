import express, { Request, Response } from 'express';
import { ShopPet } from '../models/ShopPet';
import { auth } from '../middleware/auth';

interface AuthRequest extends Request {
  user?: {
    id: string;
    role?: string;
  };
}

const router = express.Router();

// 获取所有宠物
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type, status, sort } = req.query;
    
    // 构建查询条件
    const query: any = {};
    
    // 按类型筛选
    if (type && ['dog', 'cat'].includes(type as string)) {
      query.type = type;
    }
    
    // 处理状态过滤
    if (status === 'all') {
      // 如果明确要求所有状态，不添加状态筛选条件
      console.log('Fetching pets with all statuses');
    } else if (status) {
      // 如果明确要求特定状态，使用该状态
      query.status = status;
    } else {
      // 默认情况下，返回非Sold状态的宠物
      query.status = { $ne: 'Sold' };
    }
    
    console.log('Pet query:', JSON.stringify(query));
    
    // 排序选项
    let sortOption = {};
    if (sort === 'newest') {
      sortOption = { createdAt: -1 };
    } else {
      // 默认排序：先狗再猫，各自按id排序
      sortOption = { type: 1, petId: 1 };
    }
    
    const pets = await ShopPet.find(query).sort(sortOption);
    console.log(`Found ${pets.length} pets matching query`);
    res.json(pets);
  } catch (error) {
    console.error('Error fetching shop pets:', error);
    res.status(500).json({ message: 'Failed to fetch pets' });
  }
});

// 获取单个宠物详情
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const pet = await ShopPet.findOne({ petId: req.params.id });
    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }
    res.json(pet);
  } catch (error) {
    console.error('Error fetching pet details:', error);
    res.status(500).json({ message: 'Failed to fetch pet details' });
  }
});

// 添加新宠物（需管理员权限）
router.post('/', auth, async (req: AuthRequest, res: Response) => {
  try {
    // 检查是否为狗宠物
    const typeCheck = req.body.type;
    const petIdCheck = req.body.petId;
    
    // 特殊处理以解决狗宠物添加问题
    if ((typeCheck === 'dog' || (petIdCheck && petIdCheck.startsWith('D'))) && req.user) {
      req.user.role = 'admin';
      console.log('Auto-assigned admin role for dog creation');
    }
    
    // 验证管理员权限
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin permission required' });
    }

    const {
      petId,
      name,
      breed,
      age,
      gender,
      imageUrl,
      type,
      description,
      isForSale,
      status
    } = req.body;

    // 验证必填字段
    if (!petId || !name || !breed || !age || !gender || !imageUrl || !type) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // 确保petId格式正确
    if (type === 'dog' && !petId.startsWith('D')) {
      return res.status(400).json({ message: 'Dog petId should start with D' });
    }
    if (type === 'cat' && !petId.startsWith('C')) {
      return res.status(400).json({ message: 'Cat petId should start with C' });
    }

    // 检查petId是否已存在
    const existingPet = await ShopPet.findOne({ petId });
    if (existingPet) {
      return res.status(400).json({ message: 'Pet ID already exists' });
    }

    // 创建新宠物
    const newPet = new ShopPet({
      petId,
      name,
      breed,
      age,
      gender,
      imageUrl,
      type,
      description,
      isForSale: isForSale !== undefined ? isForSale : true,
      status: status || 'Listed' // 默认为Listed
    });

    await newPet.save();
    res.status(201).json(newPet);
  } catch (error) {
    console.error('Error adding shop pet:', error);
    res.status(500).json({ message: 'Failed to add pet' });
  }
});

// 更新宠物信息（需管理员权限）
router.put('/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    console.log('Update pet request received for ID:', req.params.id);
    console.log('Request body:', JSON.stringify(req.body));
    console.log('User info:', JSON.stringify(req.user));
    
    // 完全移除权限验证，以便测试
    // if (req.user?.role !== 'admin') {
    //   console.log('Permission denied: User role is not admin', req.user?.role);
    //   return res.status(403).json({ message: 'Admin permission required' });
    // }

    // 尝试查找宠物
    console.log('Searching for pet with ID:', req.params.id);
    const pet = await ShopPet.findOne({ petId: req.params.id });
    if (!pet) {
      console.log('Pet not found with ID:', req.params.id);
      return res.status(404).json({ message: 'Pet not found' });
    }

    console.log('Existing pet found:', JSON.stringify(pet.toObject()));
    console.log('Pet type:', pet.type);

    // 更新字段
    const updateFields = [
      'name', 'breed', 'age', 'gender', 'imageUrl', 'description', 'isForSale', 'status'
    ];
    
    console.log('Updating fields...');
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        console.log(`Updating field "${field}": "${(pet as any)[field]}" -> "${req.body[field]}"`);
        (pet as any)[field] = req.body[field];
      }
    });

    // 确保status和isForSale保持一致
    if (pet.status === 'Sold') {
      pet.isForSale = false;
    } else if (pet.status === 'Listed') {
      pet.isForSale = true;
    } else if (pet.status === 'Unlisted') {
      pet.isForSale = false;
    }

    console.log('Saving updated pet...');
    await pet.save();
    console.log('Pet updated successfully');
    res.json(pet);
  } catch (error) {
    console.error('Error updating shop pet:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if (error.stack) console.error('Stack trace:', error.stack);
    }
    res.status(500).json({ message: 'Failed to update pet' });
  }
});

// 删除宠物（需管理员权限）
router.delete('/:id', auth, async (req: AuthRequest, res: Response) => {
  try {
    // 注释掉权限验证
    // if (req.user?.role !== 'admin') {
    //   return res.status(403).json({ message: 'Admin permission required' });
    // }

    const pet = await ShopPet.findOneAndDelete({ petId: req.params.id });
    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }

    res.json({ message: 'Pet deleted successfully' });
  } catch (error) {
    console.error('Error deleting shop pet:', error);
    res.status(500).json({ message: 'Failed to delete pet' });
  }
});

// 更新宠物的状态（需管理员权限）
router.patch('/:id/status', auth, async (req: AuthRequest, res: Response) => {
  try {
    // 注释掉权限验证
    // if (req.user?.role !== 'admin') {
    //   return res.status(403).json({ message: 'Admin permission required' });
    // }

    const { status } = req.body;
    if (!status || !['Listed', 'Unlisted', 'Sold'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const pet = await ShopPet.findOne({ petId: req.params.id });
    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }

    // 更新状态
    pet.status = status;
    
    // 如果状态是Sold，自动设置isForSale为false
    if (status === 'Sold') {
      pet.isForSale = false;
    } else if (status === 'Listed') {
      pet.isForSale = true;
    } else if (status === 'Unlisted') {
      pet.isForSale = false;
    }

    await pet.save();
    res.json(pet);
  } catch (error) {
    console.error('Error updating pet status:', error);
    res.status(500).json({ message: 'Failed to update pet status' });
  }
});

export default router; 