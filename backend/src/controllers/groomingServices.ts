import { Request, Response } from 'express';
import { GroomingService, IGroomingService } from '../models/GroomingService';
import { DayCareOption, IDayCareOption } from '../models/DayCareOption';

// 获取所有美容服务
export const getAllGroomingServices = async (req: Request, res: Response) => {
  try {
    const services = await GroomingService.find();
    return res.status(200).json(services);
  } catch (error) {
    console.error('Error fetching grooming services:', error);
    return res.status(500).json({ message: 'Failed to fetch grooming services' });
  }
};

// 创建美容服务
export const createGroomingService = async (req: Request, res: Response) => {
  try {
    const serviceData = req.body;
    const service = new GroomingService(serviceData);
    await service.save();
    return res.status(201).json(service);
  } catch (error) {
    console.error('Error creating grooming service:', error);
    return res.status(500).json({ message: 'Failed to create grooming service' });
  }
};

// 更新美容服务
export const updateGroomingService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log('Updating grooming service with ID:', id);
    console.log('Update data received:', JSON.stringify(updateData));
    
    // 添加额外的验证
    if (!updateData || Object.keys(updateData).length === 0) {
      console.error('Empty update data received');
      return res.status(400).json({ message: 'No update data provided' });
    }
    
    const updatedService = await GroomingService.findOneAndUpdate(
      { id: id },
      updateData,
      { new: true }
    );
    
    if (!updatedService) {
      console.error(`Service with ID ${id} not found`);
      return res.status(404).json({ message: 'Service not found' });
    }
    
    console.log('Service updated successfully:', JSON.stringify(updatedService));
    return res.status(200).json(updatedService);
  } catch (error) {
    console.error('Error updating grooming service:', error);
    return res.status(500).json({ message: 'Failed to update grooming service' });
  }
};

// 删除美容服务
export const deleteGroomingService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deletedService = await GroomingService.findOneAndDelete({ id: id });
    
    if (!deletedService) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    return res.status(200).json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error('Error deleting grooming service:', error);
    return res.status(500).json({ message: 'Failed to delete grooming service' });
  }
};

// 通过ID获取美容服务
export const getGroomingServiceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const service = await GroomingService.findOne({ id: id });
    
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    return res.status(200).json(service);
  } catch (error) {
    console.error('Error fetching grooming service:', error);
    return res.status(500).json({ message: 'Failed to fetch grooming service' });
  }
};

// 获取所有日托选项
export const getAllDayCareOptions = async (req: Request, res: Response) => {
  try {
    const options = await DayCareOption.find();
    return res.status(200).json(options);
  } catch (error) {
    console.error('Error fetching day care options:', error);
    return res.status(500).json({ message: 'Failed to fetch day care options' });
  }
};

// 创建日托选项
export const createDayCareOption = async (req: Request, res: Response) => {
  try {
    const optionData = req.body;
    const option = new DayCareOption(optionData);
    await option.save();
    return res.status(201).json(option);
  } catch (error) {
    console.error('Error creating day care option:', error);
    return res.status(500).json({ message: 'Failed to create day care option' });
  }
};

// 更新日托选项
export const updateDayCareOption = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const updateData = req.body;
    
    const updatedOption = await DayCareOption.findOneAndUpdate(
      { type: type },
      updateData,
      { new: true }
    );
    
    if (!updatedOption) {
      return res.status(404).json({ message: 'Day care option not found' });
    }
    
    return res.status(200).json(updatedOption);
  } catch (error) {
    console.error('Error updating day care option:', error);
    return res.status(500).json({ message: 'Failed to update day care option' });
  }
};

// 删除日托选项
export const deleteDayCareOption = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const deletedOption = await DayCareOption.findOneAndDelete({ type: type });
    
    if (!deletedOption) {
      return res.status(404).json({ message: 'Day care option not found' });
    }
    
    return res.status(200).json({ message: 'Day care option deleted successfully' });
  } catch (error) {
    console.error('Error deleting day care option:', error);
    return res.status(500).json({ message: 'Failed to delete day care option' });
  }
};

// 通过类型获取日托选项
export const getDayCareOptionByType = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const option = await DayCareOption.findOne({ type: type });
    
    if (!option) {
      return res.status(404).json({ message: 'Day care option not found' });
    }
    
    return res.status(200).json(option);
  } catch (error) {
    console.error('Error fetching day care option:', error);
    return res.status(500).json({ message: 'Failed to fetch day care option' });
  }
};

// 计算总价格（包括会员折扣）
export const calculateTotalPrice = async (req: Request, res: Response) => {
  try {
    const { serviceId, dayCareEnabled, dayCareType, dayCareDays, isMember } = req.body;
    
    // 获取服务价格
    const service = await GroomingService.findOne({ id: serviceId });
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    
    let totalPrice = service.price;
    
    // 添加日托价格（如果启用）
    if (dayCareEnabled) {
      const dayCareOption = await DayCareOption.findOne({ type: dayCareType });
      if (!dayCareOption) {
        return res.status(404).json({ message: 'Day care option not found' });
      }
      
      if (dayCareType === 'daily') {
        totalPrice += dayCareOption.price;
      } else if (dayCareType === 'longTerm') {
        const days = parseInt(dayCareDays) || 0;
        if (days > 1) {
          totalPrice += days * dayCareOption.price;
        }
      }
    }
    
    // 应用会员折扣
    if (isMember && service.discount > 0) {
      const discountMultiplier = (100 - service.discount) / 100;
      totalPrice = totalPrice * discountMultiplier;
    }
    
    // 四舍五入到两位小数
    totalPrice = Math.round(totalPrice * 100) / 100;
    
    return res.status(200).json({ totalPrice });
  } catch (error) {
    console.error('Error calculating total price:', error);
    return res.status(500).json({ message: 'Failed to calculate total price' });
  }
};

// 初始化默认服务和日托选项
export const initializeDefaultServices = async () => {
  try {
    // 检查是否已有服务数据
    const existingServices = await GroomingService.countDocuments();
    
    if (existingServices === 0) {
      // 创建默认美容服务
      const defaultServices = [
        {
          id: 'basic',
          name: 'Basic Grooming',
          description: 'Bath, brush, nail trim, ear cleaning',
          price: 60,
          displayPrice: 'RM 60',
          duration: 1,
          displayDuration: '1 hour',
          features: [
            { text: 'Bath with premium shampoo' },
            { text: 'Brushing and detangling' },
            { text: 'Nail trimming' },
            { text: 'Ear cleaning' },
          ],
          discount: 8, // 8% discount for members
          recommended: false
        },
        {
          id: 'premium',
          name: 'Premium Grooming',
          description: 'Basic + haircut, styling',
          price: 120,
          displayPrice: 'RM 120',
          duration: 3,
          displayDuration: '3 hours',
          features: [
            { text: 'Everything in Basic Grooming' },
            { text: 'Professional haircut' },
            { text: 'Custom styling' },
            { text: 'Sanitary trim' },
            { text: 'Paw pad trimming' },
          ],
          discount: 8, // 8% discount for members
          recommended: false
        },
        {
          id: 'spa',
          name: 'Spa Treatment',
          description: 'The ultimate luxurious pet relaxation',
          price: 220,
          displayPrice: 'RM 220',
          duration: 4,
          displayDuration: '4 hours',
          features: [
            { text: 'Everything in Premium Grooming' },
            { text: 'Aromatherapy bath' },
            { text: 'Deep conditioning treatment' },
            { text: 'Professional massage' },
            { text: 'Teeth brushing' },
            { text: 'Blueberry facial' },
          ],
          discount: 10, // 10% discount for members
          recommended: true
        }
      ];
      
      await GroomingService.insertMany(defaultServices);
      console.log('Default grooming services initialized');
    }
    
    // 检查是否已有日托选项
    const existingDayCareOptions = await DayCareOption.countDocuments();
    
    if (existingDayCareOptions === 0) {
      // 创建默认日托选项
      const defaultDayCareOptions = [
        {
          type: 'daily',
          price: 50,
          displayPrice: 'RM50',
          description: 'Daily pet day care service'
        },
        {
          type: 'longTerm',
          price: 80,
          displayPrice: 'RM80/day',
          description: 'Long term pet day care service'
        }
      ];
      
      await DayCareOption.insertMany(defaultDayCareOptions);
      console.log('Default day care options initialized');
    }
  } catch (error) {
    console.error('Error initializing default services:', error);
  }
}; 