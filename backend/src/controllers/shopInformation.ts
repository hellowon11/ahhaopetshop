import { Request, Response } from 'express';
import { ShopInformation } from '../models/ShopInformation';
import axios from 'axios';

// 获取店铺信息
export const getShopInformation = async (req: Request, res: Response) => {
  try {
    const shopInfo = await ShopInformation.findOne();
    if (!shopInfo) {
      return res.status(404).json({ message: 'Shop information not found' });
    }
    res.json(shopInfo);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching shop information' });
  }
};

// 更新店铺信息
export const updateShopInformation = async (req: Request, res: Response) => {
  try {
    const { address, ...otherData } = req.body;

    // 如果地址发生变化，需要更新坐标
    if (address) {
      try {
        const formattedAddress = `${address.street}, ${address.city}, ${address.state} ${address.postalCode}, ${address.country}`;
        const shopInfo = await ShopInformation.findOne();
        const apiKey = shopInfo?.googleMapsApiKey || process.env.GOOGLE_MAPS_API_KEY;
        
        // 调用 Google Geocoding API 获取新地址的坐标
        const response = await axios.get(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(formattedAddress)}&key=${apiKey}`
        );

        // 添加类型断言
        const responseData = response.data as any;
        if (responseData.results && responseData.results.length > 0) {
          const location = responseData.results[0].geometry.location;
          address.coordinates = {
            latitude: location.lat,
            longitude: location.lng
          };
        }
      } catch (error) {
        console.error('Error updating coordinates:', error);
        return res.status(400).json({ message: 'Failed to get coordinates for the new address' });
      }
    }

    // 更新店铺信息
    const updatedShopInfo = await ShopInformation.findOneAndUpdate(
      {},
      { ...otherData, ...(address && { address }) },
      { new: true, upsert: true }
    );

    res.json(updatedShopInfo);
  } catch (error) {
    console.error('Error updating shop information:', error);
    res.status(500).json({ message: 'Error updating shop information' });
  }
};

// 更新店铺logo
export const updateShopLogo = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const logoUrl = req.file.path; // 假设你使用了文件上传中间件（如multer）
    const updatedShopInfo = await ShopInformation.findOneAndUpdate(
      {},
      { logo: logoUrl },
      { new: true }
    );

    res.json(updatedShopInfo);
  } catch (error) {
    res.status(500).json({ message: 'Error updating shop logo' });
  }
};

// 更新营业时间
export const updateBusinessHours = async (req: Request, res: Response) => {
  try {
    const { businessHours } = req.body;
    const updatedShopInfo = await ShopInformation.findOneAndUpdate(
      {},
      { businessHours },
      { new: true }
    );

    res.json(updatedShopInfo);
  } catch (error) {
    res.status(500).json({ message: 'Error updating business hours' });
  }
};

// 更新社交媒体链接
export const updateSocialMedia = async (req: Request, res: Response) => {
  try {
    const { socialMedia } = req.body;
    const updatedShopInfo = await ShopInformation.findOneAndUpdate(
      {},
      { socialMedia },
      { new: true }
    );

    res.json(updatedShopInfo);
  } catch (error) {
    res.status(500).json({ message: 'Error updating social media links' });
  }
}; 