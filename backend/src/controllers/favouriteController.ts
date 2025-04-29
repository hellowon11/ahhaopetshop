import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { Favourite } from '../models/Favourite';
import { ShopPet } from '../models/ShopPet';
import mongoose from 'mongoose';

// 获取用户的所有收藏宠物
export const getUserFavourites = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // 查找用户的所有收藏记录，并关联查询宠物详情
    const favourites = await Favourite.find({ userId })
      .populate('petId')
      .sort({ createdAt: -1 });

    return res.status(200).json(favourites.map(fav => ({
      _id: fav._id,
      pet: fav.petId
    })));
  } catch (error) {
    console.error('Error fetching favourites:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// 添加收藏
export const addFavourite = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { petId } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!petId) {
      return res.status(400).json({ message: 'Pet ID is required' });
    }

    // 验证宠物是否存在
    const pet = await ShopPet.findById(petId);
    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }

    // 创建或查找收藏记录
    let favourite = await Favourite.findOne({ userId, petId });
    
    if (favourite) {
      return res.status(400).json({ message: 'Pet already in favourites' });
    }

    // 创建新的收藏记录
    favourite = await Favourite.create({
      userId,
      petId
    });

    return res.status(201).json({ 
      message: 'Pet added to favourites',
      favourite: {
        _id: favourite._id,
        pet
      }
    });
  } catch (error) {
    console.error('Error adding favourite:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// 删除收藏
export const removeFavourite = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { petId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!petId) {
      return res.status(400).json({ message: 'Pet ID is required' });
    }

    // 查找并删除收藏记录
    const result = await Favourite.findOneAndDelete({ 
      userId, 
      petId
    });

    if (!result) {
      return res.status(404).json({ message: 'Favourite not found' });
    }

    return res.status(200).json({ message: 'Pet removed from favourites' });
  } catch (error) {
    console.error('Error removing favourite:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

// 检查宠物是否已被收藏
export const checkFavouriteStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { petId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const favourite = await Favourite.findOne({ 
      userId, 
      petId
    });

    return res.status(200).json({ isFavourite: !!favourite });
  } catch (error) {
    console.error('Error checking favourite status:', error);
    return res.status(500).json({ message: 'Server error' });
  }
}; 