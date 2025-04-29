// 声明缺失的图标组件
declare const WhatsAppIcon: React.FC;
declare const InstagramIcon: React.FC;
declare const FacebookIcon: React.FC;
declare const Users: React.FC;
declare const LogOut: React.FC;
declare const Dog: React.FC;

// 声明缺失的函数和变量
declare const activeTab: string;
declare function setActiveTab(tab: string): void;
declare function isPastTime(time: string): boolean;
declare function handleTimeSelect(time: string): void;
declare function formatTime(time: string): string;

// 修补服务类型
declare module "../types" {
  interface Appointment {
    service: string;
    read?: boolean;
  }
  
  interface TimeSlot {
    currentBookings: number;
  }
  
  interface Notification {
    read: boolean;
  }
}

// 修补缺失的模块
declare module "cors" {
  const cors: any;
  export default cors;
}

declare module "dotenv" {
  const dotenv: any;
  export default dotenv;
}

// 修补 apiService 中的方法
declare module "../services/apiService" {
  interface ApiServiceFavourites {
    getAll: () => Promise<any[]>;
    add: (data: any) => Promise<any>;
    remove: (id: string) => Promise<any>;
  }
}

// 修补 axios 中的类型
declare module "axios" {
  export interface AxiosRequestConfig {
    [key: string]: any;
  }
}

// 修补 api 模块
declare module "./api" {
  export const api: any;
} 