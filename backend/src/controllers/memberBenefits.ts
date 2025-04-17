import { Request, Response } from 'express';
import { MemberBenefit, IMemberBenefit } from '../models/MemberBenefit';

// 获取所有会员福利
export const getAllMemberBenefits = async (req: Request, res: Response) => {
  try {
    const benefits = await MemberBenefit.find({ active: true });
    return res.status(200).json(benefits);
  } catch (error) {
    console.error('Error fetching member benefits:', error);
    return res.status(500).json({ message: 'Failed to fetch member benefits' });
  }
};

// 通过类型获取会员福利
export const getMemberBenefitByType = async (req: Request, res: Response) => {
  try {
    const { benefitType } = req.params;
    const benefit = await MemberBenefit.findOne({ benefitType, active: true });
    
    if (!benefit) {
      return res.status(404).json({ message: 'Benefit not found' });
    }
    
    return res.status(200).json(benefit);
  } catch (error) {
    console.error('Error fetching member benefit:', error);
    return res.status(500).json({ message: 'Failed to fetch member benefit' });
  }
};

// 创建会员福利（仅管理员）
export const createMemberBenefit = async (req: Request, res: Response) => {
  try {
    const benefitData = req.body;
    
    // 检查是否已存在同类型福利
    const existingBenefit = await MemberBenefit.findOne({ benefitType: benefitData.benefitType });
    if (existingBenefit) {
      return res.status(400).json({ message: 'A benefit with this type already exists' });
    }
    
    const benefit = new MemberBenefit({
      ...benefitData,
      updatedAt: new Date()
    });
    
    await benefit.save();
    return res.status(201).json(benefit);
  } catch (error) {
    console.error('Error creating member benefit:', error);
    return res.status(500).json({ message: 'Failed to create member benefit' });
  }
};

// 更新会员福利（仅管理员）
export const updateMemberBenefit = async (req: Request, res: Response) => {
  try {
    const { benefitType } = req.params;
    const updateData = req.body;
    
    // 更新时间戳
    updateData.updatedAt = new Date();
    
    const updatedBenefit = await MemberBenefit.findOneAndUpdate(
      { benefitType },
      updateData,
      { new: true }
    );
    
    if (!updatedBenefit) {
      return res.status(404).json({ message: 'Benefit not found' });
    }
    
    return res.status(200).json(updatedBenefit);
  } catch (error) {
    console.error('Error updating member benefit:', error);
    return res.status(500).json({ message: 'Failed to update member benefit' });
  }
};

// 删除会员福利（仅管理员）
export const deleteMemberBenefit = async (req: Request, res: Response) => {
  try {
    const { benefitType } = req.params;
    const deletedBenefit = await MemberBenefit.findOneAndDelete({ benefitType });
    
    if (!deletedBenefit) {
      return res.status(404).json({ message: 'Benefit not found' });
    }
    
    return res.status(200).json({ message: 'Benefit deleted successfully' });
  } catch (error) {
    console.error('Error deleting member benefit:', error);
    return res.status(500).json({ message: 'Failed to delete member benefit' });
  }
};

// 初始化默认会员福利
export const initializeDefaultBenefits = async () => {
  try {
    const existingBenefits = await MemberBenefit.find();
    
    // 如果没有记录，插入默认福利
    if (existingBenefits.length === 0) {
      const defaultBenefits: Partial<IMemberBenefit>[] = [
        {
          benefitType: 'birthdaySpecial',
          title: 'Birthday Month Special',
          description: 'Get a FREE grooming session of any type for your pet during their birthday month! Simply show your IC at the counter for verification.',
          iconName: 'gift',
          active: true
        },
        {
          benefitType: 'discounts',
          title: 'Grooming Discounts',
          description: 'Members enjoy exclusive discounts on all our grooming services.',
          discountItems: [
            { serviceName: 'Basic Grooming', discountPercentage: 8 },
            { serviceName: 'Full Grooming', discountPercentage: 8 },
            { serviceName: 'Spa Treatment', discountPercentage: 10 }
          ],
          iconName: 'tag',
          active: true
        }
      ];
      
      await MemberBenefit.insertMany(defaultBenefits);
      console.log('Default member benefits initialized successfully');
    }
  } catch (error) {
    console.error('Error initializing default member benefits:', error);
  }
}; 