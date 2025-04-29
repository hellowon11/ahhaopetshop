import { useState, useEffect } from 'react';
import { shopInfoService, ShopInformation } from '../services/shopInfoService';

export const useShopInfo = () => {
  const [shopInfo, setShopInfo] = useState<ShopInformation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadShopInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const info = await shopInfoService.getShopInfo();
      setShopInfo(info);
    } catch (err) {
      setError('Failed to load shop information');
      console.error('Error loading shop information:', err);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadShopInfo();
  }, []);

  // 刷新数据的方法
  const refreshShopInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const info = await shopInfoService.refreshShopInfo();
      setShopInfo(info);
    } catch (err) {
      setError('Failed to refresh shop information');
      console.error('Error refreshing shop information:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    shopInfo,
    loading,
    error,
    refreshShopInfo
  };
}; 