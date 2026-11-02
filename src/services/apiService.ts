import { supabase, isSupabaseConfigured } from "../lib/supabase";
import {
  User,
  Pet,
  Appointment,
  TimeSlot,
  GroomingService,
  DayCareOption,
  PetSupply,
} from "../types";

export interface AppointmentSettings {
  settingName: string;
  maxBookingsPerTimeSlot: number;
  description?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
  _id?: string;
}

/** Guest bookings cannot read the new row back. The id is only for the success screen. */
function createLocalId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
      "",
    );
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return `appt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function assertConfigured() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local",
    );
  }
}

function mapProfile(row: any): User {
  return {
    _id: row.id,
    id: row.id,
    name: row.name || "",
    email: row.email || "",
    phone: row.phone || "",
    role: row.role || "user",
  };
}

function mapPet(row: any): Pet {
  return {
    _id: row.id,
    owner: row.owner,
    name: row.name,
    breed: row.breed || "",
    age: typeof row.age === "number" ? row.age : Number(row.age) || 0,
    gender: row.gender,
    specialNeeds: row.special_needs || "",
    imageUrl: row.image_url || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAppointment(row: any): Appointment {
  return {
    _id: row.id,
    user: row.user_id || undefined,
    petName: row.pet_name,
    petType: row.pet_type,
    date: row.date,
    time: row.time,
    utcDateTime: row.utc_date_time || undefined,
    serviceType: row.service_type,
    duration: Number(row.duration),
    dayCareOptions: row.day_care_options || undefined,
    totalPrice: Number(row.total_price),
    basePrice: Number(row.base_price),
    discount: Number(row.discount),
    dayCarePrice: Number(row.day_care_price),
    ownerName: row.owner_name,
    ownerPhone: row.owner_phone,
    ownerEmail: row.owner_email,
    notes: row.notes || undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapShopPet(row: any) {
  return {
    _id: row.id,
    id: row.id,
    petId: row.pet_id,
    name: row.name,
    breed: row.breed,
    age: row.age,
    gender: row.gender,
    imageUrl: row.image_url,
    type: row.type,
    description: row.description,
    isForSale: row.is_for_sale,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Prefer UUID `id`; otherwise match business `pet_id` (D001 / C001). Never OR both — invalid UUID breaks the query. */
function shopPetIdColumn(id: string): "id" | "pet_id" {
  return UUID_RE.test(id) ? "id" : "pet_id";
}

function isForSaleFromStatus(status: string | undefined): boolean {
  return (status || "Listed") === "Listed";
}

function mapPetSupply(row: any): PetSupply {
  return {
    _id: row.id,
    name: row.name,
    category: row.category,
    description: row.description || "",
    price: Number(row.price),
    displayPrice: row.display_price,
    imageUrl: row.image_url,
    active: row.active ?? true,
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapGroomingService(
  row: any,
): GroomingService & { capacityLimit?: number } {
  return {
    id: row.service_key,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    duration: Number(row.duration),
    discount: Number(row.discount),
    features: row.features || [],
    recommended: row.recommended,
    displayPrice: row.display_price,
    displayDuration: row.display_duration,
    capacityLimit: row.capacity_limit,
  };
}

function mapDayCare(row: any): DayCareOption {
  return {
    type: row.type,
    description: row.description,
    price: Number(row.price),
    displayPrice: row.display_price,
  };
}

async function getSessionUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return mapProfile(data);
}

async function autoCompletePastAppointments(rows: any[]) {
  const now = new Date();
  const toComplete: string[] = [];
  const mapped = rows.map((row) => {
    if (row.status !== "Booked") return mapAppointment(row);
    const apptDate = String(row.date).split("T")[0];
    const apptDateTime = new Date(`${apptDate}T${row.time}`);
    if (!Number.isNaN(apptDateTime.getTime()) && apptDateTime < now) {
      toComplete.push(row.id);
      return mapAppointment({ ...row, status: "Completed" });
    }
    return mapAppointment(row);
  });
  if (toComplete.length > 0) {
    await supabase
      .from("appointments")
      .update({ status: "Completed" })
      .in("id", toComplete);
  }
  return mapped;
}

const SLOT_HOURS = Array.from(
  { length: 12 },
  (_, i) => `${String(10 + i).padStart(2, "0")}:00`,
);

export const apiService = {
  user: {
    login: async (credentials: { email: string; password: string }) => {
      assertConfigured();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });
      if (error) throw error;
      if (!data.user) throw new Error("Login failed");
      const profile = await getProfile(data.user.id);
      localStorage.setItem("user", JSON.stringify(profile));
      if (data.session?.access_token) {
        localStorage.setItem("token", data.session.access_token);
      }
      return profile;
    },

    register: async (userData: {
      email: string;
      password: string;
      name: string;
      phone: string;
    }) => {
      assertConfigured();
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: { name: userData.name, phone: userData.phone, role: "user" },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      if (error) throw error;
      return {
        userId: data.user?.id,
        needsVerification: !data.session,
      };
    },

    preRegister: async (userData: {
      email: string;
      password: string;
      name: string;
      phone: string;
    }) => {
      return apiService.user.register(userData);
    },

    verifyEmail: async (payload: { email: string; token: string }) => {
      assertConfigured();
      const { data, error } = await supabase.auth.verifyOtp({
        email: payload.email,
        token: payload.token,
        type: "signup",
      });
      if (error) {
        const retry = await supabase.auth.verifyOtp({
          email: payload.email,
          token: payload.token,
          type: "email",
        });
        if (retry.error) throw error;
        if (!retry.data.user) throw new Error("Verification failed");
        const profile = await getProfile(retry.data.user.id);
        localStorage.setItem("user", JSON.stringify(profile));
        if (retry.data.session?.access_token) {
          localStorage.setItem("token", retry.data.session.access_token);
        }
        return { user: profile, token: retry.data.session?.access_token };
      }
      if (!data.user) throw new Error("Verification failed");
      const profile = await getProfile(data.user.id);
      localStorage.setItem("user", JSON.stringify(profile));
      if (data.session?.access_token) {
        localStorage.setItem("token", data.session.access_token);
      }
      return { user: profile, token: data.session?.access_token };
    },

    resendVerification: async (email: string) => {
      assertConfigured();
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      return { message: "Verification email resent" };
    },

    forgotPassword: async (email: string) => {
      assertConfigured();
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) throw error;
      return { message: "Password reset email sent" };
    },

    resetPassword: async (password: string) => {
      assertConfigured();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      return { message: "Password updated" };
    },

    get: async () => {
      assertConfigured();
      const userId = await getSessionUserId();
      if (!userId) throw new Error("Not authenticated");
      return getProfile(userId);
    },

    update: async (userData: Partial<User>) => {
      assertConfigured();
      const userId = await getSessionUserId();
      if (!userId) throw new Error("Not authenticated");
      const patch: Record<string, unknown> = {};
      if (userData.name !== undefined) patch.name = userData.name;
      if (userData.phone !== undefined) patch.phone = userData.phone;
      const { data, error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", userId)
        .select()
        .single();
      if (error) throw error;
      const profile = mapProfile(data);
      localStorage.setItem("user", JSON.stringify(profile));
      return profile;
    },

    logout: async () => {
      await supabase.auth.signOut();
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    },

    testAuth: async () => {
      const profile = await apiService.user.get();
      return {
        message: "ok",
        userInfo: profile,
        isAdmin: profile.role === "admin",
      };
    },
  },

  pets: {
    getAll: async () => {
      assertConfigured();
      const userId = await getSessionUserId();
      if (!userId) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("pets")
        .select("*")
        .eq("owner", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(mapPet);
    },

    add: async (petData: Omit<Pet, "_id">) => {
      assertConfigured();
      const userId = await getSessionUserId();
      if (!userId) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("pets")
        .insert({
          owner: userId,
          name: petData.name,
          breed: petData.breed || "",
          age: String(petData.age ?? ""),
          gender: petData.gender,
          special_needs: petData.specialNeeds || "",
          image_url: petData.imageUrl || "",
        })
        .select()
        .single();
      if (error) throw error;
      return mapPet(data);
    },

    update: async (id: string, petData: Partial<Pet>) => {
      assertConfigured();
      const patch: Record<string, unknown> = {};
      if (petData.name !== undefined) patch.name = petData.name;
      if (petData.breed !== undefined) patch.breed = petData.breed;
      if (petData.age !== undefined) patch.age = String(petData.age);
      if (petData.gender !== undefined) patch.gender = petData.gender;
      if (petData.specialNeeds !== undefined)
        patch.special_needs = petData.specialNeeds;
      if (petData.imageUrl !== undefined) patch.image_url = petData.imageUrl;
      const { data, error } = await supabase
        .from("pets")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return mapPet(data);
    },

    delete: async (id: string) => {
      assertConfigured();
      const { error } = await supabase.from("pets").delete().eq("id", id);
      if (error) throw error;
    },
  },

  appointments: {
    getAll: async () => {
      assertConfigured();
      const userId = await getSessionUserId();
      if (!userId) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("user_id", userId)
        .order("date", { ascending: true });
      if (error) throw error;
      return autoCompletePastAppointments(data || []);
    },

    getHistory: async () => {
      assertConfigured();
      const userId = await getSessionUserId();
      if (!userId) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .eq("user_id", userId)
        .in("status", ["Completed", "Cancelled"])
        .order("date", { ascending: false });
      if (error) throw error;
      return (data || []).map(mapAppointment);
    },

    getTimeSlots: async (date: string): Promise<TimeSlot[]> => {
      assertConfigured();
      const { data: settings } = await supabase
        .from("appointment_settings")
        .select("max_bookings_per_time_slot")
        .eq("setting_name", "default")
        .maybeSingle();
      const max = settings?.max_bookings_per_time_slot ?? 5;

      const { data: bookings, error } = await supabase.rpc(
        "get_slot_bookings",
        { p_date: date },
      );
      if (error) throw error;
      const countMap = new Map<string, number>(
        (bookings || []).map(
          (b: { slot_time: string; booked_count: number }) => [
            b.slot_time,
            Number(b.booked_count),
          ],
        ),
      );

      return SLOT_HOURS.map((time) => ({
        time,
        currentBookings: countMap.get(time) || 0,
        available: (countMap.get(time) || 0) < max,
      })) as TimeSlot[];
    },

    getAvailableSlots: async (date: string) => {
      const slots = await apiService.appointments.getTimeSlots(date);
      const { data: settings } = await supabase
        .from("appointment_settings")
        .select("max_bookings_per_time_slot")
        .eq("setting_name", "default")
        .maybeSingle();
      const max = settings?.max_bookings_per_time_slot ?? 5;
      const result: Record<string, number> = {};
      slots.forEach((s) => {
        result[s.time] = Math.max(0, max - (s.currentBookings || 0));
      });
      return result;
    },

    add: async (
      appointmentData: Omit<Appointment, "_id"> & { serviceId?: string },
    ) => {
      assertConfigured();
      const userId = await getSessionUserId();

      let serviceUuid: string | null = null;
      let serviceType = appointmentData.serviceType;
      let duration = appointmentData.duration;
      let basePrice = appointmentData.basePrice;
      let discount = appointmentData.discount ?? 0;

      if (appointmentData.serviceId || appointmentData.serviceType) {
        let query = supabase.from("grooming_services").select("*");
        if (
          appointmentData.serviceId &&
          appointmentData.serviceId.length === 36
        ) {
          query = query.eq("id", appointmentData.serviceId);
        } else if (appointmentData.serviceId) {
          query = query.eq("service_key", appointmentData.serviceId);
        } else {
          query = query.eq("name", appointmentData.serviceType);
        }
        const { data: service } = await query.maybeSingle();
        if (service) {
          serviceUuid = service.id;
          serviceType = service.name;
          duration = Number(service.duration);
          basePrice = Number(service.price);
          if (userId) discount = Number(service.discount) || discount;
        }
      }

      const dayCarePrice = appointmentData.dayCarePrice ?? 0;
      const resolvedBase = Number(basePrice ?? appointmentData.basePrice ?? 0);
      const discounted = resolvedBase * (1 - discount / 100);
      const totalPrice =
        appointmentData.totalPrice ?? discounted + dayCarePrice;
      const ownerUserId = appointmentData.user || userId || null;

      const insertRow = {
        user_id: ownerUserId,
        pet_name: appointmentData.petName,
        pet_type: appointmentData.petType,
        date: String(appointmentData.date).split("T")[0],
        time: appointmentData.time,
        utc_date_time: appointmentData.utcDateTime || null,
        service_type: serviceType,
        service_id: serviceUuid,
        duration,
        day_care_options: appointmentData.dayCareOptions || null,
        total_price: totalPrice,
        base_price: resolvedBase,
        discount,
        day_care_price: dayCarePrice,
        owner_name: appointmentData.ownerName,
        owner_phone: appointmentData.ownerPhone,
        owner_email: appointmentData.ownerEmail,
        notes: appointmentData.notes || null,
        status: appointmentData.status || "Booked",
      };

      // Guests may INSERT but cannot SELECT the row (RLS). Don't rely on RETURNING.
      const { error: insertError } = await supabase
        .from("appointments")
        .insert(insertRow);
      if (insertError) throw insertError;

      if (ownerUserId) {
        const { data: saved } = await supabase
          .from("appointments")
          .select("*")
          .eq("user_id", ownerUserId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (saved) return mapAppointment(saved);
      }

      return {
        _id: createLocalId(),
        user: ownerUserId || undefined,
        petName: appointmentData.petName,
        petType: appointmentData.petType,
        date: insertRow.date,
        time: appointmentData.time,
        serviceType: serviceType || appointmentData.serviceType,
        serviceId: serviceUuid || appointmentData.serviceId,
        duration: Number(duration ?? appointmentData.duration ?? 1),
        dayCareOptions: appointmentData.dayCareOptions,
        totalPrice: Number(totalPrice),
        basePrice: resolvedBase,
        discount,
        dayCarePrice,
        ownerName: appointmentData.ownerName,
        ownerPhone: appointmentData.ownerPhone,
        ownerEmail: appointmentData.ownerEmail,
        notes: appointmentData.notes,
        status: (appointmentData.status || "Booked") as Appointment["status"],
      };
    },

    update: async (id: string, appointmentData: Partial<Appointment>) => {
      assertConfigured();
      const patch: Record<string, unknown> = {};
      if (appointmentData.petName !== undefined)
        patch.pet_name = appointmentData.petName;
      if (appointmentData.petType !== undefined)
        patch.pet_type = appointmentData.petType;
      if (appointmentData.date !== undefined)
        patch.date = String(appointmentData.date).split("T")[0];
      if (appointmentData.time !== undefined) patch.time = appointmentData.time;
      if (appointmentData.serviceType !== undefined)
        patch.service_type = appointmentData.serviceType;
      if (appointmentData.duration !== undefined)
        patch.duration = appointmentData.duration;
      if (appointmentData.dayCareOptions !== undefined)
        patch.day_care_options = appointmentData.dayCareOptions;
      if (appointmentData.totalPrice !== undefined)
        patch.total_price = appointmentData.totalPrice;
      if (appointmentData.basePrice !== undefined)
        patch.base_price = appointmentData.basePrice;
      if (appointmentData.discount !== undefined)
        patch.discount = appointmentData.discount;
      if (appointmentData.dayCarePrice !== undefined)
        patch.day_care_price = appointmentData.dayCarePrice;
      if (appointmentData.ownerName !== undefined)
        patch.owner_name = appointmentData.ownerName;
      if (appointmentData.ownerPhone !== undefined)
        patch.owner_phone = appointmentData.ownerPhone;
      if (appointmentData.ownerEmail !== undefined)
        patch.owner_email = appointmentData.ownerEmail;
      if (appointmentData.notes !== undefined)
        patch.notes = appointmentData.notes;
      if (appointmentData.status !== undefined)
        patch.status = appointmentData.status;

      const { data, error } = await supabase
        .from("appointments")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return mapAppointment(data);
    },

    delete: async (id: string) => {
      assertConfigured();
      const { error } = await supabase
        .from("appointments")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
  },

  notifications: {
    getAll: async () => {
      assertConfigured();
      const userId = await getSessionUserId();
      if (!userId) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((n) => ({
        _id: n.id,
        user: n.user_id,
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.is_read,
        read: n.is_read,
        createdAt: n.created_at,
      }));
    },

    add: async (notificationData: any) => {
      assertConfigured();
      const userId = notificationData.user || (await getSessionUserId());
      if (!userId) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          title: notificationData.title,
          message: notificationData.message,
          type: notificationData.type || "system",
        })
        .select()
        .single();
      if (error) throw error;
      return {
        _id: data.id,
        user: data.user_id,
        title: data.title,
        message: data.message,
        type: data.type,
        isRead: data.is_read,
        createdAt: data.created_at,
      };
    },

    /** Create Welcome once if the member does not already have one */
    ensureWelcome: async (displayName?: string) => {
      assertConfigured();
      const userId = await getSessionUserId();
      if (!userId) return null;
      const { data: existing, error: existingError } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", userId)
        .eq("type", "welcome")
        .eq("is_deleted", false)
        .limit(1);
      if (existingError) throw existingError;
      if (existing?.length) return null;

      let welcomeName = (displayName || "").trim();
      if (!welcomeName) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", userId)
          .maybeSingle();
        welcomeName = (profile?.name || "").trim() || "there";
      }

      return apiService.notifications.add({
        title: "Welcome to AH HAO PET SHOP!",
        message: `Hi ${welcomeName}! Thanks for joining. Book grooming, browse our pets, and enjoy member discounts anytime.`,
        type: "welcome",
      });
    },

    markAsRead: async (id: string) => {
      assertConfigured();
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    },

    markAllAsRead: async () => {
      assertConfigured();
      const userId = await getSessionUserId();
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_deleted", false);
      if (error) throw error;
    },

    delete: async (id: string) => {
      assertConfigured();
      const { error } = await supabase
        .from("notifications")
        .update({ is_deleted: true })
        .eq("id", id);
      if (error) throw error;
    },

    deleteMultiple: async (ids: string[]) => {
      assertConfigured();
      const { error } = await supabase
        .from("notifications")
        .update({ is_deleted: true })
        .in("id", ids);
      if (error) throw error;
    },

    deleteAll: async () => {
      assertConfigured();
      const userId = await getSessionUserId();
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("notifications")
        .update({ is_deleted: true })
        .eq("user_id", userId);
      if (error) throw error;
    },
  },

  userLoginStatus: {
    updateLoginStatus: async () => true,
    updateLogoutStatus: async () => true,
    updateActivity: async () => true,
    checkStatus: async () => {
      const userId = await getSessionUserId();
      return { isLoggedIn: Boolean(userId) };
    },
  },

  admin: {
    getAllUsers: async (): Promise<User[]> => {
      assertConfigured();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(mapProfile);
    },

    getAllAppointments: async (): Promise<Appointment[]> => {
      assertConfigured();
      const { data, error } = await supabase
        .from("appointments")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return autoCompletePastAppointments(data || []);
    },

    updateAppointment: async (
      id: string,
      appointmentData: Partial<Appointment>,
      _oldDateTime: string,
      _oldServiceType: string,
    ): Promise<Appointment> => {
      return apiService.appointments.update(id, appointmentData);
    },

    deleteAppointment: async (
      id: string,
      _dateTime: string,
      _serviceType: string,
    ): Promise<{ success: boolean; message: string }> => {
      await apiService.appointments.delete(id);
      return { success: true, message: "Deleted" };
    },

    updateGroomingService: async (
      service: GroomingService,
    ): Promise<GroomingService> => {
      assertConfigured();
      const isNew = service.id.startsWith("new-");
      const hours = Math.max(1, Number(service.duration) || 1);
      const hourWord = hours === 1 ? "hour" : "hours";
      const features = (service.features || [])
        .map((f) => ({ text: String(f?.text || "").trim() }))
        .filter((f) => f.text.length > 0);

      const payload = {
        name: service.name,
        description: service.description,
        price: service.price,
        display_price: service.displayPrice || `RM ${service.price}`,
        duration: hours,
        display_duration: service.displayDuration || `${hours} ${hourWord}`,
        features,
        discount: service.discount || 0,
        recommended: service.recommended || false,
        capacity_limit: (service as any).capacityLimit ?? 5,
      };

      if (isNew) {
        const { data, error } = await supabase
          .from("grooming_services")
          .insert({
            ...payload,
            service_key: `svc-${Date.now()}`,
          })
          .select()
          .single();
        if (error) throw error;
        return mapGroomingService(data);
      }

      // Do not overwrite service_key on update — only change editable fields
      const { data, error } = await supabase
        .from("grooming_services")
        .update(payload)
        .eq("service_key", service.id)
        .select()
        .single();
      if (error) throw error;
      return mapGroomingService(data);
    },

    updateDayCareOption: async (
      option: DayCareOption,
    ): Promise<DayCareOption> => {
      assertConfigured();
      const payload = {
        type: option.type === "new-option" ? `opt-${Date.now()}` : option.type,
        price: option.price,
        display_price:
          option.displayPrice || `RM ${Number(option.price).toFixed(2)}`,
        description: option.description,
      };

      if (option.type === "new-option") {
        const { data, error } = await supabase
          .from("day_care_options")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return mapDayCare(data);
      }

      const { data, error } = await supabase
        .from("day_care_options")
        .update(payload)
        .eq("type", option.type)
        .select()
        .single();
      if (error) throw error;
      return mapDayCare(data);
    },

    deleteGroomingService: async (serviceId: string): Promise<void> => {
      assertConfigured();
      const { error } = await supabase
        .from("grooming_services")
        .delete()
        .eq("service_key", serviceId);
      if (error) throw error;
    },

    deleteDayCareOption: async (optionType: string): Promise<void> => {
      assertConfigured();
      const { error } = await supabase
        .from("day_care_options")
        .delete()
        .eq("type", optionType);
      if (error) throw error;
    },
  },

  shopPets: {
    getAll: async (status?: string) => {
      assertConfigured();
      let query = supabase
        .from("shop_pets")
        .select("*")
        .order("pet_id", { ascending: true });
      // 'all' or empty = no status filter (admin listing)
      if (status && status !== "all") {
        query = query.eq("status", status);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(mapShopPet);
    },

    getById: async (id: string) => {
      assertConfigured();
      const { data, error } = await supabase
        .from("shop_pets")
        .select("*")
        .eq(shopPetIdColumn(id), id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Pet not found");
      return mapShopPet(data);
    },

    getByType: async (type: "dog" | "cat") => {
      assertConfigured();
      const { data, error } = await supabase
        .from("shop_pets")
        .select("*")
        .eq("type", type)
        .order("pet_id", { ascending: true });
      if (error) throw error;
      return (data || []).map(mapShopPet);
    },

    uploadImage: async (file: File) => {
      assertConfigured();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from("pet-images")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });
      if (error) throw error;
      const { data } = supabase.storage.from("pet-images").getPublicUrl(path);
      return data.publicUrl;
    },

    create: async (petData: {
      petId: string;
      name: string;
      breed: string;
      age: string;
      gender: "Male" | "Female";
      imageUrl: string;
      type: "dog" | "cat";
      description?: string;
      status?: "Listed" | "Unlisted" | "Sold";
      isForSale?: boolean;
    }) => {
      assertConfigured();
      const status = petData.status || "Listed";
      const { data, error } = await supabase
        .from("shop_pets")
        .insert({
          pet_id: petData.petId,
          name: petData.name.trim(),
          breed: petData.breed.trim(),
          age: petData.age.trim(),
          gender: petData.gender,
          image_url: petData.imageUrl,
          type: petData.type,
          description: petData.description?.trim() || null,
          status,
          is_for_sale: petData.isForSale ?? isForSaleFromStatus(status),
        })
        .select()
        .single();
      if (error) throw error;
      return mapShopPet(data);
    },

    update: async (
      id: string,
      petData: Partial<{
        petId: string;
        name: string;
        breed: string;
        age: string;
        gender: "Male" | "Female";
        imageUrl: string;
        type: "dog" | "cat";
        description: string;
        status: "Listed" | "Unlisted" | "Sold";
        isForSale: boolean;
      }>,
    ) => {
      assertConfigured();
      const patch: Record<string, unknown> = {};
      if (petData.name !== undefined) patch.name = petData.name.trim();
      if (petData.breed !== undefined) patch.breed = petData.breed.trim();
      if (petData.age !== undefined) patch.age = petData.age.trim();
      if (petData.gender !== undefined) patch.gender = petData.gender;
      if (petData.imageUrl !== undefined) patch.image_url = petData.imageUrl;
      if (petData.type !== undefined) patch.type = petData.type;
      if (petData.description !== undefined)
        patch.description = petData.description.trim() || null;
      if (petData.status !== undefined) {
        patch.status = petData.status;
        // Keep is_for_sale in sync unless caller overrides it
        if (petData.isForSale === undefined) {
          patch.is_for_sale = isForSaleFromStatus(petData.status);
        }
      }
      if (petData.isForSale !== undefined)
        patch.is_for_sale = petData.isForSale;

      if (Object.keys(patch).length === 0) {
        throw new Error("Nothing to update");
      }

      const { data, error } = await supabase
        .from("shop_pets")
        .update(patch)
        .eq(shopPetIdColumn(id), id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        throw new Error(
          "Update failed — pet not found or admin permission required.",
        );
      }
      return mapShopPet(data);
    },

    delete: async (id: string) => {
      assertConfigured();
      const { data, error } = await supabase
        .from("shop_pets")
        .delete()
        .eq(shopPetIdColumn(id), id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        throw new Error(
          "Delete failed — pet not found or admin permission required.",
        );
      }
      return true;
    },

    toggleSaleStatus: async (id: string, isForSale: boolean) => {
      return apiService.shopPets.update(id, {
        isForSale,
        status: isForSale ? "Listed" : "Unlisted",
      });
    },

    updateStatus: async (
      id: string,
      status: "Listed" | "Unlisted" | "Sold",
    ) => {
      return apiService.shopPets.update(id, {
        status,
        isForSale: isForSaleFromStatus(status),
      });
    },
  },

  supplies: {
    getAll: async (opts?: { activeOnly?: boolean }) => {
      assertConfigured();
      let query = supabase
        .from("pet_supplies")
        .select("*")
        .order("sort_order", { ascending: true });
      if (opts?.activeOnly) {
        query = query.eq("active", true);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(mapPetSupply);
    },

    getActive: async () => apiService.supplies.getAll({ activeOnly: true }),

    uploadImage: async (file: File) => {
      assertConfigured();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `supplies/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from("pet-images")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });
      if (error) throw error;
      const { data } = supabase.storage.from("pet-images").getPublicUrl(path);
      return data.publicUrl;
    },

    create: async (
      payload: Omit<PetSupply, "_id" | "createdAt" | "updatedAt">,
    ) => {
      assertConfigured();
      const { data, error } = await supabase
        .from("pet_supplies")
        .insert({
          name: payload.name,
          category: payload.category,
          description: payload.description,
          price: payload.price,
          display_price: payload.displayPrice,
          image_url: payload.imageUrl,
          active: payload.active ?? true,
          sort_order: payload.sortOrder ?? 0,
        })
        .select()
        .single();
      if (error) throw error;
      return mapPetSupply(data);
    },

    update: async (id: string, payload: Partial<PetSupply>) => {
      assertConfigured();
      const patch: Record<string, unknown> = {};
      if (payload.name !== undefined) patch.name = payload.name;
      if (payload.category !== undefined) patch.category = payload.category;
      if (payload.description !== undefined)
        patch.description = payload.description;
      if (payload.price !== undefined) patch.price = payload.price;
      if (payload.displayPrice !== undefined)
        patch.display_price = payload.displayPrice;
      if (payload.imageUrl !== undefined) patch.image_url = payload.imageUrl;
      if (payload.active !== undefined) patch.active = payload.active;
      if (payload.sortOrder !== undefined) patch.sort_order = payload.sortOrder;

      const { data, error } = await supabase
        .from("pet_supplies")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return mapPetSupply(data);
    },

    /** Persist a full catalogue order (1-based sort_order). Public Supplies page reads this. */
    updateSortOrders: async (ordered: { id: string; sortOrder: number }[]) => {
      assertConfigured();
      const results = await Promise.all(
        ordered.map(({ id, sortOrder }) =>
          supabase
            .from("pet_supplies")
            .update({ sort_order: sortOrder })
            .eq("id", id),
        ),
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
      return true;
    },

    delete: async (id: string) => {
      assertConfigured();
      const { error } = await supabase
        .from("pet_supplies")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return true;
    },
  },

  favourites: {
    getAll: async () => {
      assertConfigured();
      const userId = await getSessionUserId();
      if (!userId) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("favourites")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const petIds = (data || []).map((f) => f.pet_id);
      let petsById = new Map<string, any>();
      if (petIds.length > 0) {
        const { data: pets } = await supabase
          .from("shop_pets")
          .select("*")
          .in("pet_id", petIds);
        petsById = new Map((pets || []).map((p) => [p.pet_id, mapShopPet(p)]));
      }

      return (data || []).map((f) => {
        const pet = petsById.get(f.pet_id) || null;
        return {
          _id: f.id,
          userId: f.user_id,
          petId: f.pet_id,
          pet,
          createdAt: f.created_at,
          updatedAt: f.updated_at,
        };
      });
    },

    add: async (petId: string) => {
      assertConfigured();
      const userId = await getSessionUserId();
      if (!userId) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("favourites")
        .insert({ user_id: userId, pet_id: petId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    remove: async (petId: string) => {
      assertConfigured();
      const userId = await getSessionUserId();
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("favourites")
        .delete()
        .eq("user_id", userId)
        .eq("pet_id", petId);
      if (error) throw error;
      return { success: true };
    },

    check: async (petId: string) => {
      assertConfigured();
      const userId = await getSessionUserId();
      if (!userId) return false;
      const { data, error } = await supabase
        .from("favourites")
        .select("id")
        .eq("user_id", userId)
        .eq("pet_id", petId)
        .maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
  },

  services: {
    getGroomingServices: async () => {
      assertConfigured();
      const { data, error } = await supabase
        .from("grooming_services")
        .select("*")
        .order("price");
      if (error) throw error;
      return (data || []).map(mapGroomingService);
    },

    getGroomingService: async (id: string) => {
      assertConfigured();
      const { data, error } = await supabase
        .from("grooming_services")
        .select("*")
        .eq("service_key", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Service not found");
      return mapGroomingService(data);
    },

    getDayCareOptions: async () => {
      assertConfigured();
      const { data, error } = await supabase
        .from("day_care_options")
        .select("*");
      if (error) throw error;
      return (data || []).map(mapDayCare);
    },

    getDayCareOption: async (type: string) => {
      assertConfigured();
      const { data, error } = await supabase
        .from("day_care_options")
        .select("*")
        .eq("type", type)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Option not found");
      return mapDayCare(data);
    },
  },

  settings: {
    getAppointmentSettings: async (): Promise<AppointmentSettings> => {
      assertConfigured();
      const { data, error } = await supabase
        .from("appointment_settings")
        .select("*")
        .eq("setting_name", "default")
        .maybeSingle();
      if (error) throw error;
      return {
        _id: data?.id,
        settingName: data?.setting_name || "default",
        maxBookingsPerTimeSlot: data?.max_bookings_per_time_slot ?? 5,
        description: data?.description,
        updatedBy: data?.updated_by,
        createdAt: data?.created_at,
        updatedAt: data?.updated_at,
      };
    },

    updateAppointmentSettings: async (maxBookingsPerTimeSlot: number) => {
      assertConfigured();
      const userId = await getSessionUserId();
      const { data, error } = await supabase
        .from("appointment_settings")
        .update({
          max_bookings_per_time_slot: maxBookingsPerTimeSlot,
          updated_by: userId,
        })
        .eq("setting_name", "default")
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  },
};
