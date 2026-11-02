import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  Edit,
  Trash2,
  Search,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  DollarSign,
  X,
  ArrowLeft,
  LogOut,
  Home,
  Dog,
  Scissors,
  Plus,
  ShoppingBag,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { apiService } from "../services/apiService";
import {
  User,
  Appointment,
  GroomingService,
  DayCareOption,
  Feature,
} from "../types";
import { clearGroomingServicesCache } from "../utils/pageDataCache";
import PetListingsManager from "../components/PetListingsManager";
import SuppliesManager from "../components/SuppliesManager";
import ConfirmDialog from "../components/ConfirmDialog";
import Toast, { ToastState } from "../components/Toast";

interface MemberAppointment {
  member: {
    name: string;
    email: string;
    phone: string;
  };
  appointments: Appointment[];
}

// 定义更新任务的接口
interface AppointmentUpdateTask {
  id: string;
  oldDateTime: string;
  serviceType: string;
}

// 将getDisplayStatus函数移到最上面，在hooks使用之前
// 添加一个辅助函数来获取正确的显示状态
const getDisplayStatus = (appointment: Appointment): string => {
  // 如果已经是Completed或Cancelled，保持不变
  if (
    appointment.status === "Completed" ||
    appointment.status === "Cancelled"
  ) {
    return appointment.status;
  }

  // 检查预约时间是否已过
  const apptDate =
    typeof appointment.date === "string"
      ? appointment.date.split("T")[0]
      : new Date(appointment.date).toISOString().split("T")[0];
  const apptTime = appointment.time || "";

  // 创建日期对象进行比较
  const apptDateTime = new Date(`${apptDate}T${apptTime}`);
  const currentDateTime = new Date();

  // 如果预约时间已过但状态仍为Booked，返回Completed
  if (apptDateTime < currentDateTime && appointment.status === "Booked") {
    return "Completed";
  }

  // 如果是Booked状态，返回Upcoming用于显示
  if (appointment.status === "Booked") {
    return "Upcoming";
  }

  // 否则返回原始状态
  return appointment.status;
};

const stickyFilterStyle: React.CSSProperties = {
  top: "var(--admin-chrome-h, 7.5rem)",
};

type MembersSubView =
  "dashboard" | "users" | "all-appointments" | "upcoming" | "completed";
type PortalTab = "members" | "services" | "pet-listings" | "supplies";
type ActiveView = MembersSubView | "pet-listings" | "supplies" | "services";

const isMembersView = (view: ActiveView): view is MembersSubView =>
  view === "dashboard" ||
  view === "users" ||
  view === "all-appointments" ||
  view === "upcoming" ||
  view === "completed";

const AdminPortal: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const chromeRef = useRef<HTMLDivElement>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All Status");
  const [filterDate, setFilterDate] = useState<string>("");
  const [filterTime, setFilterTime] = useState<string>("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentAppointment, setCurrentAppointment] =
    useState<Appointment | null>(null);
  const [editFormData, setEditFormData] = useState({
    date: "",
    time: "",
    serviceType: "Basic Grooming" as Appointment["serviceType"],
    notes: "",
    status: "Booked" as Appointment["status"],
    hasDaycare: false,
    dayCareOptions: {
      type: "daily" as "daily" | "longTerm",
      days: 1,
      morning: true,
      afternoon: true,
      evening: true,
    },
  });
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 6;
  const [activeView, setActiveView] = useState<ActiveView>("dashboard");
  // Keep last Members sub-view while other tabs are open (avoid remount flash)
  const [membersSubView, setMembersSubView] =
    useState<MembersSubView>("dashboard");
  // Mount-once tab panels so switching is instant after first load
  const [mountedTabs, setMountedTabs] = useState<Record<PortalTab, boolean>>({
    members: true,
    services: false,
    "pet-listings": false,
    supplies: false,
  });
  const [deleteAppointment, setDeleteAppointment] = useState<{
    id: string;
    oldDateTime: string;
    oldServiceType: string;
  } | null>(null);

  const todayIso = React.useMemo(
    () => new Date().toISOString().split("T")[0],
    [],
  );

  // Keep filter bars stuck just under Header + Tabs
  useLayoutEffect(() => {
    const el = chromeRef.current;
    if (!el) return;
    const sync = () => {
      el.style.setProperty("--admin-chrome-h", `${el.offsetHeight}px`);
      document.documentElement.style.setProperty(
        "--admin-chrome-h",
        `${el.offsetHeight}px`,
      );
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty("--admin-chrome-h");
    };
  }, []);

  // Track / warm tab panels so switching never remounts
  useEffect(() => {
    if (isMembersView(activeView)) {
      setMembersSubView(activeView);
      setMountedTabs((prev) =>
        prev.members ? prev : { ...prev, members: true },
      );
      return;
    }
    const tab = activeView as Exclude<PortalTab, "members">;
    setMountedTabs((prev) => (prev[tab] ? prev : { ...prev, [tab]: true }));
  }, [activeView]);

  // After Members data is ready, preload other tabs in the background
  useEffect(() => {
    if (loading) return;
    const timer = window.setTimeout(() => {
      setMountedTabs({
        members: true,
        services: true,
        "pet-listings": true,
        supplies: true,
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [loading]);

  // Live grooming catalogue (same source as booking page / Services tab)
  const [groomingServices, setGroomingServices] = useState<GroomingService[]>(
    [],
  );
  const [dayCareOptions] = useState<DayCareOption[]>([]);
  const [editSaving, setEditSaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  type DayCareType = "daily" | "longTerm";

  const [dayCareType, setDayCareType] = useState<DayCareType>("daily");
  const [features, setFeatures] = useState<Feature[]>([]);

  // Add handler for daycare type changes
  const handleDayCareTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as "daily" | "longTerm";
    // Default to 1 day for daily and 2 days for longTerm
    const defaultDays = newType === "daily" ? 1 : 2;

    setEditFormData({
      ...editFormData,
      dayCareOptions: {
        ...editFormData.dayCareOptions,
        type: newType,
        days: defaultDays,
      },
    });

    console.log(`Changed daycare type to ${newType}, with ${defaultDays} days`);
  };

  // Add handler for daycare days changes
  const handleDayCareDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const days = parseInt(e.target.value) || 1;

    setEditFormData({
      ...editFormData,
      dayCareOptions: {
        ...editFormData.dayCareOptions,
        days,
      },
    });

    console.log(`Changed daycare days to ${days}`);
  };

  const handleFeatureChange = (index: number, text: string) => {
    const newFeatures = [...features];
    newFeatures[index] = { text };
    setFeatures(newFeatures);
  };

  const handleDeleteFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const handleAddFeature = () => {
    setFeatures([...features, { text: "" }]);
  };

  useEffect(() => {
    // Check if user is admin, if not redirect to member dashboard
    if (user && user.role !== "admin") {
      navigate("/member-dashboard");
    }

    // Fetch users, appointments, and grooming services
    const fetchData = async () => {
      try {
        setLoading(true);
        const [usersData, appointmentsData, servicesData] = await Promise.all([
          apiService.admin.getAllUsers(),
          apiService.admin.getAllAppointments(),
          apiService.services
            .getGroomingServices()
            .catch(() => [] as GroomingService[]),
        ]);
        setUsers(usersData);
        if (Array.isArray(servicesData)) {
          setGroomingServices(servicesData as GroomingService[]);
        }

        // Auto-update status of past appointments from Booked to Completed
        const currentDateTime = new Date();
        const needsUpdate: AppointmentUpdateTask[] = [];

        const updatedAppointments = appointmentsData.map((appt) => {
          // Get appointment date and time
          const apptDate =
            typeof appt.date === "string"
              ? appt.date.split("T")[0]
              : new Date(appt.date).toISOString().split("T")[0];
          const apptTime = appt.time || "";

          // Create Date object for comparison
          const apptDateTime = new Date(`${apptDate}T${apptTime}`);

          // Clean up daycare options - ensure we only have valid daycare options
          if (appt.dayCareOptions) {
            const { type, days, morning, afternoon, evening } =
              appt.dayCareOptions;
            if (
              !type ||
              !days ||
              days <= 0 ||
              !(morning || afternoon || evening)
            ) {
              // If daycare options are invalid, set to undefined
              appt.dayCareOptions = undefined;
            }
          }

          // If appointment time has passed and status is still Booked, update to Completed
          if (apptDateTime < currentDateTime && appt.status === "Booked") {
            console.log(
              `Marking appointment ${appt._id} as Completed: ${apptDate} ${apptTime}`,
            );

            // Add to list for database update
            needsUpdate.push({
              id: appt._id || "",
              oldDateTime: `${apptDate}T${apptTime}`,
              serviceType: appt.serviceType || "Basic Grooming",
            });

            return { ...appt, status: "Completed" as const };
          }

          return appt;
        });

        setAppointments(updatedAppointments);

        // Update database for each appointment that needs status change
        if (needsUpdate.length > 0) {
          console.log(
            `Found ${needsUpdate.length} appointments to update to Completed status`,
          );
          await updateExpiredAppointmentsInDB(needsUpdate);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set a small timeout to ensure everything is properly loaded before checking again
    const initialRefreshTimeout = setTimeout(() => {
      console.log("Performing initial status refresh check");
      refreshAppointments();
    }, 2000);

    // Set up interval to check for completed appointments every 30 seconds
    const statusCheckInterval = setInterval(async () => {
      const currentDateTime = new Date();
      const needsUpdate: AppointmentUpdateTask[] = [];
      let hasChanges = false;

      setAppointments((prevAppointments) => {
        const updated = prevAppointments.map((appt) => {
          // Get appointment date and time
          const apptDate =
            typeof appt.date === "string"
              ? appt.date.split("T")[0]
              : new Date(appt.date).toISOString().split("T")[0];
          const apptTime = appt.time || "";

          // Create Date object for comparison
          const apptDateTime = new Date(`${apptDate}T${apptTime}`);

          // Clean up daycare options - ensure we only have valid daycare options
          if (appt.dayCareOptions) {
            const { type, days, morning, afternoon, evening } =
              appt.dayCareOptions;
            if (
              !type ||
              !days ||
              days <= 0 ||
              !(morning || afternoon || evening)
            ) {
              // If daycare options are invalid, set to undefined
              appt.dayCareOptions = undefined;
            }
          }

          // If appointment time has passed and status is still Booked, update to Completed
          if (apptDateTime < currentDateTime && appt.status === "Booked") {
            console.log(
              `Interval check: Marking appointment ${appt._id} as Completed: ${apptDate} ${apptTime}`,
            );

            // Add to list for database update
            needsUpdate.push({
              id: appt._id || "",
              oldDateTime: `${apptDate}T${apptTime}`,
              serviceType: appt.serviceType || "Basic Grooming",
            });

            hasChanges = true;
            return { ...appt, status: "Completed" as const };
          }

          return appt;
        });

        return hasChanges ? updated : prevAppointments;
      });

      // Update database for each appointment that needs status change
      if (needsUpdate.length > 0) {
        console.log(
          `Interval found ${needsUpdate.length} appointments to update to Completed status`,
        );
        await updateExpiredAppointmentsInDB(needsUpdate);
      }
    }, 30000); // Check every 30 seconds instead of every minute

    return () => {
      clearInterval(statusCheckInterval);
      clearTimeout(initialRefreshTimeout);
    };
  }, [user, navigate]);

  // Helper function to format date
  const formatDate = (dateString: string | Date) => {
    const date =
      typeof dateString === "string" ? new Date(dateString) : dateString;
    return date.toLocaleDateString();
  };

  // Helper function to format time in 12-hour format (AM/PM)
  const formatTime = (timeString: string) => {
    if (!timeString) return "";

    // Parse the time (assumes format like "14:00")
    const [hourStr, minuteStr] = timeString.split(":");
    const hour = parseInt(hourStr);
    const minute = minuteStr;

    // Convert to 12-hour format
    const period = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12; // Convert 0 to 12

    return `${hour12}:${minute} ${period}`;
  };

  // Group appointments by member, sort appointments by date/time
  const memberAppointments = React.useMemo(() => {
    const groupedByEmail: Record<string, MemberAppointment> = {};

    appointments.forEach((appt) => {
      const email = appt.ownerEmail;
      if (!email) return;

      if (!groupedByEmail[email]) {
        groupedByEmail[email] = {
          member: {
            name: appt.ownerName || "",
            email: email,
            phone: appt.ownerPhone || "",
          },
          appointments: [],
        };
      }

      groupedByEmail[email].appointments.push(appt);
    });

    // Sort appointments within each member
    Object.values(groupedByEmail).forEach((member) => {
      member.appointments.sort((a, b) => {
        // First sort by completion status (completed appointments go to the bottom)
        const statusA = getDisplayStatus(a);
        const statusB = getDisplayStatus(b);

        if (statusA === "Completed" && statusB !== "Completed") {
          return 1; // a (completed) goes after b (not completed)
        } else if (statusA !== "Completed" && statusB === "Completed") {
          return -1; // a (not completed) goes before b (completed)
        }

        // For appointments with the same completion status, sort by date/time
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA.getTime() - dateB.getTime();
      });
    });

    return Object.values(groupedByEmail);
  }, [appointments]);

  // Filter members based on search term and status
  const filteredMembers = React.useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    const appointmentMatchesFilters = (appt: Appointment) => {
      const statusMatches =
        filterStatus === "All Status" ||
        (filterStatus === "Upcoming" &&
          getDisplayStatus(appt) === "Upcoming") ||
        (filterStatus === "Completed" &&
          getDisplayStatus(appt) === "Completed") ||
        (filterStatus === "Cancelled" &&
          getDisplayStatus(appt) === "Cancelled");

      const apptDate =
        typeof appt.date === "string"
          ? appt.date.split("T")[0]
          : new Date(appt.date).toISOString().split("T")[0];
      const dateMatches = !filterDate || apptDate === filterDate;
      const timeMatches = !filterTime || appt.time.startsWith(filterTime);

      return statusMatches && dateMatches && timeMatches;
    };

    const filtered = memberAppointments.filter((item) => {
      const { name, email, phone } = item.member;
      const memberTextMatch =
        !q ||
        name.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        phone.toLowerCase().includes(q) ||
        item.appointments.some(
          (appt) =>
            (appt.petName || "").toLowerCase().includes(q) ||
            (appt.serviceType || "").toLowerCase().includes(q),
        );

      const hasMatchingAppointments = item.appointments.some(
        appointmentMatchesFilters,
      );
      return memberTextMatch && hasMatchingAppointments;
    });

    return filtered.sort((a, b) => {
      const isAMember = users.some((user) => user.email === a.member.email);
      const isBMember = users.some((user) => user.email === b.member.email);
      if (isAMember && !isBMember) return -1;
      if (!isAMember && isBMember) return 1;
      return a.member.name.localeCompare(b.member.name);
    });
  }, [
    memberAppointments,
    searchTerm,
    filterStatus,
    filterDate,
    filterTime,
    users,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterDate, filterTime]);

  // Count metrics for the dashboard
  const totalUsers = React.useMemo(() => {
    // 统计唯一的电子邮件地址数量
    const uniqueEmails = new Set<string>();
    appointments.forEach((appt) => {
      if (appt.ownerEmail) {
        uniqueEmails.add(appt.ownerEmail);
      }
    });
    return uniqueEmails.size;
  }, [appointments]);

  // 总预约数量
  const totalAppointments = appointments.length;

  // 重新计算统计数据，使用getDisplayStatus函数而不是原始状态
  // 计算即将到来的预约数量 - 只有状态实际为Upcoming的预约
  const upcomingAppointments = React.useMemo(() => {
    return appointments.filter((appt) => getDisplayStatus(appt) === "Upcoming")
      .length;
  }, [appointments]);

  // 使用getDisplayStatus获取实际状态来计算已完成的预约数量
  const completedAppointments = React.useMemo(() => {
    return appointments.filter((appt) => getDisplayStatus(appt) === "Completed")
      .length;
  }, [appointments]);

  const cancelledAppointments = React.useMemo(() => {
    return appointments.filter((appt) => appt.status === "Cancelled").length;
  }, [appointments]);

  // Convert 24h time to 12h time for display in the edit form
  const convertTo12HourFormat = (time24: string): string => {
    if (!time24) return "";

    const [hourStr, minuteStr] = time24.split(":");
    const hour = parseInt(hourStr);
    const minute = minuteStr;

    const period = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;

    return `${hour12.toString().padStart(2, "0")}:${minute} ${period}`;
  };

  // Convert 12h time back to 24h time for submission
  const convertTo24HourFormat = (time12: string): string => {
    if (!time12) return "";

    const [timePart, periodPart] = time12.split(" ");
    const [hourStr, minuteStr] = timePart.split(":");
    let hour = parseInt(hourStr);

    if (periodPart === "PM" && hour < 12) {
      hour += 12;
    } else if (periodPart === "AM" && hour === 12) {
      hour = 0;
    }

    return `${hour.toString().padStart(2, "0")}:${minuteStr}`;
  };

  const normalizeTimeForInput = (time: string): string => {
    if (!time) return "";
    if (/AM|PM/i.test(time)) return convertTo24HourFormat(time);
    return time.slice(0, 5);
  };

  // Update handleEditClick to save the original appointment data
  const handleEditClick = (appointment: Appointment) => {
    const hasDaycareService = Boolean(
      appointment.dayCareOptions &&
      (appointment.dayCareOptions.type === "daily" ||
        appointment.dayCareOptions.type === "longTerm"),
    );

    setCurrentAppointment(appointment);
    setEditFormData({
      date:
        typeof appointment.date === "string"
          ? appointment.date.split("T")[0]
          : new Date(appointment.date).toISOString().split("T")[0],
      time: normalizeTimeForInput(appointment.time || ""),
      serviceType:
        appointment.serviceType ||
        groomingServices[0]?.name ||
        "Basic Grooming",
      notes: appointment.notes || "",
      status: appointment.status,
      hasDaycare: hasDaycareService,
      dayCareOptions: {
        type: appointment.dayCareOptions?.type ?? "daily",
        days: appointment.dayCareOptions?.days ?? 1,
        morning: appointment.dayCareOptions?.morning ?? true,
        afternoon: appointment.dayCareOptions?.afternoon ?? true,
        evening: appointment.dayCareOptions?.evening ?? true,
      },
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (
    id: string,
    oldDateTime: string,
    oldServiceType: string,
  ) => {
    setDeleteAppointment({ id, oldDateTime, oldServiceType });
  };

  const confirmDeleteAppointment = async () => {
    if (!deleteAppointment) return;
    const { id, oldDateTime, oldServiceType } = deleteAppointment;
    setDeleteAppointment(null);
    try {
      await apiService.admin.deleteAppointment(id, oldDateTime, oldServiceType);
      setAppointments((prev) => prev.filter((appt) => appt._id !== id));
    } catch (error) {
      console.error("Failed to delete appointment:", error);
    }
  };

  // Update handleEditSubmit — grooming only; daycare is managed on its own page
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAppointment) return;

    const time24 = normalizeTimeForInput(editFormData.time);
    const oldDateTime =
      typeof currentAppointment.date === "string"
        ? `${currentAppointment.date.split("T")[0]}T${currentAppointment.time}`
        : `${new Date(currentAppointment.date).toISOString().split("T")[0]}T${currentAppointment.time}`;

    const appointmentDateTime = new Date(`${editFormData.date}T${time24}`);
    let finalStatus: Appointment["status"] = "Booked";
    if (currentAppointment.status === "Cancelled") {
      finalStatus = "Cancelled";
    } else if (appointmentDateTime < new Date()) {
      finalStatus = "Completed";
    }

    const matchedService = groomingServices.find(
      (s) => s.name === editFormData.serviceType,
    );
    const basePrice = matchedService?.price ?? currentAppointment.basePrice;
    const discountRate =
      matchedService?.discount ?? currentAppointment.discount ?? 0;
    const memberDiscount = currentAppointment.user
      ? (basePrice * discountRate) / 100
      : 0;
    const dayCarePrice = currentAppointment.dayCarePrice || 0;

    const updateData: Partial<Appointment> = {
      date: editFormData.date,
      time: time24,
      serviceType: editFormData.serviceType,
      notes: editFormData.notes,
      status: finalStatus,
      ...(matchedService
        ? {
            duration: matchedService.duration,
            basePrice,
            discount: discountRate,
            totalPrice: Math.max(0, basePrice - memberDiscount + dayCarePrice),
          }
        : {}),
    };

    try {
      setEditSaving(true);
      const updatedAppointment = await apiService.admin.updateAppointment(
        currentAppointment._id || "",
        updateData,
        oldDateTime,
        currentAppointment.serviceType || "Basic Grooming",
      );

      setAppointments((prev) =>
        prev.map((appt) =>
          appt._id === currentAppointment._id ? updatedAppointment : appt,
        ),
      );
      setIsEditModalOpen(false);
      setCurrentAppointment(null);
      setToast({ message: "Appointment updated", type: "success" });
    } catch (error) {
      console.error("Failed to update appointment:", error);
      setToast({ message: "Update failed. Please try again.", type: "error" });
    } finally {
      setEditSaving(false);
    }
  };

  // Helper function to check if appointment time has passed
  const hasAppointmentTimePassed = (date: string, time: string): boolean => {
    const appointmentDateTime = new Date(`${date}T${time}`);
    const currentDateTime = new Date();
    return appointmentDateTime < currentDateTime;
  };

  // Helper function to render daycare details - simplify to only show type and days
  const renderDayCareDetails = (dayCareOptions: any) => {
    if (!dayCareOptions) return null;

    const { type, days } = dayCareOptions;

    // Only display daycare if the type and days are valid
    if (!type || !days || days <= 0) {
      return null;
    }

    return (
      <div className="mt-1 text-gray-600 text-sm">
        <p>
          Daycare: {type === "daily" ? "Daily" : "Long Term"} ({days} day
          {days > 1 ? "s" : ""})
        </p>
      </div>
    );
  };

  // Handle the daycare checkbox toggle
  const handleDaycareToggle = (checked: boolean) => {
    if (checked) {
      // If enabling daycare, initialize with default options
      setEditFormData({
        ...editFormData,
        hasDaycare: true,
        dayCareOptions: {
          type: "daily",
          days: 1,
          morning: true,
          afternoon: true,
          evening: true,
        },
      });
    } else {
      // If disabling daycare, keep the options but set hasDaycare to false
      setEditFormData({
        ...editFormData,
        hasDaycare: false,
      });
    }
  };

  // Helper function to update appointment status
  const updateAppointmentStatus = async (
    appointmentId: string,
    oldDateTime: string,
    serviceType: string,
  ) => {
    try {
      await apiService.admin.updateAppointment(
        appointmentId,
        { status: "Completed" as const },
        oldDateTime,
        serviceType,
      );

      // Update local state
      setAppointments((prevAppointments) =>
        prevAppointments.map((appt) =>
          appt._id === appointmentId
            ? { ...appt, status: "Completed" as const }
            : appt,
        ),
      );
    } catch (error) {
      console.error("Failed to update appointment status:", error);
    }
  };

  // Update expired appointments in DB
  const updateExpiredAppointmentsInDB = async (
    tasks: AppointmentUpdateTask[],
  ) => {
    try {
      await Promise.all(
        tasks.map((task) =>
          updateAppointmentStatus(task.id, task.oldDateTime, task.serviceType),
        ),
      );
    } catch (error) {
      console.error("Failed to update expired appointments:", error);
    }
  };

  // Silent background refresh — do not flash the Members loading state
  const refreshAppointments = async () => {
    try {
      const appointmentsData = await apiService.admin.getAllAppointments();

      // Auto-update status of past appointments from Booked to Completed
      const currentDateTime = new Date();
      const needsUpdate: AppointmentUpdateTask[] = [];

      const updatedAppointments = appointmentsData.map((appt) => {
        // Get appointment date and time
        const apptDate =
          typeof appt.date === "string"
            ? appt.date.split("T")[0]
            : new Date(appt.date).toISOString().split("T")[0];
        const apptTime = appt.time || "";

        // Create Date object for comparison
        const apptDateTime = new Date(`${apptDate}T${apptTime}`);

        // If appointment time has passed and status is still Booked, update to Completed
        if (apptDateTime < currentDateTime && appt.status === "Booked") {
          console.log(
            `Refresh: Marking appointment ${appt._id} as Completed: ${apptDate} ${apptTime}`,
          );

          // Add to list for database update
          needsUpdate.push({
            id: appt._id || "",
            oldDateTime: `${apptDate}T${apptTime}`,
            serviceType: appt.serviceType || "Basic Grooming",
          });

          return { ...appt, status: "Completed" as const };
        }

        return appt;
      });

      setAppointments(updatedAppointments);

      // Update database for each appointment that needs status change
      if (needsUpdate.length > 0) {
        console.log(
          `Refresh found ${needsUpdate.length} appointments to update to Completed status`,
        );
        await updateExpiredAppointmentsInDB(needsUpdate);
      } else {
        console.log("No appointments needing status update were found");
      }
    } catch (error) {
      console.error("Failed to refresh appointments:", error);
    }
  };

  // Unique customers from appointments (registered members + guest bookers)
  const getAllUniqueUsers = React.useMemo(() => {
    const userEmails = new Set(users.map((u) => u.email).filter(Boolean));
    const usersMap = new Map<
      string,
      {
        name: string;
        email: string;
        phone: string;
        isMember: boolean;
        bookingCount: number;
      }
    >();

    appointments.forEach((appt) => {
      if (!appt.ownerEmail) return;
      const existing = usersMap.get(appt.ownerEmail);
      if (existing) {
        existing.bookingCount += 1;
        return;
      }
      usersMap.set(appt.ownerEmail, {
        name: appt.ownerName || "",
        email: appt.ownerEmail,
        phone: appt.ownerPhone || "",
        isMember: userEmails.has(appt.ownerEmail),
        bookingCount: 1,
      });
    });

    return Array.from(usersMap.values()).sort((a, b) => {
      if (a.isMember && !b.isMember) return -1;
      if (!a.isMember && b.isMember) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [appointments, users]);

  const [customerFilter, setCustomerFilter] = useState<
    "all" | "member" | "guest"
  >("all");
  const [customerSearch, setCustomerSearch] = useState("");

  const filteredCustomers = React.useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    return getAllUniqueUsers.filter((c) => {
      const typeOk =
        customerFilter === "all" ||
        (customerFilter === "member" && c.isMember) ||
        (customerFilter === "guest" && !c.isMember);
      const searchOk =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q);
      return typeOk && searchOk;
    });
  }, [getAllUniqueUsers, customerFilter, customerSearch]);

  // Function to get all appointments in a flat list without grouping by user
  const renderAppointmentList = (appointments: Appointment[]) => {
    if (appointments.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
          No appointments found.
        </div>
      );
    }

    // Group appointments by date
    const appointmentsByDate: Record<string, Appointment[]> = {};

    appointments.forEach((appointment) => {
      const date =
        typeof appointment.date === "string"
          ? appointment.date.split("T")[0]
          : new Date(appointment.date).toISOString().split("T")[0];

      if (!appointmentsByDate[date]) {
        appointmentsByDate[date] = [];
      }

      appointmentsByDate[date].push(appointment);
    });

    // Sort each group by time
    Object.values(appointmentsByDate).forEach((group) => {
      group.sort((a, b) => a.time.localeCompare(b.time));
    });

    // Get sorted dates
    const sortedDates = Object.keys(appointmentsByDate).sort();

    return (
      <div className="space-y-5">
        {sortedDates.map((date) => (
          <div key={date} className="space-y-2.5">
            <h3 className="text-sm font-semibold text-gray-500">
              {formatDate(date)}
              <span className="ml-2 font-normal text-gray-400">
                · {appointmentsByDate[date].length} booking
                {appointmentsByDate[date].length === 1 ? "" : "s"}
              </span>
            </h3>
            <div className="space-y-2.5">
              {appointmentsByDate[date].map((appointment) => {
                const status = getDisplayStatus(appointment);
                return (
                  <div
                    key={appointment._id}
                    className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:grid-cols-[6.5rem_1fr_auto] sm:items-center sm:gap-5"
                  >
                    {/* Time + status */}
                    <div className="flex items-center gap-3 sm:flex-col sm:items-start sm:gap-1.5 sm:border-r sm:border-gray-100 sm:pr-4">
                      <p className="text-base font-semibold tabular-nums text-gray-900">
                        {formatTime(appointment.time)}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          status === "Completed"
                            ? "bg-emerald-100 text-emerald-700"
                            : status === "Cancelled"
                              ? "bg-red-100 text-red-700"
                              : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {status}
                      </span>
                    </div>

                    {/* Service + customer */}
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-semibold text-gray-900 sm:text-[15px]">
                        {appointment.serviceType}
                        <span className="font-normal text-gray-400"> · </span>
                        {appointment.petName}{" "}
                        <span aria-hidden>
                          {appointment.petType === "dog" ? "🐕" : "🐱"}
                        </span>
                      </p>
                      <p className="text-sm font-medium text-gray-800">
                        {appointment.ownerName}
                      </p>
                      <div className="space-y-0.5 text-xs text-gray-500 sm:text-sm">
                        <p>{appointment.ownerPhone}</p>
                        <p className="truncate">{appointment.ownerEmail}</p>
                      </div>
                      {appointment.dayCareOptions && (
                        <div className="pt-0.5">
                          {renderDayCareDetails(appointment.dayCareOptions)}
                        </div>
                      )}
                      {appointment.notes?.trim() && (
                        <p className="pt-0.5 text-xs text-gray-500 sm:text-sm">
                          <span className="font-medium text-gray-600">
                            Note:
                          </span>{" "}
                          {appointment.notes.trim()}
                        </p>
                      )}
                    </div>

                    {/* Price + actions */}
                    <div className="flex items-center justify-between gap-4 border-t border-gray-100 pt-3 sm:flex-col sm:items-end sm:justify-center sm:border-0 sm:pt-0">
                      <PriceDetailsDropdown appointment={appointment} />
                      <div className="flex items-center gap-2">
                        {status !== "Completed" && (
                          <button
                            type="button"
                            onClick={() => handleEditClick(appointment)}
                            className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50 hover:text-blue-800"
                            aria-label="Edit appointment"
                          >
                            <Edit size={18} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteClick(
                              appointment._id || "",
                              `${appointment.date}T${appointment.time}`,
                              appointment.serviceType,
                            )
                          }
                          className="rounded-md p-1.5 text-red-600 hover:bg-red-50 hover:text-red-800"
                          aria-label="Delete appointment"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Shared filter bar for All / Upcoming / Completed appointment lists
  const renderDateTimeFilters = () => {
    return (
      <div
        className="sticky z-30 -mx-4 mb-3 space-y-1.5 border-b border-gray-200/80 bg-gray-50 px-4 py-2 sm:mx-0 sm:mb-5 sm:space-y-3 sm:px-0 sm:py-3"
        style={stickyFilterStyle}
      >
        <div className="flex flex-col gap-1.5 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
          <div className="relative min-w-0 flex-1 lg:max-w-md">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 md:left-3 md:h-4 md:w-4" />
            <input
              type="text"
              placeholder="Search name, phone, pet, or service…"
              className="w-full rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-8 text-xs outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 md:rounded-lg md:py-2 md:pl-9 md:pr-9 md:text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 md:right-2"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex min-w-0 items-center gap-1.5 md:gap-2">
            <button
              type="button"
              onClick={() => setFilterDate(todayIso)}
              className={`inline-flex h-8 shrink-0 items-center rounded-md px-2.5 text-xs font-medium transition md:h-9 md:rounded-lg md:px-3 md:text-sm ${
                filterDate === todayIso
                  ? "bg-blue-600 text-white shadow-sm"
                  : "border border-gray-200 bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-700"
              }`}
            >
              Today
            </button>
            <div className="relative flex h-8 min-w-0 flex-1 items-stretch overflow-hidden rounded-md border border-gray-200 bg-white md:h-9 md:flex-none md:rounded-lg">
              <input
                type="date"
                className={`h-full w-full min-w-0 cursor-pointer border-0 bg-transparent px-2 text-xs leading-none text-gray-900 outline-none md:w-[9.5rem] md:px-3 md:text-sm ${
                  filterDate ? "" : "date-hint-empty"
                }`}
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
              />
              {!filterDate && (
                <span className="pointer-events-none absolute left-2 top-1/2 z-10 -translate-y-1/2 text-xs text-gray-400 md:left-3 md:text-sm">
                  dd/mm/yyyy
                </span>
              )}
              {filterDate && (
                <button
                  type="button"
                  onClick={() => setFilterDate("")}
                  className="inline-flex h-full items-center border-l border-gray-200 px-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600 md:px-2"
                  title="Clear date"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {(searchTerm || filterDate) && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {filterDate === todayIso
                ? "Showing today's bookings"
                : "Filters active"}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setFilterDate("");
                setFilterTime("");
              }}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    );
  };

  // Function to filter appointments based on search and date/time filters
  const filterAppointments = (appts: Appointment[]) => {
    return appts
      .filter((appt) => {
        // Search filter
        const searchMatches =
          !searchTerm ||
          appt.ownerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          appt.ownerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          appt.ownerPhone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          appt.petName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          appt.serviceType?.toLowerCase().includes(searchTerm.toLowerCase());

        // Date filter
        const dateMatches =
          !filterDate ||
          (typeof appt.date === "string"
            ? appt.date.split("T")[0] === filterDate
            : new Date(appt.date).toISOString().split("T")[0] === filterDate);

        // Time filter
        const timeMatches = !filterTime || appt.time.startsWith(filterTime);

        return searchMatches && dateMatches && timeMatches;
      })
      .sort((a, b) => {
        // Sort by date first
        const dateA =
          typeof a.date === "string" ? new Date(a.date) : new Date(a.date);
        const dateB =
          typeof b.date === "string" ? new Date(b.date) : new Date(b.date);

        if (dateA.getTime() !== dateB.getTime()) {
          return dateA.getTime() - dateB.getTime();
        }

        // If dates are the same, sort by time
        return a.time.localeCompare(b.time);
      });
  };

  // Update getPriceDetails function to use groomingServices and dayCareOptions
  const getPriceDetails = (appointment: Appointment) => {
    // Get base price based on service type
    let basePrice = 0;
    let memberDiscount = 0;
    let discountRate = 0;

    // Find the matching service in groomingServices
    const service = groomingServices.find(
      (s) => s.name === appointment.serviceType,
    );
    if (service) {
      basePrice = service.price;
      discountRate = service.discount;
      // Calculate member discount if applicable
      if (appointment.user) {
        // If user exists, it means they are a member
        memberDiscount = (basePrice * discountRate) / 100;
      }
      console.log(
        `Found service price for ${service.name}: ${service.price}, discount: ${discountRate}%`,
      );
    } else {
      console.warn(
        `Service not found for type: ${appointment.serviceType}, using default price`,
      );
      // Use default prices and discount rates as fallback
      switch (appointment.serviceType) {
        case "Basic Grooming":
          basePrice = 70;
          discountRate = 8;
          break;
        case "Premium Grooming":
        case "Full Grooming":
          basePrice = 140;
          discountRate = 8;
          break;
        case "Spa Treatment":
          basePrice = 240;
          discountRate = 10; // Updated to 10% to match the correct rate
          break;
        default:
          basePrice = 0;
          discountRate = 0;
      }
      if (appointment.user) {
        memberDiscount = (basePrice * discountRate) / 100;
      }
    }

    // Calculate daycare price if applicable
    let dayCarePrice = 0;
    if (
      appointment.dayCareOptions &&
      appointment.dayCareOptions.type &&
      appointment.dayCareOptions.days &&
      appointment.dayCareOptions.days > 0
    ) {
      const { type, days } = appointment.dayCareOptions;
      const dayCareOption = dayCareOptions.find((opt) => opt.type === type);
      if (dayCareOption) {
        dayCarePrice = dayCareOption.price * days;
      } else {
        // Fallback to default prices
        if (type === "daily") {
          dayCarePrice = 50 * days;
        } else if (type === "longTerm") {
          dayCarePrice = 80 * days;
        }
      }
    }

    // Calculate total
    const totalBeforeDiscount = basePrice + dayCarePrice;
    const totalAfterDiscount = totalBeforeDiscount - memberDiscount;

    return {
      servicePrice: basePrice,
      dayCarePrice,
      memberDiscount,
      totalBeforeDiscount,
      totalPrice: totalAfterDiscount,
      discountRate, // Added to help with debugging
    };
  };

  // Price details popover — fixed portal so scroll containers cannot clip it
  const PriceDetailsDropdown: React.FC<{ appointment: Appointment }> = ({
    appointment,
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const priceDetails = getPriceDetails(appointment);
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const panelRef = React.useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState({
      top: 0,
      left: 0,
      placeAbove: false,
    });

    const updatePosition = React.useCallback(() => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const panelWidth = 280;
      const gap = 6;
      const placeAbove = window.innerHeight - rect.bottom < 220;
      let left = rect.right - panelWidth;
      left = Math.max(8, Math.min(left, window.innerWidth - panelWidth - 8));
      setCoords({
        top: placeAbove ? rect.top - gap : rect.bottom + gap,
        left,
        placeAbove,
      });
    }, []);

    useEffect(() => {
      if (!isOpen) return;
      updatePosition();
      const onScrollOrResize = () => updatePosition();
      window.addEventListener("resize", onScrollOrResize);
      window.addEventListener("scroll", onScrollOrResize, true);
      return () => {
        window.removeEventListener("resize", onScrollOrResize);
        window.removeEventListener("scroll", onScrollOrResize, true);
      };
    }, [isOpen, updatePosition]);

    useEffect(() => {
      if (!isOpen) return;
      const handleClickOutside = (event: MouseEvent) => {
        const t = event.target as Node;
        if (triggerRef.current?.contains(t) || panelRef.current?.contains(t))
          return;
        setIsOpen(false);
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    return (
      <>
        <button
          type="button"
          ref={triggerRef}
          className="inline-flex items-center text-sm font-semibold text-emerald-600 hover:text-emerald-800"
          onClick={() => setIsOpen((v) => !v)}
        >
          <span>RM {priceDetails.totalPrice.toFixed(2)}</span>
          <ChevronDown
            size={16}
            className={`ml-1 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>

        {isOpen &&
          createPortal(
            <div
              ref={panelRef}
              className="fixed z-[100] min-w-[280px] rounded-lg border border-gray-200 bg-white p-4 shadow-xl"
              style={{
                top: coords.top,
                left: coords.left,
                transform: coords.placeAbove ? "translateY(-100%)" : undefined,
              }}
            >
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-base font-semibold text-gray-900">
                  Price Details
                </h4>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between gap-4">
                  <span>Service Price:</span>
                  <span>RM {priceDetails.servicePrice.toFixed(2)}</span>
                </div>

                {priceDetails.dayCarePrice > 0 &&
                  appointment.dayCareOptions && (
                    <div className="flex justify-between gap-4">
                      <span>
                        Day Care (
                        {appointment.dayCareOptions.type === "daily"
                          ? "Daily"
                          : "Long Term"}{" "}
                        - {appointment.dayCareOptions.days} day
                        {appointment.dayCareOptions.days > 1 ? "s" : ""}):
                      </span>
                      <span className="shrink-0">
                        RM {priceDetails.dayCarePrice.toFixed(2)}
                      </span>
                    </div>
                  )}

                {priceDetails.memberDiscount > 0 && (
                  <div className="flex justify-between gap-4 text-emerald-600">
                    <span>Member Discount ({priceDetails.discountRate}%):</span>
                    <span className="shrink-0">
                      -RM {priceDetails.memberDiscount.toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="mt-2 border-t border-gray-100 pt-2">
                  <div className="flex justify-between gap-4 font-bold text-gray-900">
                    <span>Total:</span>
                    <span>RM {priceDetails.totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )}
      </>
    );
  };

  // Members tab content — uses frozen membersSubView while other tabs are open
  const renderContent = (): ReactNode => {
    switch (membersSubView) {
      case "users": {
        const memberCount = getAllUniqueUsers.filter((c) => c.isMember).length;
        const guestCount = getAllUniqueUsers.length - memberCount;
        return (
          <div className="space-y-2.5 md:space-y-4">
            <div className="flex items-center gap-2 md:gap-3">
              <button
                type="button"
                onClick={() => setActiveView("dashboard")}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                aria-label="Back to Dashboard"
              >
                <ArrowLeft size={20} className="md:h-[22px] md:w-[22px]" />
              </button>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-gray-900 md:text-xl">
                  Customers
                </h2>
                <p className="text-xs text-gray-500 md:text-sm">
                  {memberCount} member{memberCount === 1 ? "" : "s"} ·{" "}
                  {guestCount} guest
                  {guestCount === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            <div
              className="sticky z-30 -mx-4 space-y-2 border-b border-gray-200/80 bg-gray-50 px-4 py-2.5 sm:mx-0 sm:space-y-3 sm:px-0 sm:py-3"
              style={stickyFilterStyle}
            >
              <div className="relative max-w-md">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 md:left-3 md:h-4 md:w-4" />
                <input
                  type="text"
                  placeholder="Search name, phone, or email…"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-8 text-xs outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 md:rounded-lg md:py-2 md:pl-9 md:pr-9 md:text-sm"
                />
                {customerSearch && (
                  <button
                    type="button"
                    onClick={() => setCustomerSearch("")}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 md:right-2"
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 py-1">
                {(
                  [
                    {
                      value: "all",
                      label: `All (${getAllUniqueUsers.length})`,
                    },
                    { value: "member", label: `Members (${memberCount})` },
                    { value: "guest", label: `Guests (${guestCount})` },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCustomerFilter(opt.value)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                      customerFilter === opt.value
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-blue-50 hover:text-blue-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredCustomers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500">
                No customers match.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <ul className="divide-y divide-gray-100">
                  {filteredCustomers.map((customer) => (
                    <li
                      key={customer.email}
                      className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-gray-900">
                            {customer.name}
                          </h3>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              customer.isMember
                                ? "bg-pink-100 text-pink-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {customer.isMember ? "Member" : "Guest"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600">
                          {customer.phone || "—"}
                        </p>
                        <p className="truncate text-xs text-gray-400 sm:text-sm">
                          {customer.email}
                        </p>
                      </div>
                      <p className="shrink-0 text-xs text-gray-400 sm:text-right sm:text-sm">
                        <span className="font-medium text-gray-700">
                          {customer.bookingCount}
                        </span>{" "}
                        booking{customer.bookingCount === 1 ? "" : "s"}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      }

      case "all-appointments": {
        const list = filterAppointments(appointments);
        return (
          <div className="space-y-2.5 md:space-y-4">
            <div className="flex items-center gap-2 md:gap-3">
              <button
                type="button"
                onClick={() => setActiveView("dashboard")}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                aria-label="Back to Dashboard"
              >
                <ArrowLeft size={20} className="md:h-[22px] md:w-[22px]" />
              </button>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-gray-900 md:text-xl">
                  All bookings
                </h2>
                <p className="text-xs text-gray-500 md:text-sm">
                  {list.length} shown
                </p>
              </div>
            </div>
            {renderDateTimeFilters()}
            {renderAppointmentList(list)}
          </div>
        );
      }

      case "upcoming": {
        const upcomingAppointmentsList = appointments.filter(
          (appt) => getDisplayStatus(appt) === "Upcoming",
        );
        const list = filterAppointments(upcomingAppointmentsList);
        return (
          <div className="space-y-2.5 md:space-y-4">
            <div className="flex items-center gap-2 md:gap-3">
              <button
                type="button"
                onClick={() => setActiveView("dashboard")}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                aria-label="Back to Dashboard"
              >
                <ArrowLeft size={20} className="md:h-[22px] md:w-[22px]" />
              </button>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-gray-900 md:text-xl">
                  Upcoming
                </h2>
                <p className="text-xs text-gray-500 md:text-sm">
                  {list.length} shown
                </p>
              </div>
            </div>
            {renderDateTimeFilters()}
            {renderAppointmentList(list)}
          </div>
        );
      }

      case "completed": {
        const completedAppointmentsList = appointments.filter(
          (appt) => getDisplayStatus(appt) === "Completed",
        );
        const list = filterAppointments(completedAppointmentsList);
        return (
          <div className="space-y-2.5 md:space-y-4">
            <div className="flex items-center gap-2 md:gap-3">
              <button
                type="button"
                onClick={() => setActiveView("dashboard")}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                aria-label="Back to Dashboard"
              >
                <ArrowLeft size={20} className="md:h-[22px] md:w-[22px]" />
              </button>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-gray-900 md:text-xl">
                  Completed
                </h2>
                <p className="text-xs text-gray-500 md:text-sm">
                  {list.length} shown
                </p>
              </div>
            </div>
            {renderDateTimeFilters()}
            {renderAppointmentList(list)}
          </div>
        );
      }

      default:
        return (
          <>
            {/* Stats — tap a card to open its list */}
            <div className="mb-5 grid grid-cols-2 gap-3 md:mb-6 md:grid-cols-4 md:gap-4">
              {(
                [
                  {
                    key: "users",
                    label: "Customers",
                    value: totalUsers,
                    hint: "With bookings",
                    icon: Users,
                    iconClass: "bg-pink-100 text-pink-600",
                    onClick: () => setActiveView("users"),
                  },
                  {
                    key: "all",
                    label: "All bookings",
                    value: totalAppointments,
                    hint: `RM ${appointments.reduce((sum, appt) => sum + (appt.totalPrice || 0), 0).toFixed(0)} total`,
                    icon: Calendar,
                    iconClass: "bg-purple-100 text-purple-600",
                    onClick: () => setActiveView("all-appointments"),
                  },
                  {
                    key: "upcoming",
                    label: "Upcoming",
                    value: upcomingAppointments,
                    hint: `RM ${appointments
                      .filter((appt) => getDisplayStatus(appt) === "Upcoming")
                      .reduce((sum, appt) => sum + (appt.totalPrice || 0), 0)
                      .toFixed(0)} expected`,
                    icon: Clock,
                    iconClass: "bg-blue-100 text-blue-600",
                    onClick: () => setActiveView("upcoming"),
                  },
                  {
                    key: "completed",
                    label: "Completed",
                    value: completedAppointments,
                    hint: `RM ${appointments
                      .filter((appt) => getDisplayStatus(appt) === "Completed")
                      .reduce((sum, appt) => sum + (appt.totalPrice || 0), 0)
                      .toFixed(0)} received`,
                    icon: CheckCircle,
                    iconClass: "bg-green-100 text-green-600",
                    onClick: () => setActiveView("completed"),
                  },
                ] as const
              ).map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.key}
                    type="button"
                    onClick={card.onClick}
                    className="group flex items-start justify-between rounded-xl border border-gray-200 bg-white p-3.5 text-left shadow-sm transition hover:border-gray-300 hover:bg-gray-50 md:p-4"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-500 md:text-sm">
                        {card.label}
                      </p>
                      <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
                        {card.value}
                      </p>
                      <p className="mt-1 truncate text-[11px] text-gray-400 md:text-xs">
                        {card.hint}
                      </p>
                    </div>
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full md:h-10 md:w-10 ${card.iconClass}`}
                    >
                      <Icon size={18} />
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search & filters — flat toolbar; no outer card box */}
            <div
              className="sticky z-30 -mx-4 mb-3 space-y-1.5 border-b border-gray-200/80 bg-gray-50 px-4 py-2 sm:mx-0 sm:mb-6 sm:space-y-3 sm:px-0 sm:py-3"
              style={stickyFilterStyle}
            >
              <div className="flex flex-col gap-1.5 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
                <div className="relative min-w-0 flex-1 lg:max-w-md">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 md:left-3 md:h-4 md:w-4" />
                  <input
                    type="text"
                    placeholder="Search name, phone, pet, or service…"
                    className="w-full rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-8 text-xs outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 md:rounded-lg md:py-2 md:pl-9 md:pr-9 md:text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      aria-label="Clear search"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 md:right-2"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="flex min-w-0 items-center gap-1.5 md:gap-2">
                  <button
                    type="button"
                    onClick={() => setFilterDate(todayIso)}
                    className={`inline-flex h-8 shrink-0 items-center rounded-md px-2.5 text-xs font-medium transition md:h-9 md:rounded-lg md:px-3 md:text-sm ${
                      filterDate === todayIso
                        ? "bg-blue-600 text-white shadow-sm"
                        : "border border-gray-200 bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                    }`}
                  >
                    Today
                  </button>
                  <div className="relative flex h-8 min-w-0 flex-1 items-stretch overflow-hidden rounded-md border border-gray-200 bg-white md:h-9 md:rounded-lg lg:flex-none">
                    <input
                      type="date"
                      className={`h-full w-full min-w-0 cursor-pointer border-0 bg-transparent px-2 text-xs leading-none text-gray-900 outline-none lg:w-[9.5rem] lg:px-3 md:text-sm ${
                        filterDate ? "" : "date-hint-empty"
                      }`}
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      onClick={(e) =>
                        (e.target as HTMLInputElement).showPicker?.()
                      }
                    />
                    {!filterDate && (
                      <span className="pointer-events-none absolute left-2 top-1/2 z-10 -translate-y-1/2 text-xs text-gray-400 lg:left-3 md:text-sm">
                        dd/mm/yyyy
                      </span>
                    )}
                    {filterDate && (
                      <button
                        type="button"
                        onClick={() => setFilterDate("")}
                        className="inline-flex h-full items-center border-l border-gray-200 px-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-600 md:px-2"
                        title="Clear date"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <span className="hidden shrink-0 text-xs text-gray-400 lg:inline">
                    {filteredMembers.length} customer
                    {filteredMembers.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              <div className="-mx-0.5 grid grid-cols-4 gap-1.5 px-0.5 py-1 lg:mx-0 lg:flex lg:gap-1.5 lg:px-0 lg:py-0">
                {(
                  [
                    { value: "All Status", label: "All" },
                    { value: "Upcoming", label: "Upcoming" },
                    { value: "Completed", label: "Completed" },
                    { value: "Cancelled", label: "Cancelled" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFilterStatus(opt.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition max-lg:w-full lg:w-auto lg:shrink-0 ${
                      filterStatus === opt.value
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-blue-50 hover:text-blue-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-right text-[11px] leading-none text-gray-400 lg:hidden">
                {filteredMembers.length} customer
                {filteredMembers.length === 1 ? "" : "s"}
              </p>

              {(searchTerm || filterStatus !== "All Status" || filterDate) && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    {filterDate === todayIso
                      ? "Showing today's matching bookings"
                      : "Filters active"}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm("");
                      setFilterStatus("All Status");
                      setFilterDate("");
                      setFilterTime("");
                    }}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
              </div>
            ) : (
              <>
                {/* Member list with pagination - 调整移动端布局 */}
                <div className="space-y-4 md:space-y-6">
                  {filteredMembers
                    .slice(
                      (currentPage - 1) * usersPerPage,
                      currentPage * usersPerPage,
                    )
                    .map((item) => {
                      const filteredAppointments = item.appointments.filter(
                        (appt) => {
                          const statusMatches =
                            filterStatus === "All Status" ||
                            (filterStatus === "Upcoming" &&
                              getDisplayStatus(appt) === "Upcoming") ||
                            (filterStatus === "Completed" &&
                              getDisplayStatus(appt) === "Completed") ||
                            (filterStatus === "Cancelled" &&
                              getDisplayStatus(appt) === "Cancelled");

                          const apptDate =
                            typeof appt.date === "string"
                              ? appt.date.split("T")[0]
                              : new Date(appt.date).toISOString().split("T")[0];
                          const dateMatches =
                            !filterDate || apptDate === filterDate;
                          const timeMatches =
                            !filterTime || appt.time.startsWith(filterTime);

                          return statusMatches && dateMatches && timeMatches;
                        },
                      );

                      if (filteredAppointments.length === 0) return null;

                      const isMember = users.some(
                        (user) => user.email === item.member.email,
                      );

                      return (
                        <div
                          key={item.member.email}
                          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:p-5"
                        >
                          <div className="flex flex-col gap-4 md:grid md:grid-cols-3 md:gap-5">
                            <div className="md:col-span-1">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {item.member.name}
                                </h3>
                                {isMember && (
                                  <span className="shrink-0 rounded-full bg-pink-100 px-2.5 py-0.5 text-xs font-medium text-pink-700">
                                    Member
                                  </span>
                                )}
                              </div>
                              <div className="mt-1.5 space-y-0.5">
                                <p className="truncate text-sm text-gray-500">
                                  {item.member.email}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {item.member.phone}
                                </p>
                                <p className="pt-1 text-xs text-gray-400">
                                  {filteredAppointments.length} booking
                                  {filteredAppointments.length === 1 ? "" : "s"}
                                </p>
                              </div>
                            </div>

                            <div className="md:col-span-2">
                              <div className="max-h-[320px] space-y-2.5 overflow-y-auto pr-1 custom-scrollbar">
                                {filteredAppointments.map((appointment) => {
                                  const status = getDisplayStatus(appointment);
                                  return (
                                    <div
                                      key={appointment._id}
                                      className="rounded-lg border border-gray-100 bg-gray-50/80 p-3"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <h4 className="text-sm font-medium text-gray-900">
                                              {appointment.serviceType} ·{" "}
                                              {appointment.petName}
                                            </h4>
                                            <span
                                              className="text-sm leading-none"
                                              aria-hidden
                                            >
                                              {appointment.petType === "dog"
                                                ? "🐕"
                                                : "🐱"}
                                            </span>
                                          </div>
                                          <p className="mt-1 text-sm text-gray-600">
                                            {formatDate(appointment.date)} ·{" "}
                                            {formatTime(appointment.time)}
                                          </p>
                                          {appointment.dayCareOptions && (
                                            <p className="mt-0.5 text-xs text-gray-500">
                                              Daycare:{" "}
                                              {appointment.dayCareOptions
                                                .type === "longTerm"
                                                ? "Long Term"
                                                : "Daily"}{" "}
                                              ({appointment.dayCareOptions.days}{" "}
                                              days)
                                            </p>
                                          )}
                                          {appointment.notes?.trim() && (
                                            <p className="mt-0.5 text-xs text-gray-500">
                                              <span className="font-medium text-gray-600">
                                                Note:
                                              </span>{" "}
                                              {appointment.notes.trim()}
                                            </p>
                                          )}
                                          <div className="mt-2 flex flex-wrap items-center gap-2">
                                            <span
                                              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                                                status === "Upcoming"
                                                  ? "bg-blue-100 text-blue-700"
                                                  : status === "Completed"
                                                    ? "bg-emerald-100 text-emerald-700"
                                                    : status === "Cancelled"
                                                      ? "bg-red-100 text-red-700"
                                                      : "bg-gray-100 text-gray-600"
                                              }`}
                                            >
                                              {status}
                                            </span>
                                            <PriceDetailsDropdown
                                              appointment={appointment}
                                            />
                                          </div>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1.5">
                                          {status !== "Completed" && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleEditClick(appointment)
                                              }
                                              className="text-blue-600 hover:text-blue-800"
                                              title="Edit appointment"
                                              aria-label="Edit appointment"
                                            >
                                              <Edit size={18} />
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleDeleteClick(
                                                appointment._id || "",
                                                `${appointment.date}T${appointment.time}`,
                                                appointment.serviceType || "",
                                              )
                                            }
                                            className="text-red-600 hover:text-red-800"
                                            title="Delete appointment"
                                            aria-label="Delete appointment"
                                          >
                                            <Trash2 size={18} />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* 分页控制 */}
                {Math.ceil(filteredMembers.length / usersPerPage) > 1 && (
                  <div className="mt-6 flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                      Showing{" "}
                      {Math.min(
                        (currentPage - 1) * usersPerPage + 1,
                        filteredMembers.length,
                      )}{" "}
                      to{" "}
                      {Math.min(
                        currentPage * usersPerPage,
                        filteredMembers.length,
                      )}{" "}
                      of {filteredMembers.length} results
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={currentPage === 1}
                        className={`p-2 rounded ${
                          currentPage === 1
                            ? "text-gray-400 cursor-not-allowed"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button
                        onClick={() =>
                          setCurrentPage((p) =>
                            Math.min(
                              Math.ceil(filteredMembers.length / usersPerPage),
                              p + 1,
                            ),
                          )
                        }
                        disabled={
                          currentPage >=
                          Math.ceil(filteredMembers.length / usersPerPage)
                        }
                        className={`p-2 rounded ${
                          currentPage >=
                          Math.ceil(filteredMembers.length / usersPerPage)
                            ? "text-gray-400 cursor-not-allowed"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ConfirmDialog
        open={Boolean(deleteAppointment)}
        title="Delete this appointment?"
        message="This cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDeleteAppointment}
        onCancel={() => setDeleteAppointment(null)}
      />

      <div
        ref={chromeRef}
        className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm"
      >
        <header>
          <div className="container mx-auto flex items-center px-4 py-3">
            <div className="flex items-center gap-2.5">
              <img
                src="/imgs/AH%20HAO%20PET%20SHOP%20LOGO.png"
                alt="AH HAO PET SHOP"
                className="h-9 w-auto object-contain sm:h-10"
              />
              <h1 className="text-lg font-bold text-gray-900 sm:text-xl">
                Admin Portal
              </h1>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100"
                title="Back to Homepage"
              >
                <Home className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={logout}
                className="rounded-full p-2 text-red-500 transition-colors hover:bg-red-50"
                title="Logout"
              >
                <LogOut className="h-6 w-6" />
              </button>
            </div>
          </div>
        </header>

        <div className="border-t border-gray-100 bg-gray-50">
          <div className="container mx-auto px-4">
            <nav
              className="-mb-px grid w-full grid-cols-4 md:flex md:justify-start md:gap-2"
              aria-label="Tabs"
            >
              <button
                type="button"
                onClick={() => setActiveView("dashboard")}
                className={`min-w-0 px-1 py-3 text-center md:px-6 md:py-3 md:text-left ${
                  activeView === "dashboard" ||
                  activeView === "users" ||
                  activeView === "all-appointments" ||
                  activeView === "upcoming" ||
                  activeView === "completed"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "border-b-2 border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                <div className="flex flex-col items-center md:flex-row">
                  <Users className="mb-1 h-5 w-5 shrink-0 md:mb-0 md:mr-2" />
                  <span className="max-w-full truncate text-[11px] leading-tight md:text-base">
                    <span className="hidden md:inline">
                      Members & Appointments
                    </span>
                    <span className="md:hidden">Booking</span>
                  </span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setActiveView("services")}
                className={`min-w-0 px-1 py-3 text-center md:px-6 md:py-3 md:text-left ${
                  activeView === "services"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "border-b-2 border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                <div className="flex flex-col items-center md:flex-row">
                  <Scissors className="mb-1 h-5 w-5 shrink-0 md:mb-0 md:mr-2" />
                  <span className="max-w-full truncate text-[11px] leading-tight md:text-base">
                    <span className="hidden md:inline">
                      Services Management
                    </span>
                    <span className="md:hidden">Groom</span>
                  </span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setActiveView("pet-listings")}
                className={`min-w-0 px-1 py-3 text-center md:px-6 md:py-3 md:text-left ${
                  activeView === "pet-listings"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "border-b-2 border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                <div className="flex flex-col items-center md:flex-row">
                  <Dog className="mb-1 h-5 w-5 shrink-0 md:mb-0 md:mr-2" />
                  <span className="max-w-full truncate text-[11px] leading-tight md:text-base">
                    <span className="hidden md:inline">Pet Listings</span>
                    <span className="md:hidden">Pets</span>
                  </span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setActiveView("supplies")}
                className={`min-w-0 px-1 py-3 text-center md:px-6 md:py-3 md:text-left ${
                  activeView === "supplies"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "border-b-2 border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                <div className="flex flex-col items-center md:flex-row">
                  <ShoppingBag className="mb-1 h-5 w-5 shrink-0 md:mb-0 md:mr-2" />
                  <span className="max-w-full truncate text-[11px] leading-tight md:text-base">
                    <span className="hidden md:inline">Supplies</span>
                    <span className="md:hidden">Shop</span>
                  </span>
                </div>
              </button>
            </nav>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-4 sm:py-8">
        {/* Keep-alive panels: mount once, toggle visibility — no remount / loading flash */}
        <div className="mx-auto max-w-7xl">
          {mountedTabs.members && (
            <div
              className={isMembersView(activeView) ? undefined : "hidden"}
              aria-hidden={!isMembersView(activeView)}
            >
              {renderContent()}
            </div>
          )}
          {mountedTabs.services && (
            <div
              className={activeView === "services" ? undefined : "hidden"}
              aria-hidden={activeView !== "services"}
            >
              <ServiceManagement />
            </div>
          )}
          {mountedTabs["pet-listings"] && (
            <div
              className={activeView === "pet-listings" ? undefined : "hidden"}
              aria-hidden={activeView !== "pet-listings"}
            >
              <PetListingsManager />
            </div>
          )}
          {mountedTabs.supplies && (
            <div
              className={activeView === "supplies" ? undefined : "hidden"}
              aria-hidden={activeView !== "supplies"}
            >
              <SuppliesManager />
            </div>
          )}
        </div>
      </main>

      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Edit Modal */}
      {isEditModalOpen && currentAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 px-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-gray-900">
                  Edit Appointment
                </h3>
                <p className="mt-1 truncate text-sm text-gray-500">
                  {currentAppointment.serviceType} ·{" "}
                  {currentAppointment.petName}{" "}
                  <span aria-hidden>
                    {currentAppointment.petType === "dog" ? "🐕" : "🐱"}
                  </span>
                </p>
                <p className="truncate text-xs text-gray-400">
                  {currentAppointment.ownerName} ·{" "}
                  {currentAppointment.ownerPhone}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setCurrentAppointment(null);
                }}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Date
                  </label>
                  <div className="relative">
                    <Calendar
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                      size={16}
                    />
                    <input
                      type="date"
                      value={editFormData.date}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          date: e.target.value,
                        })
                      }
                      className={`w-full cursor-pointer rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100 ${
                        editFormData.date ? "" : "date-hint-empty"
                      }`}
                      required
                      onClick={(e) =>
                        (e.target as HTMLInputElement).showPicker?.()
                      }
                    />
                    {!editFormData.date && (
                      <span className="pointer-events-none absolute left-9 top-1/2 z-10 -translate-y-1/2 text-sm text-gray-400">
                        dd/mm/yyyy
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Time
                  </label>
                  <div className="relative">
                    <Clock
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                      size={16}
                    />
                    <input
                      type="time"
                      value={editFormData.time}
                      onChange={(e) =>
                        setEditFormData({
                          ...editFormData,
                          time: e.target.value,
                        })
                      }
                      className="w-full cursor-pointer rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                      required
                      onClick={(e) =>
                        (e.target as HTMLInputElement).showPicker?.()
                      }
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Service
                </label>
                <select
                  value={editFormData.serviceType || ""}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      serviceType: e.target.value as Appointment["serviceType"],
                    })
                  }
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  required
                >
                  {(() => {
                    const names = groomingServices.map((s) => s.name);
                    const current = editFormData.serviceType;
                    const options =
                      current && !names.includes(current)
                        ? [current, ...names]
                        : names;
                    return (
                      options.length > 0
                        ? options
                        : [current || "Basic Grooming"]
                    ).map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ));
                  })()}
                </select>
                {groomingServices.find(
                  (s) => s.name === editFormData.serviceType,
                ) && (
                  <p className="mt-1 text-xs text-gray-400">
                    {
                      groomingServices.find(
                        (s) => s.name === editFormData.serviceType,
                      )?.displayPrice
                    }
                    {" · "}
                    {
                      groomingServices.find(
                        (s) => s.name === editFormData.serviceType,
                      )?.displayDuration
                    }
                  </p>
                )}
              </div>

              {currentAppointment.dayCareOptions && (
                <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
                  Linked daycare:{" "}
                  {currentAppointment.dayCareOptions.type === "longTerm"
                    ? "Long Term"
                    : "Daily"}
                  {currentAppointment.dayCareOptions.days
                    ? ` · ${currentAppointment.dayCareOptions.days} day(s)`
                    : ""}
                  . Manage daycare on the Daycare page — not edited here.
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Status
                </label>
                {currentAppointment.status === "Cancelled" ? (
                  <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                    Cancelled
                  </div>
                ) : hasAppointmentTimePassed(
                    editFormData.date,
                    editFormData.time,
                  ) ? (
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
                    Past time — will save as Completed
                  </div>
                ) : (
                  <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 text-sm text-blue-700">
                    Upcoming
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  value={editFormData.notes}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, notes: e.target.value })
                  }
                  className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                  rows={3}
                  placeholder="Optional notes…"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setCurrentAppointment(null);
                  }}
                  className="rounded-xl px-4 py-2.5 text-sm font-medium text-stone-600 transition hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {editSaving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const ServiceManagement: React.FC = () => {
  const [groomingServices, setGroomingServices] = useState<GroomingService[]>(
    [],
  );
  const [editingService, setEditingService] = useState<GroomingService | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{
    id: string;
  } | null>(null);

  // Grooming-only: daycare has its own public page and is no longer managed here
  useEffect(() => {
    const fetchServicesData = async () => {
      try {
        const servicesResponse =
          await apiService.services.getGroomingServices();
        if (Array.isArray(servicesResponse)) {
          setGroomingServices(servicesResponse as GroomingService[]);
        }
      } catch (error) {
        console.error("Failed to fetch grooming services:", error);
      }
    };

    fetchServicesData();
  }, []);

  // duration is stored in hours (not minutes) — same as DB seed & booking page
  const formatDurationLabel = (hours: number) => {
    const h = Math.max(0, Number(hours) || 0);
    return `${h} ${h === 1 ? "hour" : "hours"}`;
  };

  const handleUpdateGroomingService = async (service: GroomingService) => {
    try {
      setLoading(true);
      const isNewService = service.id.startsWith("new-");
      const hours = Math.max(1, Number(service.duration) || 1);
      const cleanedFeatures = (service.features || [])
        .map((f) => ({ text: (f.text || "").trim() }))
        .filter((f) => f.text.length > 0);

      const serviceToUpdate: GroomingService = {
        ...service,
        duration: hours,
        features: cleanedFeatures,
        displayPrice: `RM ${Number(service.price).toFixed(2)}`,
        displayDuration: formatDurationLabel(hours),
      };

      try {
        const updatedService =
          await apiService.admin.updateGroomingService(serviceToUpdate);
        clearGroomingServicesCache();

        if (isNewService) {
          setGroomingServices((prevServices) => [
            ...prevServices,
            updatedService,
          ]);
          setSuccessMessage("New grooming service created successfully");
        } else {
          setGroomingServices((prevServices) =>
            prevServices.map((s) =>
              s.id === updatedService.id ? updatedService : s,
            ),
          );
          setSuccessMessage("Grooming service updated successfully");
        }

        setEditingService(null);
        setTimeout(() => setSuccessMessage(""), 3000);
      } catch (apiError: any) {
        console.error("API error details:", apiError);
        if (apiError.response?.status === 401) {
          setErrorMessage(
            "You are not authorized to update services. Please log in as an admin.",
          );
          return;
        }
        throw apiError;
      }
    } catch (error: any) {
      console.error("Failed to update grooming service:", error);
      const errorMsg =
        error.response?.data?.message ||
        "Failed to update grooming service. Please try again.";
      const isNewService = service.id.startsWith("new-");
      setErrorMessage(
        isNewService
          ? `Failed to create grooming service: ${errorMsg}`
          : `Failed to update grooming service: ${errorMsg}`,
      );
    } finally {
      setLoading(false);
    }
  };

  // 美容服务编辑表单
  const renderGroomingServiceForm = () => {
    if (!editingService) return null;

    const isNewService = editingService.id.startsWith("new-");

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 max-md:p-3">
        <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 max-md:max-h-[88vh] max-md:rounded-xl max-md:p-4">
          <h3 className="mb-4 text-xl font-bold max-md:mb-3 max-md:text-lg">
            {isNewService ? "Add New Service" : "Edit Grooming Service"}
          </h3>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdateGroomingService(editingService);
            }}
          >
            <div className="mb-4 max-md:mb-3">
              <label className="mb-1 block text-gray-700 max-md:text-sm">
                Name
              </label>
              <input
                type="text"
                value={editingService.name}
                onChange={(e) =>
                  setEditingService({ ...editingService, name: e.target.value })
                }
                className="w-full rounded border p-2 max-md:px-2.5 max-md:py-1.5 max-md:text-sm"
                required
              />
            </div>

            <div className="mb-4 max-md:mb-3">
              <label className="mb-1 block text-gray-700 max-md:text-sm">
                Description
              </label>
              <textarea
                value={editingService.description}
                onChange={(e) =>
                  setEditingService({
                    ...editingService,
                    description: e.target.value,
                  })
                }
                className="w-full rounded border p-2 max-md:h-16 max-md:px-2.5 max-md:py-1.5 max-md:text-sm"
                rows={3}
                required
              ></textarea>
            </div>

            <div className="max-md:mb-3 max-md:grid max-md:grid-cols-2 max-md:gap-3">
              <div className="mb-4 max-md:mb-0">
                <label className="mb-1 block text-gray-700 max-md:text-sm">
                  Price (RM)
                </label>
                <input
                  type="number"
                  value={editingService.price}
                  onChange={(e) =>
                    setEditingService({
                      ...editingService,
                      price: Number(e.target.value),
                    })
                  }
                  className="w-full rounded border p-2 max-md:px-2.5 max-md:py-1.5 max-md:text-sm"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="mb-4 max-md:mb-0">
                <label className="mb-1 block text-gray-700 max-md:text-sm">
                  Duration (hours)
                </label>
                <input
                  type="number"
                  value={editingService.duration}
                  onChange={(e) => {
                    const hours = Number(e.target.value) || 0;
                    setEditingService({ ...editingService, duration: hours });
                  }}
                  className="w-full rounded border p-2 max-md:px-2.5 max-md:py-1.5 max-md:text-sm"
                  required
                />
              </div>

              <div className="mb-4 max-md:col-span-2 max-md:mb-0">
                <label className="mb-1 block text-gray-700 max-md:text-sm">
                  Member Discount (%)
                </label>
                <input
                  type="number"
                  value={editingService.discount}
                  onChange={(e) =>
                    setEditingService({
                      ...editingService,
                      discount: Number(e.target.value),
                    })
                  }
                  className="w-full rounded border p-2 max-md:px-2.5 max-md:py-1.5 max-md:text-sm"
                  min="0"
                  max="100"
                  required
                />
              </div>
            </div>

            <div className="mb-4 max-md:mb-3">
              <label className="mb-1 block text-gray-700 max-md:text-sm">
                Features
              </label>
              {editingService.features &&
                editingService.features.map(
                  (feature: { text: string }, index: number) => (
                    <div key={index} className="mb-2 flex">
                      <input
                        type="text"
                        value={feature.text}
                        onChange={(e) => {
                          const newFeatures = [...editingService.features];
                          newFeatures[index] = { text: e.target.value };
                          setEditingService({
                            ...editingService,
                            features: newFeatures,
                          });
                        }}
                        className="w-full rounded border p-2 max-md:px-2.5 max-md:py-1.5 max-md:text-sm"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newFeatures = editingService.features.filter(
                            (_: { text: string }, i: number) => i !== index,
                          );
                          setEditingService({
                            ...editingService,
                            features: newFeatures,
                          });
                        }}
                        className="ml-2 p-2 text-red-600 hover:text-red-800 max-md:p-1.5"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ),
                )}
              <button
                type="button"
                onClick={() => {
                  const newFeatures = [
                    ...editingService.features,
                    { text: "" },
                  ];
                  setEditingService({
                    ...editingService,
                    features: newFeatures,
                  });
                }}
                className="mt-2 rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300 max-md:px-3 max-md:py-1.5"
              >
                Add Feature
              </button>
            </div>

            <div className="mb-4 max-md:mb-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="recommended"
                  checked={editingService.recommended}
                  onChange={(e) =>
                    setEditingService({
                      ...editingService,
                      recommended: e.target.checked,
                    })
                  }
                  className="mr-2"
                />
                <label
                  htmlFor="recommended"
                  className="text-gray-700 max-md:text-sm"
                >
                  Recommended
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 max-md:mt-4">
              <button
                type="button"
                onClick={() => setEditingService(null)}
                className="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300 max-md:px-3 max-md:py-1.5 max-md:text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 max-md:px-3 max-md:py-1.5 max-md:text-sm"
              >
                {isNewService ? "Create Service" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // 处理美容服务删除
  const handleDeleteGroomingService = async (serviceId: string) => {
    try {
      setLoading(true);
      await apiService.admin.deleteGroomingService(serviceId);
      clearGroomingServicesCache();
      setGroomingServices((prevServices) =>
        prevServices.filter((service) => service.id !== serviceId),
      );
      setSuccessMessage("Grooming service deleted successfully");
      setShowDeleteConfirm(null);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Failed to delete grooming service:", error);
      setErrorMessage("Failed to delete grooming service. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 py-4 sm:space-y-6 sm:py-6">
      <ConfirmDialog
        open={Boolean(showDeleteConfirm)}
        title="Delete this service?"
        message={
          showDeleteConfirm
            ? `Delete ${
                groomingServices.find((s) => s.id === showDeleteConfirm.id)
                  ?.name || "this service"
              }? This cannot be undone.`
            : "This cannot be undone."
        }
        confirmLabel="Delete"
        onConfirm={() => {
          if (showDeleteConfirm)
            handleDeleteGroomingService(showDeleteConfirm.id);
        }}
        onCancel={() => setShowDeleteConfirm(null)}
      />

      {successMessage && (
        <div className="rounded bg-green-100 p-3 text-green-700">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="rounded bg-red-100 p-3 text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-gray-900">Grooming Services</h2>
          <p className="text-sm text-gray-500">
            Add, edit price, duration, and member discount.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 sm:px-4"
          aria-label="Add New Service"
          onClick={() =>
            setEditingService({
              id: `new-${Date.now()}`,
              name: "",
              description: "",
              price: 0,
              duration: 1,
              discount: 0,
              features: [{ text: "" }],
            })
          }
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Add New Service</span>
        </button>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto mb-12 bg-white rounded-lg shadow">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="text-left p-4">NAME</th>
              <th className="text-left p-4">PRICE</th>
              <th className="text-left p-4">DURATION</th>
              <th className="text-left p-4">DISCOUNT</th>
              <th className="text-left p-4">RECOMMENDED</th>
              <th className="text-left p-4">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {groomingServices.map((service) => (
              <tr key={service.id} className="border-b">
                <td className="p-4">
                  <div className="font-medium">{service.name}</div>
                  <div className="text-sm text-gray-500">
                    {service.description}
                  </div>
                </td>
                <td className="p-4">
                  {service.displayPrice || `RM ${service.price.toFixed(2)}`}
                </td>
                <td className="p-4">
                  {service.displayDuration ||
                    formatDurationLabel(service.duration)}
                </td>
                <td className="p-4">{service.discount}%</td>
                <td className="p-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${service.recommended ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
                  >
                    {service.recommended ? "Yes" : "No"}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center space-x-2">
                    <button
                      className="text-blue-600 hover:text-blue-800"
                      onClick={() => setEditingService(service)}
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      className="text-red-600 hover:text-red-800"
                      onClick={() => setShowDeleteConfirm({ id: service.id })}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {groomingServices.map((service) => (
          <div
            key={service.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200"
          >
            <div className="p-4">
              {/* Service Header */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {service.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {service.description}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    className="text-blue-600 hover:text-blue-800"
                    onClick={() => setEditingService(service)}
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    className="text-red-600 hover:text-red-800"
                    onClick={() => setShowDeleteConfirm({ id: service.id })}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              {/* Service Details */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-xs text-gray-500">Price</p>
                  <p className="text-sm font-medium">
                    {service.displayPrice || `RM ${service.price.toFixed(2)}`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Duration</p>
                  <p className="text-sm font-medium">
                    {service.displayDuration ||
                      formatDurationLabel(service.duration)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Discount</p>
                  <p className="text-sm font-medium">{service.discount}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Recommended</p>
                  <span
                    className={`inline-flex px-2 py-1 mt-1 rounded-full text-xs font-medium ${
                      service.recommended
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {service.recommended ? "Yes" : "No"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editingService && renderGroomingServiceForm()}
    </div>
  );
};

export default AdminPortal;
