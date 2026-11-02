import { apiService } from "../services/apiService";
import type { Pet, Appointment, Notification } from "../types";

export type DashboardService = {
  id: string;
  name: string;
  description: string;
  price: number;
  displayPrice?: string;
  duration: number;
  displayDuration?: string;
  features: Array<{ text: string }>;
  discount: number;
  recommended?: boolean;
  capacityLimit?: number;
};

export type DashboardDayCare = {
  type: string;
  price: number;
  displayPrice?: string;
  description: string;
};

export type DashboardCache = {
  userId: string;
  pets: Pet[];
  appointments: Appointment[];
  notifications: Notification[];
  services: DashboardService[];
  dayCareOptions: DashboardDayCare[];
};

let cache: DashboardCache | null = null;
let inflight: Promise<DashboardCache | null> | null = null;

export const getDashboardCache = (userId?: string | null) => {
  if (!userId || !cache || cache.userId !== userId) return null;
  return cache;
};

export const clearDashboardCache = () => {
  cache = null;
  inflight = null;
};

export const setDashboardCache = (next: DashboardCache) => {
  cache = next;
};

/** Prefetch (or reuse in-flight) dashboard data so first open feels instant */
export const prefetchDashboard = async (
  userId: string,
): Promise<DashboardCache | null> => {
  if (!userId) return null;
  if (cache?.userId === userId) {
    const hasWelcome = cache.notifications.some((n) => n.type === "welcome");
    if (hasWelcome) return cache;
    // Stale cache from before welcome existed — refresh
    cache = null;
  }
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      let services: DashboardService[] = [];
      let dayCareOptions: DashboardDayCare[] = [];

      try {
        services =
          (await apiService.services.getGroomingServices()) as DashboardService[];
        dayCareOptions =
          (await apiService.services.getDayCareOptions()) as DashboardDayCare[];
      } catch {
        /* optional pricing data */
      }

      const petsData = await apiService.pets.getAll();
      const appointmentsData = await apiService.appointments.getAll();

      let mergedAppointments = appointmentsData
        .map((appointment) => ({
          ...appointment,
          totalPrice: appointment.totalPrice
            ? Number(appointment.totalPrice)
            : undefined,
        }))
        .sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.time}`);
          const dateB = new Date(`${b.date}T${b.time}`);
          return dateA.getTime() - dateB.getTime();
        });

      try {
        const historyData = await apiService.appointments.getHistory();
        if (historyData?.length) {
          const existingIds = mergedAppointments.map((a) => a._id);
          const historyOnly = historyData
            .filter((a) => !existingIds.includes(a._id))
            .map((appointment) => ({
              ...appointment,
              totalPrice: appointment.totalPrice
                ? Number(appointment.totalPrice)
                : undefined,
            }));
          mergedAppointments = [...mergedAppointments, ...historyOnly];
        }
      } catch {
        /* history optional */
      }

      try {
        await apiService.notifications.ensureWelcome();
      } catch (welcomeErr) {
        console.error("Failed to ensure welcome notification:", welcomeErr);
      }

      const notificationsData = await apiService.notifications.getAll();

      const next: DashboardCache = {
        userId,
        pets: petsData,
        appointments: mergedAppointments,
        notifications: notificationsData,
        services,
        dayCareOptions,
      };
      cache = next;
      return next;
    } catch (error) {
      console.error("Dashboard prefetch failed:", error);
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
};
