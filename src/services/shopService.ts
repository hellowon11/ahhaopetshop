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
let listeners: ((info: ShopInformation | null) => void)[] = [];

export const shopService = {
  // 获取店铺信息
  getShopInformation: async () => {
    try {
      // 如果已经有缓存的数据，直接返回
      if (cachedShopInfo) {
        return cachedShopInfo;
      }

      const response = await api.get('/shop-information');
      cachedShopInfo = response.data;
      
      // 通知所有监听器
      listeners.forEach(listener => listener(cachedShopInfo));
      
      return cachedShopInfo;
    } catch (error) {
      console.error('Error fetching shop information:', error);
      return null;
    }
  },

  // 订阅店铺信息更新
  subscribe: (listener: (info: ShopInformation | null) => void) => {
    listeners.push(listener);
    // 如果有缓存的数据，立即通知新的监听器
    if (cachedShopInfo) {
      listener(cachedShopInfo);
    }
    // 返回取消订阅的函数
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  },

  // 刷新店铺信息
  refreshShopInformation: async () => {
    try {
      const response = await api.get('/shop-information');
      cachedShopInfo = response.data;
      
      // 通知所有监听器
      listeners.forEach(listener => listener(cachedShopInfo));
      
      return cachedShopInfo;
    } catch (error) {
      console.error('Error refreshing shop information:', error);
      return null;
    }
  },

  // 获取格式化的营业时间
  getFormattedBusinessHours: () => {
    if (!cachedShopInfo) return null;
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    return days.map(day => ({
      day,
      ...cachedShopInfo.businessHours[day]
    }));
  },

  // 获取当前是否营业
  isCurrentlyOpen: () => {
    if (!cachedShopInfo) return false;

    const now = new Date();
    const day = now.toLocaleLowerCase().slice(0, 3);
    const currentTime = now.getHours() * 100 + now.getMinutes();

    const todayHours = cachedShopInfo.businessHours[day];
    if (!todayHours || !todayHours.isOpen) return false;

    const openTime = parseInt(todayHours.open.replace(':', ''));
    const closeTime = parseInt(todayHours.close.replace(':', ''));

    return currentTime >= openTime && currentTime < closeTime;
  },

  // 获取地图信息
  getMapInformation: () => {
    if (!cachedShopInfo) return null;
    
    return {
      address: cachedShopInfo.address,
      coordinates: cachedShopInfo.address.coordinates
    };
  }
}; 