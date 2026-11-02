import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Bath,
  Calendar,
  Cat,
  Clock,
  Dog,
  Scissors,
  Sparkles,
  User,
} from "lucide-react";
import { apiService } from "../services/apiService";
import { getDashboardPath, useAuth } from "../contexts/AuthContext";
import { Appointment, GroomingService, TimeSlot } from "../types";
import {
  getGroomingServicesCache,
  prefetchGroomingServices,
} from "../utils/pageDataCache";

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const SERVICE_ORDER = ["Basic Grooming", "Full Grooming", "Spa Treatment"];
const WORKDAY_END_HOUR = 22;
const HERO_IMG = "/imgs/grooming-hero.png";
const LOGO_IMG = "/imgs/AH%20HAO%20PET%20SHOP%20LOGO.png";

/** Same EmailJS account / IDs as the homepage contact form. */
const ADMIN_EMAIL = "ahhaopetshop@gmail.com";
const EMAILJS_PUBLIC_KEY = "XZAZGsFEqh4uujbjP";
const EMAILJS_SERVICE = "service_1lvspsq";
const EMAILJS_CUSTOMER_TEMPLATE = "template_yxcxsx3"; // customer confirmation
const EMAILJS_ADMIN_TEMPLATE = "template_zm1ko18"; // shop notification

function emailjsErrorText(err: unknown): string {
  if (!err || typeof err !== "object") return String(err ?? "Unknown error");
  const e = err as { text?: string; message?: string; status?: number };
  const parts = [
    e.status ? `HTTP ${e.status}` : "",
    e.text || e.message || "",
  ].filter(Boolean);
  return parts.join(" — ") || "Unknown EmailJS error";
}

type PetType = "dog" | "cat" | "";

interface BookingForm {
  serviceId: string;
  petType: PetType;
  petName: string;
  date: string;
  time: string;
  notes: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
}

interface FieldErrors {
  serviceId?: string;
  petType?: string;
  petName?: string;
  date?: string;
  time?: string;
  ownerName?: string;
  ownerPhone?: string;
  ownerEmail?: string;
}

const emptyForm = (): BookingForm => ({
  serviceId: "",
  petType: "",
  petName: "",
  date: "",
  time: "",
  notes: "",
  ownerName: "",
  ownerPhone: "",
  ownerEmail: "",
});

const inputClass =
  "mt-1.5 block w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-100 disabled:bg-gray-50 disabled:text-gray-500";

function localDateString(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatTo12Hour(time: string): string {
  const [hStr, mStr = "00"] = time.split(":");
  const hour = Number(hStr);
  if (hour === 0) return `12:${mStr} AM`;
  if (hour < 12) return `${hour}:${mStr} AM`;
  if (hour === 12) return `12:${mStr} PM`;
  return `${hour - 12}:${mStr} PM`;
}

function formatLongDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function serviceIcon(name: string, className = "h-6 w-6 text-rose-600") {
  if (name === "Basic Grooming") return <Scissors className={className} />;
  if (name === "Full Grooming") return <Sparkles className={className} />;
  return <Bath className={className} />;
}

function sortServices(list: GroomingService[]) {
  return [...list].sort((a, b) => {
    const ai = SERVICE_ORDER.indexOf(a.name);
    const bi = SERVICE_ORDER.indexOf(b.name);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

function calcPrice(service: GroomingService | undefined, isMember: boolean) {
  if (!service) return { base: 0, discountPct: 0, discountAmount: 0, total: 0 };
  const base = service.price;
  const discountPct = isMember ? service.discount || 0 : 0;
  const discountAmount = (base * discountPct) / 100;
  const total = Math.round((base - discountAmount) * 100) / 100;
  return { base, discountPct, discountAmount, total };
}

function currentTimeHm(): string {
  return `${String(new Date().getHours()).padStart(2, "0")}:${String(
    new Date().getMinutes(),
  ).padStart(2, "0")}`;
}

function isPastSlot(date: string, time: string): boolean {
  return date === localDateString() && time <= currentTimeHm();
}

function applyPastSlotFilter(slots: TimeSlot[], date: string): TimeSlot[] {
  if (date !== localDateString()) return slots;
  const nowHm = currentTimeHm();
  return slots.map((s) => (s.time <= nowHm ? { ...s, available: false } : s));
}

function canFitDuration(
  slots: TimeSlot[],
  startIndex: number,
  durationHours: number,
): { ok: boolean; reason?: string } {
  if (durationHours < 1)
    return { ok: false, reason: "Invalid service duration." };
  const startHour = parseInt(
    slots[startIndex]?.time?.split(":")[0] ?? "99",
    10,
  );
  if (startHour + durationHours > WORKDAY_END_HOUR) {
    return {
      ok: false,
      reason: `This service needs ${durationHours} hour(s). Please pick an earlier slot to finish by 10 PM.`,
    };
  }
  for (let i = 0; i < durationHours; i++) {
    const slot = slots[startIndex + i];
    if (!slot?.available) {
      return {
        ok: false,
        reason: `This service needs ${durationHours} consecutive open hour(s). Some required slots are unavailable.`,
      };
    }
  }
  return { ok: true };
}

const GroomingAppointment: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  /** Members get discount + locked profile fields. Admins book like guests (no discount / no lock). */
  const isMember = !!user && user.role !== "admin";

  const cachedServices = getGroomingServicesCache();
  const [form, setForm] = useState<BookingForm>(emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [services, setServices] = useState<GroomingService[]>(
    cachedServices ? sortServices(cachedServices) : [],
  );
  const [loadingServices, setLoadingServices] = useState(
    !cachedServices?.length,
  );
  const [servicesError, setServicesError] = useState("");
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);
  const [emailNotice, setEmailNotice] = useState("");
  const [visible, setVisible] = useState(true);

  const selectedService = useMemo(
    () => services.find((s) => s.id === form.serviceId),
    [services, form.serviceId],
  );
  const pricing = useMemo(
    () => calcPrice(selectedService, isMember),
    [selectedService, isMember],
  );
  const durationHours = selectedService?.duration ?? 0;
  const today = localDateString();

  const patchForm = useCallback((partial: Partial<BookingForm>) => {
    setForm((prev) => ({ ...prev, ...partial }));
  }, []);

  useEffect(() => {
    if (!isMember || !user) return;
    setForm((prev) => ({
      ...prev,
      ownerName: user.name || "",
      ownerPhone: user.phone || "",
      ownerEmail: user.email || "",
    }));
  }, [isMember, user]);

  useEffect(() => {
    let cancelled = false;
    const hadCache = !!getGroomingServicesCache()?.length;
    (async () => {
      if (!hadCache) setLoadingServices(true);
      setServicesError("");
      try {
        const data = await prefetchGroomingServices({ force: hadCache });
        if (cancelled) return;
        if (!Array.isArray(data) || data.length === 0) {
          if (!hadCache) {
            setServicesError("No grooming services available right now.");
            setServices([]);
          }
        } else {
          setServices(sortServices(data));
        }
      } catch {
        if (!cancelled && !hadCache) {
          setServicesError("Failed to load services. Please try again later.");
          setServices([]);
        }
      } finally {
        if (!cancelled) setLoadingServices(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!form.date || !form.serviceId) {
      setTimeSlots([]);
      setSlotsError("");
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoadingSlots(true);
      setSlotsError("");
      try {
        const slots = await apiService.appointments.getTimeSlots(form.date);
        if (cancelled) return;
        setTimeSlots(
          applyPastSlotFilter(Array.isArray(slots) ? slots : [], form.date),
        );
      } catch {
        if (!cancelled) {
          setSlotsError("Failed to load time slots. Please try again.");
          setTimeSlots([]);
        }
      } finally {
        if (!cancelled) setLoadingSlots(false);
      }
    };

    load();
    const id = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [form.date, form.serviceId]);

  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (!form.serviceId) next.serviceId = "Please select a service";
    if (!form.petType) next.petType = "Please select a pet type";
    if (!form.petName.trim()) next.petName = "Please enter your pet's name";
    if (!form.date) next.date = "Please select a date";
    else if (form.date < today)
      next.date = "Please select today or a future date";
    if (!form.time) next.time = "Please select a time";

    if (!isMember) {
      if (!form.ownerName.trim()) next.ownerName = "Please enter your name";
      if (!form.ownerPhone.trim())
        next.ownerPhone = "Please enter your phone number";
      if (!form.ownerEmail.trim()) next.ownerEmail = "Please enter your email";
      else if (!EMAIL_RE.test(form.ownerEmail.trim())) {
        next.ownerEmail = "Please enter a valid email";
      }
    }

    if (form.time && durationHours > 0) {
      const idx = timeSlots.findIndex((s) => s.time === form.time);
      const fit = canFitDuration(timeSlots, idx, durationHours);
      if (!fit.ok) next.time = fit.reason;
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const canSubmit =
    !!form.serviceId &&
    !!form.petType &&
    !!form.petName.trim() &&
    !!form.date &&
    !!form.time &&
    (isMember ||
      (!!form.ownerName.trim() &&
        !!form.ownerPhone.trim() &&
        !!form.ownerEmail.trim())) &&
    !submitting;

  const goLogin = (register = false) => {
    sessionStorage.setItem("returnToBooking", "true");
    if (register) sessionStorage.setItem("fromGroomingRegister", "true");
    navigate(
      "/login",
      register ? { state: { showRegister: true } } : undefined,
    );
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSubmitError("");
    if (!validate() || !selectedService) return;

    setSubmitting(true);
    try {
      const { base, discountPct, total } = calcPrice(selectedService, isMember);

      const appointmentData: Omit<Appointment, "_id"> = {
        user: user?._id,
        petName: form.petName.trim(),
        petType: form.petType as "dog" | "cat",
        date: form.date,
        time: form.time,
        serviceType: selectedService.name,
        serviceId: selectedService.id,
        duration: selectedService.duration,
        dayCareOptions: undefined,
        totalPrice: total,
        basePrice: base,
        discount: isMember ? discountPct : 0,
        dayCarePrice: 0,
        ownerName: form.ownerName.trim(),
        ownerPhone: form.ownerPhone.trim(),
        ownerEmail: form.ownerEmail.trim(),
        notes: form.notes.trim() || undefined,
        status: "Booked",
      };

      const created = await apiService.appointments.add(appointmentData);
      if (!created?._id) throw new Error("Booking failed. Please try again.");

      // Emails are best-effort — booking is already saved
      const customerName = form.ownerName.trim();
      const customerEmail = form.ownerEmail.trim();
      const customerPhone = form.ownerPhone.trim();
      const when = `${formatLongDate(form.date)} at ${formatTo12Hour(form.time)}`;
      const petLine = `${form.petName.trim()} (${form.petType === "dog" ? "Dog" : "Cat"})`;
      const priceLine = `RM ${total.toFixed(2)}${
        isMember && discountPct > 0 ? ` (${discountPct}% member discount)` : ""
      }`;
      const notesLine = form.notes.trim();
      const customerMessage = [
        selectedService.name,
        "",
        `Date: ${when}`,
        `Pet Name: ${petLine}`,
        `Price: ${priceLine}`,
        ...(notesLine ? ["", `Notes: ${notesLine}`] : []),
      ].join("\n");
      const bookingSummary = [
        selectedService.name,
        `Date: ${when}`,
        `Pet Name: ${petLine}`,
        `Price: ${priceLine}`,
        `Member: ${isMember ? "Yes" : "No"}`,
        `Phone: ${customerPhone}`,
        ...(notesLine ? [`Notes: ${notesLine}`] : []),
      ].join("\n");

      const emailFailNotes: string[] = [];

      // Lazy-load EmailJS only on submit so opening the page stays fast
      try {
        const emailjs = (await import("@emailjs/browser")).default;
        emailjs.init(EMAILJS_PUBLIC_KEY);

        try {
          const adminRes = await emailjs.send(
            EMAILJS_SERVICE,
            EMAILJS_ADMIN_TEMPLATE,
            {
              name: customerName,
              email: customerEmail,
              phone: customerPhone,
              message: `New grooming appointment\n\n${bookingSummary}`,
              submit_date: new Date().toLocaleString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }),
              to_email: ADMIN_EMAIL,
              reply_to: customerEmail,
            },
            EMAILJS_PUBLIC_KEY,
          );
          console.log("Admin booking email OK:", adminRes);
        } catch (err) {
          const detail = emailjsErrorText(err);
          console.error("Admin booking email failed:", err);
          emailFailNotes.push(`Shop: ${detail}`);
        }

        try {
          const customerRes = await emailjs.send(
            EMAILJS_SERVICE,
            EMAILJS_CUSTOMER_TEMPLATE,
            {
              name: customerName,
              email: customerEmail,
              phone: customerPhone,
              message: customerMessage,
              to_email: customerEmail,
              reply_to: ADMIN_EMAIL,
            },
            EMAILJS_PUBLIC_KEY,
          );
          console.log("Customer confirmation email OK:", customerRes);
        } catch (err) {
          const detail = emailjsErrorText(err);
          console.error("Customer confirmation email failed:", err);
          emailFailNotes.push(`Customer: ${detail}`);
        }
      } catch (err) {
        console.error("EmailJS failed to load:", err);
        emailFailNotes.push("Email library failed to load");
      }

      if (emailFailNotes.length > 0) {
        setEmailNotice(
          `Booking saved, but email failed. ${emailFailNotes.join(" | ")}`,
        );
      } else {
        setEmailNotice("");
      }

      if (user) {
        try {
          await apiService.notifications.add({
            title: `🐾 New ${selectedService.name} Appointment`,
            message: `Your ${selectedService.name} appointment for ${form.petName} (${
              form.petType === "dog" ? "Dog" : "Cat"
            }) on ${formatLongDate(form.date)} at ${formatTo12Hour(form.time)} has been booked.`,
            type: "appointment",
          });
          window.dispatchEvent(new CustomEvent("appointmentCreated"));
          sessionStorage.setItem("refreshDashboard", "true");
        } catch {
          /* non-blocking */
        }
      }

      setForm({
        ...emptyForm(),
        ...(isMember && user
          ? {
              ownerName: user.name || "",
              ownerPhone: user.phone || "",
              ownerEmail: user.email || "",
            }
          : {}),
      });
      setErrors({});
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: unknown) {
      setEmailNotice("");
      let message = "Failed to submit appointment. Please try again.";
      if (err && typeof err === "object") {
        const e = err as {
          message?: string;
          error_description?: string;
          details?: string;
        };
        message = e.message || e.error_description || e.details || message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      console.error("Appointment submit failed:", err);
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectService = (id: string) => {
    const nextId = form.serviceId === id ? "" : id;
    patchForm({ serviceId: nextId, time: "" });
    setErrors((e) => ({ ...e, serviceId: undefined, time: undefined }));
    setSubmitError("");
  };

  const selectTime = (slot: TimeSlot, slotIndex: number) => {
    if (!slot.available) return;

    if (form.time === slot.time) {
      patchForm({ time: "" });
      setSubmitError("");
      setErrors((e) => ({ ...e, time: undefined }));
      return;
    }

    const fit = canFitDuration(timeSlots, slotIndex, durationHours);
    if (!fit.ok) {
      setSubmitError(fit.reason || "That time is not available.");
      return;
    }

    setSubmitError("");
    patchForm({ time: slot.time });
    setErrors((e) => ({ ...e, time: undefined }));
  };

  const isSlotInSelection = (slotIndex: number) => {
    if (!form.time || durationHours < 1) return false;
    const start = timeSlots.findIndex((s) => s.time === form.time);
    if (start < 0) return false;
    return slotIndex >= start && slotIndex < start + durationHours;
  };

  return (
    <div className="min-h-[100dvh] bg-white text-gray-800">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="shrink-0 rounded-lg p-2 text-gray-500 transition hover:bg-rose-50 hover:text-gray-800"
              aria-label="Back to Home"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="truncate text-base font-bold tracking-tight text-gray-900 sm:text-xl">
              Grooming Appointment
            </h1>
          </div>
          <button
            type="button"
            onClick={() =>
              user ? navigate(getDashboardPath(user)) : goLogin(false)
            }
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-rose-50 hover:text-rose-700"
            aria-label={user ? "Go to Dashboard" : "Login"}
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">
              {user ? "Account" : "Login"}
            </span>
          </button>
        </div>
      </header>

      <main
        className={`mx-auto max-w-6xl px-4 pb-28 pt-3 sm:px-6 sm:pt-4 ${selectedService ? "pb-32" : ""}`}
      >
        {success ? (
          <div
            className={`overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-rose-100 transition duration-500 ${
              visible ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="px-6 pb-10 pt-10 text-center sm:px-10">
              <img
                src={LOGO_IMG}
                alt="AH HAO PET SHOP"
                className="mx-auto h-28 w-auto object-contain sm:h-32"
              />
              <h2 className="mt-5 text-2xl font-bold text-gray-900">
                You&apos;re booked
              </h2>
              <p className="mx-auto mt-2 max-w-md text-gray-600">
                We received your appointment and will contact you soon to
                confirm the details.
              </p>
              {emailNotice && (
                <p className="mx-auto mt-3 max-w-lg break-words rounded-lg bg-amber-50 px-3 py-2 text-left text-xs text-amber-900 ring-1 ring-amber-200 sm:text-sm">
                  {emailNotice}
                </p>
              )}
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setSuccess(false);
                    setEmailNotice("");
                  }}
                  className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
                >
                  Book again
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
                >
                  Back to home
                </button>
                {user && (
                  <button
                    type="button"
                    onClick={() => navigate(getDashboardPath(user))}
                    className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
                  >
                    {user.role === "admin"
                      ? "Admin dashboard"
                      : "My appointments"}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : loadingServices ? (
          <div className="flex justify-center py-24">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-rose-200 border-t-rose-600" />
          </div>
        ) : servicesError ? (
          <div className="rounded-2xl bg-white px-6 py-14 text-center shadow-sm ring-1 ring-red-100">
            <AlertTriangle className="mx-auto h-10 w-10 text-red-500" />
            <h3 className="mt-3 text-lg font-semibold text-gray-900">
              Couldn&apos;t load services
            </h3>
            <p className="mt-1 text-red-600">{servicesError}</p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className={`space-y-8 transition duration-200 ${
              visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            {submitError && (
              <div
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                role="alert"
              >
                {submitError}
              </div>
            )}

            {/* 1 — Service */}
            <section className="relative">
              <div className="mb-4 flex items-end justify-between gap-4 md:mb-4 md:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-lg font-bold tracking-tight text-gray-900 md:text-xl">
                      Choose a service
                    </h3>
                    {/* Mobile: CTA sits with the title so hours stay clean */}
                    {!user ? (
                      <button
                        type="button"
                        onClick={() => goLogin(true)}
                        className="shrink-0 text-xs font-semibold text-rose-600 md:hidden"
                      >
                        Register for discount
                      </button>
                    ) : isMember ? (
                      <span className="shrink-0 text-xs font-medium text-emerald-700 md:hidden">
                        Member rate
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-gray-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      <span>Mon–Fri · 10AM–10PM</span>
                    </span>
                    {!user ? (
                      <>
                        <span className="hidden md:inline" aria-hidden>
                          ·
                        </span>
                        <button
                          type="button"
                          onClick={() => goLogin(true)}
                          className="hidden font-medium text-rose-600 hover:underline md:inline"
                        >
                          Register for member price
                        </button>
                      </>
                    ) : isMember ? (
                      <>
                        <span className="hidden md:inline" aria-hidden>
                          ·
                        </span>
                        <span className="hidden font-medium text-emerald-700 md:inline">
                          Member price applied
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
                <img
                  src={HERO_IMG}
                  alt="Dog and cat ready for grooming"
                  className="hidden h-24 w-auto shrink-0 object-contain md:block"
                />
              </div>
              {errors.serviceId && (
                <p className="mb-2 text-sm text-red-600">{errors.serviceId}</p>
              )}

              <div className="relative grid gap-3 sm:grid-cols-3 sm:gap-4">
                {services.map((service) => {
                  const selected = form.serviceId === service.id;
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => selectService(service.id)}
                      className={`group relative flex flex-col rounded-2xl p-4 text-left transition duration-300 sm:p-5 ${
                        selected
                          ? "bg-rose-50 text-gray-900 shadow-md ring-2 ring-rose-400"
                          : "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200/80 hover:-translate-y-0.5 hover:shadow-md hover:ring-rose-200"
                      }`}
                    >
                      {service.recommended && (
                        <span className="absolute right-3 top-3 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-700">
                          Popular
                        </span>
                      )}
                      <div className="mb-2.5">
                        {serviceIcon(service.name, "h-5 w-5 text-rose-600")}
                      </div>
                      <h4 className="pr-12 text-base font-bold sm:text-lg">
                        {service.name}
                      </h4>
                      <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                        {service.description}
                      </p>
                      <div className="mt-4">
                        <p
                          className={`text-xl font-bold tracking-tight ${
                            selected ? "text-rose-700" : "text-gray-900"
                          }`}
                        >
                          {service.displayPrice || `RM ${service.price}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {service.displayDuration ||
                            `${service.duration} hour(s)`}
                          {isMember && service.discount > 0
                            ? ` · ${service.discount}% off`
                            : ""}
                        </p>
                      </div>
                      {service.features && service.features.length > 0 && (
                        <ul className="mt-3 space-y-1 border-t border-gray-100 pt-3 text-xs text-gray-600">
                          {service.features.map((f, i) => (
                            <li key={i} className="flex min-w-0 gap-1.5">
                              <span className="shrink-0 text-rose-400">·</span>
                              <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                                {f.text}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 2 — Pet + contact */}
            {/* Pet + contact — one flow, no awkward tall/short columns */}
            <section className="space-y-6">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-gray-900">
                  Your pet
                </h3>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
                  <div>
                    <p className="mb-1.5 text-sm font-medium text-gray-700">
                      Type <span className="text-rose-500">*</span>
                    </p>
                    <div className="flex gap-2">
                      {(["dog", "cat"] as const).map((type) => {
                        const Icon = type === "dog" ? Dog : Cat;
                        const on = form.petType === type;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => {
                              patchForm({ petType: on ? "" : type });
                              setErrors((e) => ({ ...e, petType: undefined }));
                            }}
                            className={`inline-flex min-w-[6.5rem] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold capitalize transition ${
                              on
                                ? "bg-rose-50 text-rose-700 ring-2 ring-rose-400"
                                : "bg-white text-gray-700 ring-1 ring-gray-200 hover:ring-rose-200"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            {type}
                          </button>
                        );
                      })}
                    </div>
                    {errors.petType && (
                      <p className="mt-2 text-sm text-red-600">
                        {errors.petType}
                      </p>
                    )}
                  </div>
                  <div className="w-full max-w-[14rem]">
                    <label
                      htmlFor="petName"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Pet name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="petName"
                      type="text"
                      value={form.petName}
                      onChange={(e) => {
                        patchForm({ petName: e.target.value });
                        if (e.target.value.trim()) {
                          setErrors((er) => ({ ...er, petName: undefined }));
                        }
                      }}
                      className={`${inputClass} ${errors.petName ? "border-red-300" : ""}`}
                      placeholder="e.g. Mochi"
                    />
                    {errors.petName && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.petName}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold tracking-tight text-gray-900">
                  Your details
                </h3>
                {!isMember && user?.role === "admin" && (
                  <p className="mt-1 text-sm text-gray-500">
                    Booking as admin — enter the customer&apos;s details below.
                  </p>
                )}
                <div className="mt-4 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label
                      htmlFor="ownerName"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Name{" "}
                      {!isMember && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      id="ownerName"
                      type="text"
                      value={form.ownerName}
                      disabled={isMember}
                      onChange={(e) => {
                        patchForm({ ownerName: e.target.value });
                        if (errors.ownerName) {
                          setErrors((er) => ({ ...er, ownerName: undefined }));
                        }
                      }}
                      className={`${inputClass} ${errors.ownerName ? "border-red-300" : ""}`}
                      placeholder="Your name"
                    />
                    {errors.ownerName && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.ownerName}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="ownerPhone"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Phone{" "}
                      {!isMember && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      id="ownerPhone"
                      type="tel"
                      value={form.ownerPhone}
                      disabled={isMember}
                      onChange={(e) => {
                        patchForm({ ownerPhone: e.target.value });
                        if (errors.ownerPhone) {
                          setErrors((er) => ({ ...er, ownerPhone: undefined }));
                        }
                      }}
                      className={`${inputClass} ${errors.ownerPhone ? "border-red-300" : ""}`}
                      placeholder="0123456789"
                    />
                    {errors.ownerPhone && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.ownerPhone}
                      </p>
                    )}
                  </div>
                  <div className="sm:col-span-2 lg:col-span-1">
                    <label
                      htmlFor="ownerEmail"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Email{" "}
                      {!isMember && <span className="text-rose-500">*</span>}
                    </label>
                    <input
                      id="ownerEmail"
                      type="email"
                      value={form.ownerEmail}
                      disabled={isMember}
                      onChange={(e) => {
                        patchForm({ ownerEmail: e.target.value });
                        if (errors.ownerEmail) {
                          setErrors((er) => ({ ...er, ownerEmail: undefined }));
                        }
                      }}
                      className={`${inputClass} ${errors.ownerEmail ? "border-red-300" : ""}`}
                      placeholder="you@email.com"
                    />
                    {errors.ownerEmail && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.ownerEmail}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Schedule — full width */}
            <section>
              <h3 className="text-xl font-bold tracking-tight text-gray-900">
                Pick a time
              </h3>

              <div className="mt-4 grid gap-5 lg:grid-cols-[14rem_1fr] lg:items-start lg:gap-8">
                <div>
                  <label
                    htmlFor="date"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Date <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="date"
                      type="date"
                      min={today}
                      value={form.date}
                      onChange={(e) => {
                        const value = e.target.value;
                        patchForm({ date: value, time: "" });
                        setSubmitError("");
                        setErrors((er) => ({
                          ...er,
                          date:
                            value && value < today
                              ? "Please select today or a future date"
                              : undefined,
                          time: undefined,
                        }));
                      }}
                      onClick={(e) =>
                        (e.target as HTMLInputElement).showPicker?.()
                      }
                      className={inputClass}
                    />
                    <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                  {errors.date && (
                    <p className="mt-1 text-sm text-red-600">{errors.date}</p>
                  )}
                </div>

                {form.date && form.serviceId ? (
                  <div>
                    <p className="mb-2 text-sm font-medium text-gray-700">
                      Available times <span className="text-rose-500">*</span>
                    </p>
                    {loadingSlots ? (
                      <div className="flex justify-center py-6">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-200 border-t-rose-600" />
                      </div>
                    ) : slotsError ? (
                      <p className="text-sm text-red-600">{slotsError}</p>
                    ) : timeSlots.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        No slots this day — try another date.
                      </p>
                    ) : (
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                        {timeSlots.map((slot, slotIndex) => {
                          const past = isPastSlot(form.date, slot.time);
                          const full = !slot.available && !past;
                          const disabled = !slot.available;
                          const inRange = isSlotInSelection(slotIndex);
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              disabled={disabled}
                              onClick={() => selectTime(slot, slotIndex)}
                              className={`flex min-h-[3.25rem] touch-manipulation select-none flex-col items-center justify-center rounded-xl px-2 py-2 text-xs font-semibold transition-none sm:text-sm md:transition ${
                                inRange
                                  ? "bg-rose-50 text-rose-700 ring-2 ring-rose-400"
                                  : disabled
                                    ? "cursor-not-allowed bg-gray-100 text-gray-400"
                                    : "bg-white text-gray-700 ring-1 ring-gray-200 active:bg-rose-50 active:ring-rose-300 md:hover:ring-rose-300"
                              }`}
                            >
                              {formatTo12Hour(slot.time)}
                              {past && (
                                <span className="mt-0.5 text-[10px] font-medium text-gray-400">
                                  Past
                                </span>
                              )}
                              {full && (
                                <span className="mt-0.5 text-[10px] font-medium text-red-400">
                                  Full
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {errors.time && (
                      <p className="mt-2 text-sm text-red-600">{errors.time}</p>
                    )}
                  </div>
                ) : (
                  <p className="hidden text-sm text-gray-400 lg:block lg:pt-8">
                    {form.serviceId
                      ? "Pick a date to see open times."
                      : "Choose a service and date to see times."}
                  </p>
                )}
              </div>

              <div className="mt-5">
                <label
                  htmlFor="notes"
                  className="block text-sm font-medium text-gray-700"
                >
                  Notes{" "}
                  <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  id="notes"
                  rows={4}
                  value={form.notes}
                  onChange={(e) => patchForm({ notes: e.target.value })}
                  className={`${inputClass} min-h-[6rem] resize-y sm:min-h-[9rem]`}
                  placeholder="Allergies, coat preferences, anything we should know…"
                />
              </div>
            </section>
          </form>
        )}
      </main>

      {/* Sticky booking bar */}
      {!success && !loadingServices && !servicesError && selectedService && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-rose-100 bg-white/95 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] backdrop-blur-md pb-safe">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">
                {selectedService.name}
              </p>
              <p className="text-xs text-gray-500">
                {pricing.discountAmount > 0 ? (
                  <>
                    <span className="text-rose-600">
                      RM {pricing.total.toFixed(2)}
                    </span>
                    <span className="ml-1.5 text-gray-400 line-through">
                      RM {pricing.base.toFixed(2)}
                    </span>
                    <span className="ml-1.5 text-emerald-600">
                      −{pricing.discountPct}%
                    </span>
                  </>
                ) : (
                  <span className="font-semibold text-rose-600">
                    RM {pricing.total.toFixed(2)}
                  </span>
                )}
              </p>
            </div>
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => handleSubmit()}
              className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition ${
                canSubmit
                  ? "bg-rose-600 shadow-md shadow-rose-200 hover:-translate-y-0.5 hover:bg-rose-700"
                  : "cursor-not-allowed bg-gray-300"
              }`}
            >
              {submitting ? "Booking…" : "Confirm"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroomingAppointment;
