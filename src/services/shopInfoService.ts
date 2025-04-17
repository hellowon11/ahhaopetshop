import { api } from './api';

export interface ShopInformation {
  name: string;
  logo: string;
  email: string;
  phone: string;
  businessHours: {
    [key: string]: {
      open: string;
      close: string;
      isOpen: boolean;
    };
  };
  socialMedia: {
    instagram: string;
    facebook: string;
    whatsapp: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
}

// 创建一个全局状态来存储店铺信息
let cachedShopInfo: ShopInformation | null = null;

export const shopInfoService = {
  // 获取店铺信息
  getShopInfo: async () => {
    try {
      const response = await api.get('/shop-information');
      cachedShopInfo = response.data;
      return cachedShopInfo;
    } catch (error) {
      console.error('Error fetching shop information:', error);
      return null;
    }
  },

  // 强制刷新店铺信息
  refreshShopInfo: async () => {
    try {
      const response = await api.get('/shop-information');
      cachedShopInfo = response.data;
      return cachedShopInfo;
    } catch (error) {
      console.error('Error refreshing shop information:', error);
      return null;
    }
  },

  // 获取缓存的店铺信息
  getCachedShopInfo: () => {
    return cachedShopInfo;
  },

  // 更新店铺信息
  updateShopInfo: async (data: Partial<ShopInformation>) => {
    try {
      const response = await api.put('/shop-information', data);
      cachedShopInfo = response.data;
      return cachedShopInfo;
    } catch (error) {
      console.error('Error updating shop information:', error);
      throw error;
    }
  }
}; 