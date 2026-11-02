import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Calendar,
  Cat,
  Clock,
  Dog,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Phone,
  Mail,
  Edit2,
  Bell,
  Home,
  PlusCircle,
  Scissors,
  CheckCircle,
  ShoppingBag,
} from "lucide-react";
import PetProfiles from "../components/PetProfiles";
import Toast, { ToastState } from "../components/Toast";
import ConfirmDialog from "../components/ConfirmDialog";
import { Pet, Appointment, Notification, User } from "../types";
import { apiService } from "../services/apiService";
import { useNavigation } from "../contexts/NavigationContext";
import { formatToMalaysiaTime, formatToMalaysiaDate } from "../utils/dateUtils";
import {
  clearDashboardCache,
  getDashboardCache,
  prefetchDashboard,
  setDashboardCache,
  type DashboardCache,
  type DashboardDayCare,
  type DashboardService,
} from "../utils/dashboardCache";

type PricePopover = {
  id: string;
  top: number;
  left: number;
  basePrice: number;
  discountPct: number;
  discountAmount: number;
  total: number;
};

// Add custom scrollbar styles
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
`;

// Add style tag to head
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = scrollbarStyles;
  document.head.appendChild(style);
}

// 添加通知类型的 emoji 映射
const notificationEmoji: Record<Notification["type"], string> = {
  appointment: "📅",
  welcome: "👋",
  reminder: "⏰",
  update: "📝",
  success: "✅",
  system: "🔔",
};

// 格式化日期时间显示为12小时制
const formatDateTime = (appointment: Appointment): string => {
  // 创建日期对象
  if (appointment.date && appointment.time) {
    const dateObj = new Date(`${appointment.date}T${appointment.time}`);
    return dateObj.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  // 如果没有日期或时间
  return appointment.date
    ? `${appointment.date} ${appointment.time || ""}`
    : "Unknown time";
};

// 获取预约的时间戳，用于排序，确保正确时间顺序：10AM-11AM-12PM-1PM-2PM-3PM-4PM...
const getAppointmentTimestamp = (appointment: Appointment): number => {
  if (appointment.date && appointment.time) {
    const [hours, minutes] = appointment.time.split(":").map(Number);
    // 创建日期对象
    const dateObj = new Date(`${appointment.date}T${appointment.time}`);
    // 确保正确的排序
    return dateObj.getTime();
  }
  return 0;
};

type GroomingService = DashboardService;
type DayCareOption = DashboardDayCare;

const MemberDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { setReturningFromDashboard } = useNavigation();
  const navigate = useNavigate();
  const cached = getDashboardCache(user?._id);

  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [userProfile, setUserProfile] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    email: user?.email || "",
  });
  const [profileSnapshot, setProfileSnapshot] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    email: user?.email || "",
  });
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const showToast = useCallback(
    (message: string, type: ToastState["type"] = "success") => {
      setToast({ message, type });
    },
    [],
  );

  const clearToast = useCallback(() => setToast(null), []);

  const [notifications, setNotifications] = useState<Notification[]>(
    cached?.notifications ?? [],
  );
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>(
    [],
  );
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showAddPet, setShowAddPet] = useState(false);
  const [pets, setPets] = useState<Pet[]>(cached?.pets ?? []);
  const [appointments, setAppointments] = useState<Appointment[]>(
    cached?.appointments ?? [],
  );
  const [isRefreshing, setIsRefreshing] = useState(!cached);
  const [error, setError] = useState<string | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [confirmClearNotifications, setConfirmClearNotifications] =
    useState(false);
  const [pricePopover, setPricePopover] = useState<PricePopover | null>(null);
  const [services, setServices] = useState<GroomingService[]>(
    cached?.services ?? [],
  );
  const [dayCareOptions, setDayCareOptions] = useState<DayCareOption[]>(
    cached?.dayCareOptions ?? [],
  );

  // Admins belong in Admin Portal, not the member dashboard
  useEffect(() => {
    if (user?.role === "admin") {
      navigate("/admin-portal", { replace: true });
    }
  }, [user?.role, navigate]);

  // Always paint the shell immediately; hydrate from cache / prefetch in background
  useEffect(() => {
    if (!user?._id) return;

    let cancelled = false;

    const applyCache = (data: DashboardCache) => {
      setPets(data.pets);
      setAppointments(data.appointments);
      setNotifications(data.notifications);
      setServices(data.services);
      setDayCareOptions(data.dayCareOptions);
      setError(null);
    };

    const hydrate = async () => {
      const existing = getDashboardCache(user._id);
      if (existing) {
        applyCache(existing);
        setIsRefreshing(false);
      } else {
        setIsRefreshing(true);
      }

      const data = await prefetchDashboard(user._id);
      if (cancelled) return;

      if (data) {
        applyCache(data);
        setDashboardCache(data);
      } else if (!getDashboardCache(user._id)) {
        setError("Couldn’t load your dashboard. Please refresh and try again.");
      }
      setIsRefreshing(false);
    };

    hydrate();

    const shouldRefresh = sessionStorage.getItem("refreshDashboard");
    if (shouldRefresh === "true") {
      sessionStorage.removeItem("refreshDashboard");
      clearDashboardCache();
      hydrate();
    }

    const handleAppointmentCreated = () => {
      clearDashboardCache();
      hydrate();
    };

    window.addEventListener("appointmentCreated", handleAppointmentCreated);

    return () => {
      cancelled = true;
      window.removeEventListener(
        "appointmentCreated",
        handleAppointmentCreated,
      );
    };
  }, [user?._id]);

  // 计算未读通知数量
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // 标记通知为已读
  const markAsRead = async (notificationId: string) => {
    try {
      await apiService.notifications.markAsRead(notificationId);
      setNotifications(
        notifications.map((n) =>
          n._id === notificationId ? { ...n, isRead: true } : n,
        ),
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      setError("Operation failed. Please try again.");
    }
  };

  // 标记所有通知为已读
  const markAllAsRead = async () => {
    try {
      await apiService.notifications.markAllAsRead();
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
      showToast("All notifications marked as read");
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
      showToast("Failed to update notifications", "error");
    }
  };

  // 添加删除通知的函数
  const deleteNotification = async (notificationId: string) => {
    try {
      await apiService.notifications.delete(notificationId);
      setNotifications(notifications.filter((n) => n._id !== notificationId));
      showToast("Notification deleted");
    } catch (error) {
      console.error("Failed to delete notification:", error);
      showToast("Failed to delete notification", "error");
    }
  };

  // 切换选择模式
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedNotifications([]);
  };

  // 选择/取消选择单个通知
  const toggleNotificationSelection = (id: string) => {
    setSelectedNotifications((prev) =>
      prev.includes(id) ? prev.filter((nId) => nId !== id) : [...prev, id],
    );
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedNotifications.length === notifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(notifications.map((n) => n._id));
    }
  };

  // 删除选中的通知
  const deleteSelectedNotifications = async () => {
    try {
      await apiService.notifications.deleteMultiple(selectedNotifications);
      setNotifications(
        notifications.filter((n) => !selectedNotifications.includes(n._id)),
      );
      setSelectedNotifications([]);
      setIsSelectionMode(false);
      showToast("Selected notifications deleted");
    } catch (error) {
      console.error("Failed to delete selected notifications:", error);
      showToast("Failed to delete notifications", "error");
    }
  };

  // 删除所有通知
  const deleteAllNotifications = async () => {
    setConfirmClearNotifications(false);
    try {
      await apiService.notifications.deleteAll();
      setNotifications([]);
      setSelectedNotifications([]);
      setIsSelectionMode(false);
      showToast("All notifications cleared");
    } catch (error) {
      console.error("Failed to delete all notifications:", error);
      showToast("Couldn’t clear notifications", "error");
    }
  };

  // 将服务类型名称转换为后端服务ID
  const getServiceIdFromName = (serviceType: string): string => {
    console.log(`开始查找服务ID，服务名称: "${serviceType}"`);

    // 直接从 services 数组中查找匹配的服务
    const service = services.find((s) => s.name === serviceType);
    if (service) {
      console.log(
        `找到服务: ID=${service.id}, 名称=${service.name}, 价格=${service.price}, 折扣=${service.discount}%`,
      );
      return service.id;
    }

    // 如果没有直接匹配，尝试特殊情况处理
    if (serviceType === "Full Grooming") {
      // 查找 Premium Grooming 服务
      const premiumService = services.find(
        (s) => s.name === "Premium Grooming",
      );
      if (premiumService) {
        console.log(
          `Full Grooming 映射到 Premium Grooming: ID=${premiumService.id}`,
        );
        return premiumService.id;
      }
    }

    console.warn(`未找到服务"${serviceType}"的ID`);
    return "";
  };

  // 从服务ID获取美容服务
  const getServiceById = (serviceId: string): GroomingService | undefined => {
    if (!services || services.length === 0) {
      console.warn(`无法获取ID为"${serviceId}"的服务: 服务数据未加载`);
      return undefined;
    }

    console.log(
      `尝试查找服务ID: "${serviceId}"`,
      services.map((s) => `${s.id}(${s.name})`).join(", "),
    );
    const service = services.find((s) => s.id === serviceId);

    if (!service) {
      console.warn(`未找到ID为"${serviceId}"的服务`);
    } else {
      console.log(
        `找到服务: ID=${service.id}, 名称=${service.name}, 价格=${service.price}, 折扣=${service.discount}%`,
      );
    }

    return service;
  };

  // 获取服务对象，先从名称转换为ID，再根据ID获取服务
  const getServiceByName = (
    serviceType: string,
  ): GroomingService | undefined => {
    console.log(`通过名称获取服务: "${serviceType}"`);
    const serviceId = getServiceIdFromName(serviceType);

    if (!serviceId) {
      console.warn(`无法为"${serviceType}"获取服务ID`);
      return undefined;
    }

    // 获取服务
    const service = getServiceById(serviceId);

    // 检查是否找到服务，如果没找到，尝试直接匹配名称
    if (!service) {
      console.log(`通过ID "${serviceId}" 未找到服务，尝试直接匹配名称...`);
      const serviceByName = services.find((s) => s.name === serviceType);
      if (serviceByName) {
        console.log(
          `通过名称找到服务: ID=${serviceByName.id}, 名称=${serviceByName.name}`,
        );
        return serviceByName;
      }
    }

    console.log(
      `获取服务结果:`,
      service
        ? `成功 (ID=${service.id}, 名称=${service.name}, 折扣=${service.discount}%)`
        : "失败",
    );

    return service;
  };

  // 获取服务显示名称 - 优先使用API数据
  const getServiceDisplayName = (serviceType: string): string => {
    const service = getServiceByName(serviceType);

    if (service) {
      console.log(`显示服务名称: "${serviceType}" -> "${service.name}"`);
      return service.name;
    }

    // 后备逻辑，如果无法从API获取数据
    if (serviceType === "Full Grooming") {
      console.log("应用后备逻辑: Full Grooming -> Premium Grooming");
      return "Premium Grooming";
    }

    return serviceType;
  };

  // 查找服务的通用函数，包含多种查询策略
  const findService = (serviceType: string): GroomingService | undefined => {
    // 先通过ID查找
    const serviceId = getServiceIdFromName(serviceType);
    let service = services.find((s) => s.id === serviceId);

    // 如果找不到，尝试通过名称匹配
    if (!service) {
      service = services.find((s) => s.name === serviceType);
    }

    // 如果还找不到，对于Premium/Full Grooming特殊处理
    if (
      !service &&
      (serviceType === "Premium Grooming" || serviceType === "Full Grooming")
    ) {
      // 尝试查找任何包含Premium或Full的服务
      service = services.find(
        (s) =>
          s.name.includes("Premium") ||
          s.name.includes("Full") ||
          s.id === "Premium" ||
          s.id === "full" ||
          s.id === "premium",
      );
    }

    if (service) {
      console.log(
        `找到服务 "${serviceType}": ID=${service.id}, 名称=${service.name}, 价格=${service.price}, 折扣=${service.discount}%`,
      );
    } else {
      console.warn(`无法找到服务 "${serviceType}", 已尝试所有查找策略`);
    }

    return service;
  };

  // 计算基本价格 - 完全基于API数据
  const calculateBasePrice = (serviceType: string): number => {
    // 使用增强的服务查找逻辑
    const service = findService(serviceType);

    if (service) {
      console.log(`服务${serviceType}的基础价格(从API): RM${service.price}`);
      return service.price;
    }

    // 后备逻辑，只在API获取失败时使用
    let fallbackPrice = 0;

    switch (serviceType) {
      case "Basic Grooming":
        fallbackPrice = 70;
        break;
      case "Premium Grooming":
      case "Full Grooming":
        fallbackPrice = 140;
        break;
      case "Spa Treatment":
        fallbackPrice = 220;
        break;
      default:
        fallbackPrice = 0;
    }

    console.warn(
      `无法从API获取${serviceType}价格，使用后备价格: RM${fallbackPrice}`,
    );
    return fallbackPrice;
  };

  // 计算日托价格 - 完全基于API数据
  const calculateDayCarePrice = (
    options?: Appointment["dayCareOptions"],
  ): number => {
    if (!options || !options.type) {
      console.log("No daycare options provided");
      return 0;
    }

    if (!dayCareOptions || dayCareOptions.length === 0) {
      console.warn("No daycare options available from API");
      return 0;
    }

    const option = dayCareOptions.find((o) => o.type === options.type);
    if (!option) {
      console.warn(`Daycare option not found for type: ${options.type}`);
      return 0;
    }

    const days = options.days ?? 1;
    let price = 0;
    if (options.type === "daily") {
      price = option.price;
      console.log(`Daily daycare price from API: RM${price}`);
    } else {
      price = days * option.price;
      console.log(
        `Long-term daycare price from API: ${days} days * RM${option.price} = RM${price}`,
      );
    }

    return price;
  };

  // 计算会员折扣额 - 完全基于API数据
  const calculateDiscountAmount = (serviceType: string): number => {
    console.log(`开始计算折扣金额: "${serviceType}"`);

    // 使用增强的服务查找逻辑
    const service = findService(serviceType);

    if (!service) {
      console.warn(`找不到服务数据，无法计算折扣: ${serviceType}`);
      return 0;
    }

    // 获取基础价格和折扣率
    const basePrice = service.price;
    const discountRate = service.discount;

    // 如果服务有折扣，计算折扣金额
    if (discountRate > 0) {
      // 确保折扣率为正数，并且正确应用折扣计算公式
      const validDiscountRate = Math.max(0, Math.min(100, discountRate));
      const discountAmount = basePrice * (validDiscountRate / 100);

      console.log(`服务"${serviceType}"(${service.id})的折扣计算详情:`, {
        serviceId: service.id,
        basePrice: `RM${basePrice}`,
        discountRate: `${validDiscountRate}%`,
        discountAmount: `RM${discountAmount.toFixed(2)}`,
      });

      // 四舍五入到两位小数
      return Math.round(discountAmount * 100) / 100;
    }

    console.log(
      `服务"${serviceType}"(${service.id})无折扣，折扣率:${discountRate}%`,
    );
    return 0;
  };

  // 计算总价 - 完全基于API数据
  const calculateTotalPrice = (
    serviceType: string,
    options?: { type: "daily" | "longTerm"; days: number },
  ): number => {
    console.log(`开始计算总价: "${serviceType}"`);
    // 获取服务对象 - 使用增强的服务查找逻辑
    const service = findService(serviceType);

    if (!service) {
      console.warn(`找不到服务数据，使用后备计算: ${serviceType}`);
      // 使用后备逻辑，调用另外两个函数
      const basePrice = calculateBasePrice(serviceType);
      const dayCarePrice = calculateDayCarePrice(options);
      return Math.round((basePrice + dayCarePrice) * 100) / 100;
    }

    // 从API获取基础价格和折扣率
    const basePrice = service.price;
    const discountRate = service.discount || 0;

    // 获取日托价格
    const dayCarePrice = calculateDayCarePrice(options);

    // 计算总价 - 注意：只对美容服务应用折扣，日托服务不享受折扣
    let totalPrice = basePrice + dayCarePrice;
    let discountAmount = 0;

    if (discountRate > 0) {
      // 确保折扣率为正数，并且正确应用折扣计算公式
      const validDiscountRate = Math.max(0, Math.min(100, discountRate));

      // 计算折扣金额 - 只针对美容服务，不包括日托
      discountAmount = basePrice * (validDiscountRate / 100);

      // 更新总价 = 基础价格 - 折扣金额 + 日托价格
      totalPrice = basePrice - discountAmount + dayCarePrice;

      console.log(`总价计算详情: ${serviceType}`, {
        serviceId: service.id,
        basePrice: `RM${basePrice}`,
        discount: `${validDiscountRate}%`,
        discountAmount: `RM${discountAmount.toFixed(2)}`,
        discountedServicePrice: `RM${(basePrice - discountAmount).toFixed(2)}`,
        dayCarePrice: `RM${dayCarePrice.toFixed(2)}`,
        totalPrice: `RM${totalPrice.toFixed(2)}`,
      });
    } else {
      console.log(`总价计算(无折扣): ${serviceType}`, {
        serviceId: service.id,
        basePrice: `RM${basePrice}`,
        dayCarePrice: `RM${dayCarePrice.toFixed(2)}`,
        totalPrice: `RM${totalPrice.toFixed(2)}`,
      });
    }

    // 四舍五入到两位小数
    return Math.round(totalPrice * 100) / 100;
  };

  const openPricePopover = (
    e: React.MouseEvent<HTMLButtonElement>,
    appointmentId: string,
    details: Omit<PricePopover, "id" | "top" | "left">,
  ) => {
    e.stopPropagation();
    if (pricePopover?.id === appointmentId) {
      setPricePopover(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const width = 176; // w-44
    const left = Math.min(
      Math.max(8, rect.right - width),
      window.innerWidth - width - 8,
    );
    const top = rect.bottom + 6;
    setPricePopover({ id: appointmentId, top, left, ...details });
  };

  useEffect(() => {
    if (!pricePopover) return;
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      const pop = document.querySelector(".price-details-popover");
      const toggles = document.querySelectorAll(".price-toggle-button");
      if (pop?.contains(target)) return;
      for (const btn of toggles) {
        if (btn.contains(target)) return;
      }
      setPricePopover(null);
    };
    const closeOnScroll = () => setPricePopover(null);
    document.addEventListener("click", close);
    window.addEventListener("scroll", closeOnScroll, true);
    return () => {
      document.removeEventListener("click", close);
      window.removeEventListener("scroll", closeOnScroll, true);
    };
  }, [pricePopover]);

  const handleBackToHome = () => {
    navigate("/", { replace: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelProfileEdit = () => {
    setUserProfile(profileSnapshot);
    setIsEditing(false);
  };

  const startProfileEdit = () => {
    setProfileSnapshot({ ...userProfile });
    setIsEditing(true);
  };

  const toggleProfileEdit = () => {
    if (isEditing) {
      cancelProfileEdit();
    } else {
      startProfileEdit();
    }
  };

  const closeProfileDropdown = () => {
    if (isEditing) {
      cancelProfileEdit();
    }
    setShowProfile(false);
  };

  // 点击外部关闭下拉菜单；编辑中未保存则还原
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        !target.closest(".notification-dropdown") &&
        !target.closest(".notification-bell-button")
      ) {
        setShowNotifications(false);
      }

      if (
        !target.closest(".profile-dropdown") &&
        !target.closest(".profile-button")
      ) {
        setIsEditing((editing) => {
          if (editing) {
            setUserProfile(profileSnapshot);
          }
          return false;
        });
        setShowProfile(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileSnapshot]);

  const handleProfileUpdate = async () => {
    try {
      setIsSavingProfile(true);

      if (!userProfile.name.trim() || !userProfile.phone.trim()) {
        window.alert("Name and phone number are required");
        return;
      }

      const updatedUser = await apiService.user.update({
        name: userProfile.name.trim(),
        phone: userProfile.phone.trim(),
      });

      const nextProfile = {
        name: updatedUser.name,
        phone: updatedUser.phone,
        email: updatedUser.email,
      };
      setUserProfile(nextProfile);
      setProfileSnapshot(nextProfile);
      setIsEditing(false);
      showToast("Profile updated successfully");
    } catch (error: any) {
      console.error("Failed to update profile:", error);
      showToast(
        error.message || "Failed to update profile. Please try again.",
        "error",
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  // 处理宠物添加（提示由 PetProfiles 显示；此处不整页 Loading）
  const handleAddPet = async (petData: Omit<Pet, "_id">) => {
    if (!user || !user._id) {
      throw new Error(
        "Authentication error. Please try logging out and logging in again.",
      );
    }

    const newPet = await apiService.pets.add({
      ...petData,
      owner: user._id,
    });

    setPets((prevPets) => [...prevPets, newPet]);
    setShowAddPet(false);
  };

  const handleUpdatePet = async (id: string, petData: Partial<Pet>) => {
    const updatedPet = await apiService.pets.update(id, petData);
    setPets((prev) => prev.map((pet) => (pet._id === id ? updatedPet : pet)));
  };

  const handleDeletePet = async (id: string) => {
    await apiService.pets.delete(id);
    setPets((prev) => prev.filter((pet) => pet._id !== id));
  };

  const handleAddAppointment = async (
    appointmentData: Omit<Appointment, "_id">,
  ) => {
    try {
      const newAppointment = await apiService.appointments.add(appointmentData);
      setAppointments([...appointments, newAppointment]);
      showToast("Appointment added successfully");
    } catch (error) {
      console.error("Failed to add appointment:", error);
      showToast("Failed to add appointment. Please try again.", "error");
      throw error;
    }
  };

  // Handle appointment update
  const handleUpdateAppointment = async (
    id: string,
    appointmentData: Partial<Appointment>,
  ) => {
    try {
      console.log("更新预约数据:", appointmentData);

      // 如果更新包含服务类型，确保使用正确的服务ID
      if (appointmentData.serviceType) {
        const serviceId = getServiceIdFromName(appointmentData.serviceType);
        if (!serviceId) {
          throw new Error(`无法找到服务"${appointmentData.serviceType}"的ID`);
        }

        // 获取服务信息
        const service = getServiceById(serviceId);
        if (!service) {
          throw new Error(`无法找到ID为"${serviceId}"的服务信息`);
        }

        // 创建完整的更新数据
        const updateData: Partial<Appointment> & {
          serviceId: string;
          serviceType: "Basic Grooming" | "Premium Grooming" | "Spa Treatment";
          duration: number;
          totalPrice: number;
          basePrice: number;
          discount?: number;
          dayCarePrice?: number;
        } = {
          ...appointmentData,
          serviceId,
          serviceType: service.name as
            "Basic Grooming" | "Premium Grooming" | "Spa Treatment",
          duration: service.duration,
          basePrice: service.price,
          totalPrice: service.price,
        };

        // 计算日托价格
        if (appointmentData.dayCareOptions) {
          const dayCarePrice = calculateDayCarePrice(
            appointmentData.dayCareOptions,
          );
          updateData.totalPrice += dayCarePrice;
          updateData.dayCarePrice = dayCarePrice;
        }

        // 如果是会员，应用折扣
        const discountAmount = calculateDiscountAmount(service.name);
        if (discountAmount > 0) {
          updateData.totalPrice = updateData.totalPrice - discountAmount;
          updateData.discount = service.discount;
        }

        // 四舍五入到两位小数
        updateData.totalPrice = Math.round(updateData.totalPrice * 100) / 100;

        console.log("更新后的预约数据:", {
          serviceId: updateData.serviceId,
          serviceName: updateData.serviceType,
          basePrice: updateData.basePrice,
          discount: updateData.discount,
          dayCarePrice: updateData.dayCarePrice,
          totalPrice: updateData.totalPrice,
        });

        // 使用更新后的数据
        appointmentData = updateData;
      }

      const updatedAppointment = await apiService.appointments.update(
        id,
        appointmentData,
      );
      setAppointments(
        appointments.map((appointment) =>
          appointment._id === id ? updatedAppointment : appointment,
        ),
      );
      showToast("Appointment updated successfully");
    } catch (error) {
      console.error("更新预约失败:", error);
      showToast("Failed to update appointment. Please try again.", "error");
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    try {
      await apiService.appointments.delete(id);
      setAppointments(
        appointments.filter((appointment) => appointment._id !== id),
      );
      showToast("Appointment deleted successfully");
    } catch (error) {
      console.error("Failed to delete appointment:", error);
      showToast("Failed to delete appointment. Please try again.", "error");
    }
  };

  const handleMarkNotificationAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification._id === id
          ? { ...notification, isRead: true }
          : notification,
      ),
    );
    try {
      await apiService.notifications.markAsRead(id);
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      setNotifications((prev) =>
        prev.map((notification) =>
          notification._id === id
            ? { ...notification, isRead: false }
            : notification,
        ),
      );
      showToast("Failed to update notification", "error");
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await apiService.notifications.delete(id);
      setNotifications(
        notifications.filter((notification) => notification._id !== id),
      );
      showToast("Notification deleted");
    } catch (error) {
      console.error("Failed to delete notification:", error);
      showToast("Failed to delete notification", "error");
    }
  };

  const handleUpdateProfile = async (userData: Partial<User>) => {
    try {
      const updatedUser = await apiService.user.update(userData);
      if (updatedUser) {
        const next = {
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone,
        };
        setUserProfile(next);
        setProfileSnapshot(next);
        setIsEditing(false);
        showToast("Profile updated successfully");
      }
    } catch (error) {
      console.error("Failed to update profile:", error);
      showToast("Failed to update profile. Please try again.", "error");
    }
  };

  const handleSignOut = async () => {
    try {
      setShowProfile(false);
      setShowLogoutModal(true);
      clearDashboardCache();

      // 显示登出动画 1.5 秒后执行实际登出
      setTimeout(async () => {
        try {
          await logout();
        } catch (error) {
          console.error("Error signing out:", error);
          setShowLogoutModal(false);
        }
      }, 1500);
    } catch (error) {
      console.error("Error during sign out process:", error);
      setShowLogoutModal(false);
    }
  };

  // 更新通知面板渲染
  const renderNotifications = () => (
    <div className="notification-dropdown fixed top-[4.5rem] right-4 z-50 w-80 overflow-hidden rounded-lg border border-gray-200/80 bg-white py-2 shadow-2xl backdrop-blur-sm backdrop-saturate-150 md:w-96">
      {/* 头部操作栏 */}
      <div className="border-b border-gray-100 px-3 py-3 md:px-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900 md:text-lg">
            Notifications
          </h3>
          <div className="flex items-center space-x-2">
            {notifications.length > 0 && (
              <button
                onClick={toggleSelectionMode}
                className="rounded px-1.5 py-1 text-xs text-gray-600 hover:bg-gray-100 hover:text-gray-800 md:px-2 md:text-sm"
              >
                {isSelectionMode ? "Cancel" : "Select"}
              </button>
            )}
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="rounded px-1.5 py-1 text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700 md:px-2 md:text-sm"
              >
                Read All
              </button>
            )}
          </div>
        </div>

        {/* 选择模式工具栏 — checkbox 全选，和 Admin 批量一致 */}
        {isSelectionMode && notifications.length > 0 && (
          <div className="-mx-3 flex items-center justify-between gap-2 border-y border-gray-100 bg-gray-50 px-3 py-2 md:-mx-4 md:px-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <input
                type="checkbox"
                checked={
                  notifications.length > 0 &&
                  selectedNotifications.length === notifications.length
                }
                ref={(el) => {
                  if (!el) return;
                  el.indeterminate =
                    selectedNotifications.length > 0 &&
                    selectedNotifications.length < notifications.length;
                }}
                onChange={toggleSelectAll}
                aria-label="Select all notifications"
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="truncate text-xs font-medium tabular-nums text-gray-500 md:text-sm">
                {selectedNotifications.length} selected
              </span>
            </div>
            {selectedNotifications.length > 0 && (
              <button
                type="button"
                onClick={deleteSelectedNotifications}
                className="rounded-md px-2 py-1 text-sm font-semibold text-red-600 hover:bg-white"
                aria-label="Delete selected"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {/* 通知列表 */}
      <div className="max-h-[calc(3*5.5rem)] md:max-h-[calc(100vh-16rem)] overflow-y-auto">
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <div
              key={notification._id}
              className={`group relative cursor-pointer border-b border-gray-100 px-3 py-2 transition-colors duration-200 last:border-b-0 md:px-4 md:py-3 md:hover:bg-gray-100 ${
                !notification.isRead ? "bg-blue-50/80 backdrop-blur-sm" : ""
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (isSelectionMode) {
                  toggleNotificationSelection(notification._id);
                } else if (!notification.isRead) {
                  handleMarkNotificationAsRead(notification._id);
                }
              }}
            >
              <div className="flex items-start">
                {/* 选择框 */}
                {isSelectionMode && (
                  <div
                    className="mr-3 mt-1 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation(); // 阻止冒泡，避免触发父元素的点击事件
                      toggleNotificationSelection(notification._id);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedNotifications.includes(notification._id)}
                      onChange={() => {}} // 空函数，实际点击处理由父div处理
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>
                )}

                <div className="flex items-start flex-grow">
                  <div
                    className={`mr-3 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-base ${
                      notification.type === "welcome"
                        ? "bg-amber-50"
                        : notification.type === "appointment"
                          ? "bg-rose-50"
                          : "bg-blue-100"
                    }`}
                    aria-hidden
                  >
                    {notificationEmoji[notification.type] || "🔔"}
                  </div>
                  <div className="flex-grow">
                    <div className="flex justify-between items-start">
                      <p className="text-xs md:text-sm font-medium text-gray-900">
                        {notification.title}
                      </p>
                      {notification.isRead && (
                        <span className="text-xs text-blue-500 ml-2 flex items-center">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          <span className="hidden md:inline-block">Read</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs md:text-sm text-gray-600 mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatToMalaysiaTime(notification.createdAt)}
                    </p>
                  </div>
                </div>

                {/* 单个删除按钮 - 非选择模式时显示 */}
                {!isSelectionMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification._id);
                    }}
                    className="ml-2 rounded-full p-1.5 opacity-100 transition-opacity duration-200 hover:bg-gray-100 md:opacity-0 md:group-hover:opacity-100"
                  >
                    <svg
                      className="w-5 h-5 text-gray-500 hover:text-red-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="px-4 py-6 text-sm text-gray-600 text-center">
            No notifications
          </div>
        )}
      </div>
    </div>
  );

  const handleWhatsApp = () => {
    window.open(
      `https://wa.me/60102568641?text=${encodeURIComponent("Hi AH HAO Pet Shop, I'd like to ask a question.")}`,
      "_blank",
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {isRefreshing && (
        <div className="fixed top-0 left-0 right-0 z-[55] h-0.5 overflow-hidden bg-rose-100">
          <div className="h-full w-1/3 animate-pulse bg-rose-500" />
        </div>
      )}
      <Toast toast={toast} onClose={clearToast} />
      {error && !pets.length && !appointments.length && (
        <div className="fixed bottom-4 left-1/2 z-[55] -translate-x-1/2 rounded-xl bg-rose-600 px-4 py-2 text-sm text-white shadow-lg">
          {error}
        </div>
      )}
      <ConfirmDialog
        open={confirmClearNotifications}
        title="Clear all notifications?"
        message="This will remove every notification from your list."
        confirmLabel="Clear all"
        cancelLabel="Keep them"
        onConfirm={deleteAllNotifications}
        onCancel={() => setConfirmClearNotifications(false)}
      />

      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 transform transition-all animate-fade-in-up">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-rose-100 mb-4">
                <LogOut className="h-6 w-6 text-rose-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Signing Out...
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Thank you for visiting AH HAO PET SHOP!
              </p>
              <div className="flex justify-center">
                <div className="animate-spin h-8 w-8 border-4 border-rose-600 border-t-transparent rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={scrollToTop}
                className="shrink-0 rounded-lg transition-opacity hover:opacity-80"
                aria-label="Scroll to top"
              >
                <img
                  src="/imgs/AH%20HAO%20PET%20SHOP%20LOGO.png"
                  alt="AH HAO PET SHOP Logo"
                  className="h-9 w-auto object-contain sm:h-10"
                />
              </button>
              <span className="hidden truncate text-sm font-medium text-slate-700 sm:text-base md:inline-block">
                Member Dashboard
              </span>
            </div>

            {/* Home + notifications + profile */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={handleBackToHome}
                className="rounded-lg p-2 text-gray-600 transition hover:bg-rose-50 hover:text-rose-600"
                aria-label="Go to Home"
              >
                <Home className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="notification-bell-button relative flex items-center space-x-2 text-gray-800 hover:text-rose-600 transition-colors duration-300"
              >
                <Bell
                  className={`w-6 h-6 ${showNotifications ? "text-rose-600" : ""}`}
                />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              <div className="relative">
                <button
                  onClick={() => {
                    if (showProfile) {
                      closeProfileDropdown();
                    } else {
                      setShowProfile(true);
                    }
                  }}
                  className="profile-button flex items-center text-slate-600 hover:text-slate-900 transition-colors p-2 hover:bg-white/90 rounded-lg"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-violet-100 to-sky-100 rounded-full flex items-center justify-center border border-white/60">
                    <UserIcon className="w-4 h-4 text-slate-600" />
                  </div>
                  {/* 仅在非移动设备上显示用户名和下拉箭头 */}
                  <span className="text-sm font-medium ml-2 hidden md:inline-block">
                    {userProfile.name || user?.email}
                  </span>
                  <ChevronDown className="w-4 h-4 hidden md:inline-block ml-1" />
                </button>

                {/* Profile Dropdown */}
                {showProfile && (
                  <div
                    className="profile-dropdown absolute right-0 mt-2 w-64 md:w-80 bg-white rounded-lg border border-slate-200 py-2 z-50"
                    onClick={(e) => {
                      // Prevent outer click event when clicking inside dropdown menu
                      e.stopPropagation();
                    }}
                  >
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Profile
                        </h3>
                        <button
                          type="button"
                          onClick={toggleProfileEdit}
                          className="text-gray-400 hover:text-gray-600"
                          aria-label={
                            isEditing ? "Cancel editing" : "Edit profile"
                          }
                          title={isEditing ? "Cancel" : "Edit"}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="px-4 py-3 space-y-3">
                      <div className="flex items-center gap-3">
                        <UserIcon className="h-4 w-4 shrink-0 text-gray-400" />
                        {isEditing ? (
                          <input
                            type="text"
                            value={userProfile.name}
                            onChange={(e) =>
                              setUserProfile({
                                ...userProfile,
                                name: e.target.value,
                              })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleProfileUpdate();
                              }
                            }}
                            className="min-w-0 flex-1 rounded border px-2 py-1"
                            placeholder="Your name"
                          />
                        ) : (
                          <span className="min-w-0 truncate text-gray-600">
                            {userProfile.name || "Add your name"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 shrink-0 text-gray-400" />
                        {isEditing ? (
                          <input
                            type="tel"
                            value={userProfile.phone}
                            onChange={(e) =>
                              setUserProfile({
                                ...userProfile,
                                phone: e.target.value,
                              })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleProfileUpdate();
                              }
                            }}
                            className="min-w-0 flex-1 rounded border px-2 py-1"
                            placeholder="0123456789"
                          />
                        ) : (
                          <span className="min-w-0 truncate text-gray-600">
                            {userProfile.phone || "Add phone number"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 shrink-0 text-gray-400" />
                        <span className="min-w-0 truncate text-gray-600">
                          {userProfile.email}
                        </span>
                      </div>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={handleProfileUpdate}
                          disabled={isSavingProfile}
                          className="mt-2 w-full rounded-md bg-rose-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-rose-700 disabled:opacity-50 md:px-4 md:py-2"
                        >
                          {isSavingProfile ? "Saving…" : "Save Changes"}
                        </button>
                      )}
                    </div>
                    <div className="border-t border-gray-100 mt-2">
                      <button
                        onClick={handleSignOut}
                        className="flex items-center space-x-2 px-4 py-3 text-gray-600 hover:bg-rose-50 w-full transition-colors duration-200 hover:text-rose-600 group"
                      >
                        <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {showNotifications && renderNotifications()}
            </div>
          </div>
        </div>
      </nav>

      <main>
        <div className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 sm:pt-8 lg:px-8">
          <div className="mb-6 px-1">
            <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
            <p className="mt-1 font-medium text-gray-800">
              {userProfile.name || "Member"}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              Manage your pets and appointments
            </p>
          </div>

          {/* 内容布局 - 移动端优化 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {/* Quick Actions Section */}
            <div className="bg-white rounded-xl shadow-sm p-4 sm:p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 gap-3 h-[160px] md:h-[180px] overflow-y-auto pr-2 custom-scrollbar">
                <div
                  onClick={() => navigate("/grooming-appointment")}
                  className="bg-gray-50 hover:bg-blue-50 rounded-xl p-2 sm:p-3 h-[70px] sm:h-[80px] cursor-pointer transition-colors flex items-center justify-center flex-col"
                >
                  <Calendar className="w-5 h-5 text-blue-600 mb-1 sm:mb-2" />
                  <span className="text-xs sm:text-sm font-medium text-gray-800">
                    Book Appointment
                  </span>
                </div>

                <div
                  onClick={handleWhatsApp}
                  className="bg-gray-50 hover:bg-green-50 rounded-xl p-2 sm:p-3 h-[70px] sm:h-[80px] cursor-pointer transition-colors flex items-center justify-center flex-col"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5 text-green-600 mb-1 sm:mb-2"
                    fill="currentColor"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  <span className="text-xs sm:text-sm font-medium text-gray-800">
                    Contact Us
                  </span>
                </div>

                <div
                  onClick={() => navigate("/appointments")}
                  className="bg-gray-50 hover:bg-purple-50 rounded-xl p-2 sm:p-3 h-[70px] sm:h-[80px] cursor-pointer transition-colors flex items-center justify-center flex-col"
                >
                  <Scissors className="w-5 h-5 text-purple-600 mb-1 sm:mb-2" />
                  <span className="text-xs sm:text-sm font-medium text-gray-800">
                    Grooming History
                  </span>
                </div>

                <div
                  onClick={() => navigate("/supplies")}
                  className="bg-gray-50 hover:bg-rose-50 rounded-xl p-2 sm:p-3 h-[70px] sm:h-[80px] cursor-pointer transition-colors flex items-center justify-center flex-col"
                >
                  <ShoppingBag className="w-5 h-5 text-rose-600 mb-1 sm:mb-2" />
                  <span className="text-center text-xs sm:text-sm font-medium text-gray-800">
                    Pet Supplies
                  </span>
                </div>

                <div
                  onClick={() => navigate("/all-pets")}
                  className="bg-gray-50 hover:bg-amber-50 rounded-xl p-2 sm:p-3 h-[70px] sm:h-[80px] cursor-pointer transition-colors flex items-center justify-center flex-col"
                >
                  <Dog className="w-5 h-5 text-amber-600 mb-1 sm:mb-2" />
                  <span className="text-center text-xs sm:text-sm font-medium text-gray-800">
                    Buy Pet
                  </span>
                </div>

                <div
                  onClick={() => navigate("/daycare")}
                  className="bg-gray-50 hover:bg-sky-50 rounded-xl p-2 sm:p-3 h-[70px] sm:h-[80px] cursor-pointer transition-colors flex items-center justify-center flex-col"
                >
                  <Home className="w-5 h-5 text-sky-600 mb-1 sm:mb-2" />
                  <span className="text-center text-xs sm:text-sm font-medium text-gray-800">
                    Day Care
                  </span>
                </div>

                <div
                  onClick={() => navigate("/favourites")}
                  className="bg-gray-50 hover:bg-pink-50 rounded-xl p-2 sm:p-3 h-[70px] sm:h-[80px] cursor-pointer transition-colors flex items-center justify-center flex-col"
                >
                  <svg
                    className="w-5 h-5 text-pink-600 mb-1 sm:mb-2"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <span className="text-xs sm:text-sm font-medium text-gray-800">
                    Favourite
                  </span>
                </div>
              </div>
            </div>

            {/* Upcoming Appointments Section */}
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Upcoming Appointments
                </h3>
                <button
                  type="button"
                  onClick={() => navigate("/grooming-appointment")}
                  className="rounded-md px-2 py-1 text-xs font-medium text-rose-600 transition active:scale-95 hover:bg-rose-50 hover:text-rose-700"
                >
                  Book more
                </button>
              </div>

              {(() => {
                const upcoming = appointments
                  .filter((appt) => {
                    if (!appt.date || !appt.time || appt.status === "Cancelled")
                      return false;
                    return new Date(`${appt.date}T${appt.time}`) > new Date();
                  })
                  .sort(
                    (a, b) =>
                      getAppointmentTimestamp(a) - getAppointmentTimestamp(b),
                  );

                if (upcoming.length === 0) {
                  return (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-8 text-center">
                      <Calendar className="mx-auto h-8 w-8 text-gray-300" />
                      <p className="mt-2 text-sm text-gray-500">
                        No upcoming appointments
                      </p>
                      <button
                        type="button"
                        onClick={() => navigate("/grooming-appointment")}
                        className="mt-3 text-sm font-medium text-gray-800 underline-offset-2 hover:text-black hover:underline"
                      >
                        Book a grooming
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="custom-scrollbar max-h-[220px] space-y-2.5 overflow-y-auto pr-1">
                    {upcoming.map((appointment) => {
                      const serviceName = getServiceDisplayName(
                        appointment.serviceType || "Basic Grooming",
                      );
                      const service = findService(serviceName);
                      const basePrice =
                        appointment.basePrice ??
                        service?.price ??
                        calculateBasePrice(serviceName);
                      const discountPct =
                        appointment.discount ?? service?.discount ?? 0;
                      const discountAmount =
                        discountPct > 0 ? (basePrice * discountPct) / 100 : 0;
                      const total =
                        typeof appointment.totalPrice === "number" &&
                        appointment.totalPrice > 0
                          ? appointment.totalPrice
                          : calculateTotalPrice(
                              serviceName,
                              appointment.dayCareOptions as any,
                            );
                      const isDog = appointment.petType === "dog";
                      const PetIcon = isDog ? Dog : Cat;
                      const expanded = pricePopover?.id === appointment._id;

                      return (
                        <div
                          key={appointment._id}
                          className={`rounded-xl border bg-white p-3.5 transition ${
                            expanded
                              ? "border-gray-900 shadow-sm"
                              : "border-gray-100 hover:border-gray-400"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                                isDog
                                  ? "bg-sky-50 text-sky-600"
                                  : "bg-violet-50 text-violet-600"
                              }`}
                              title={isDog ? "Dog" : "Cat"}
                              aria-label={isDog ? "Dog" : "Cat"}
                            >
                              <PetIcon className="h-5 w-5" strokeWidth={1.75} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <h4 className="truncate text-sm font-semibold text-gray-900">
                                    {appointment.petName || "Pet"}
                                  </h4>
                                  <p className="mt-0.5 truncate text-sm text-gray-600">
                                    {serviceName}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) =>
                                    openPricePopover(e, appointment._id || "", {
                                      basePrice: Number(basePrice),
                                      discountPct: Number(discountPct),
                                      discountAmount: Number(discountAmount),
                                      total: Number(total),
                                    })
                                  }
                                  className={`price-toggle-button inline-flex shrink-0 items-center gap-0.5 text-sm font-semibold transition ${
                                    expanded
                                      ? "text-gray-900"
                                      : "text-gray-800 hover:text-black"
                                  }`}
                                  aria-expanded={expanded}
                                  aria-label={
                                    expanded
                                      ? "Hide price details"
                                      : "Show price details"
                                  }
                                >
                                  RM {Number(total).toFixed(2)}
                                  <ChevronDown
                                    className={`h-3.5 w-3.5 text-gray-400 transition ${
                                      expanded ? "rotate-180 text-gray-900" : ""
                                    }`}
                                  />
                                </button>
                              </div>

                              <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-gray-500">
                                <Clock className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                                {formatDateTime(appointment)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {pricePopover &&
                createPortal(
                  <div
                    className="price-details-popover fixed z-[80] w-44 rounded-lg border border-gray-200 bg-white p-3 shadow-lg"
                    style={{ top: pricePopover.top, left: pricePopover.left }}
                    role="dialog"
                    aria-label="Price details"
                  >
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Service</span>
                      <span className="font-medium text-gray-800">
                        RM {pricePopover.basePrice.toFixed(2)}
                      </span>
                    </div>
                    {pricePopover.discountAmount > 0 && (
                      <div className="mt-1.5 flex justify-between text-xs">
                        <span className="text-gray-600">
                          Discount ({pricePopover.discountPct}%)
                        </span>
                        <span className="font-medium text-red-600">
                          −RM {pricePopover.discountAmount.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="mt-2 flex justify-between border-t border-gray-100 pt-2 text-xs font-semibold text-gray-900">
                      <span>Total</span>
                      <span>RM {pricePopover.total.toFixed(2)}</span>
                    </div>
                  </div>,
                  document.body,
                )}
            </div>

            {/* My Pets Section — no max-height clip so pet info stays visible */}
            <div className="overflow-visible bg-white rounded-xl shadow-sm p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">My Pets</h2>
                <button
                  onClick={() => setShowAddPet(true)}
                  className="inline-flex items-center rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-medium text-white transition-colors duration-200 hover:bg-rose-600"
                >
                  <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                  Add New Pet
                </button>
              </div>

              <PetProfiles
                isAddingPet={showAddPet}
                setIsAddingPet={setShowAddPet}
                onAddPet={handleAddPet}
                onUpdatePet={handleUpdatePet}
                onDeletePet={handleDeletePet}
                hideNavigationButtons={true}
              />
            </div>

            {/* Member Benefits Section */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Member Benefits
              </h3>
              <div className="space-y-4">
                {/* Birthday Benefit */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <svg
                      className="w-5 h-5 text-rose-600 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
                      />
                    </svg>
                    <h3 className="text-base font-medium text-gray-900">
                      Birthday Month Special
                    </h3>
                  </div>
                  <div className="ml-8 space-y-2">
                    <p className="text-xs text-gray-500">
                      Get a FREE grooming session of any type for your pet
                      during their birthday month! Simply show your IC at the
                      counter for verification.
                    </p>
                  </div>
                </div>

                {/* Regular Grooming Discounts — live from Admin Portal services */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <svg
                      className="w-5 h-5 text-rose-600 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                      />
                    </svg>
                    <h3 className="text-base font-medium text-gray-900">
                      Grooming Discounts
                    </h3>
                  </div>
                  <div className="ml-8 space-y-2">
                    {[...services]
                      .sort((a, b) => {
                        const order = [
                          "Basic Grooming",
                          "Full Grooming",
                          "Spa Treatment",
                        ];
                        return order.indexOf(a.name) - order.indexOf(b.name);
                      })
                      .map((service) => (
                        <div
                          key={service.id}
                          className="flex justify-between text-sm"
                        >
                          <span className="text-gray-600">{service.name}</span>
                          <span
                            className={`font-medium ${service.discount > 0 ? "text-rose-600" : "text-gray-400"}`}
                          >
                            {service.discount > 0
                              ? `${service.discount}% OFF`
                              : "—"}
                          </span>
                        </div>
                      ))}
                    {services.length === 0 && (
                      <p className="text-xs text-gray-400">
                        Discount rates will appear when services load.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MemberDashboard;
