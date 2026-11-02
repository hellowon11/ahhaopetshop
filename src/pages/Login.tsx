import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ChevronLeft,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigation } from "../contexts/NavigationContext";
import { apiService } from "../services/apiService";
import {
  clearDashboardCache,
  prefetchDashboard,
} from "../utils/dashboardCache";

interface LocationState {
  from: string;
  showRegister?: boolean;
  message?: string;
}

const inputClass =
  "block w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-[15px] text-stone-900 placeholder:text-stone-400 outline-none transition focus:border-rose-500 focus:ring-1 focus:ring-rose-500";

const friendlyAuthError = (
  raw: string,
  mode: "login" | "register" | "reset",
) => {
  const msg = (raw || "").toLowerCase();
  if (
    msg.includes("invalid login") ||
    msg.includes("invalid credentials") ||
    msg.includes("wrong password")
  ) {
    return "Incorrect email or password. Please try again.";
  }
  if (msg.includes("email not confirmed")) {
    return "Please confirm your email before signing in.";
  }
  if (msg.includes("already") || msg.includes("registered")) {
    return "This email is already registered. Please sign in instead.";
  }
  if (msg.includes("rate limit") || msg.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (msg.includes("network") || msg.includes("fetch")) {
    return "Network error. Please check your connection and try again.";
  }
  if (
    msg.includes("confirmation email") ||
    msg.includes("error sending") ||
    msg.includes("not authorized") ||
    msg.includes("smtp")
  ) {
    return "Couldn’t send the confirmation email. Use a Supabase team-member email, or check Auth → Email settings.";
  }
  if (mode === "reset") {
    return "Couldn’t send the reset email. Please try again.";
  }
  if (mode === "register") {
    return "Couldn’t create your account. Please try again.";
  }
  return "Couldn’t sign you in. Please try again.";
};

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user } = useAuth();
  const { from, showRegister = false } = (location.state as LocationState) || {
    from: "/",
  };
  const { setReturningFromDashboard } = useNavigation();

  const [isRegistering, setIsRegistering] = useState(showRegister);
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [email, setEmail] = useState(
    () => sessionStorage.getItem("loginEmail") || "",
  );
  const [password, setPassword] = useState(
    () => sessionStorage.getItem("loginPassword") || "",
  );
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState(
    () => sessionStorage.getItem("loginError") || "",
  );
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showEmailHint, setShowEmailHint] = useState(false);
  const [showPhoneHint, setShowPhoneHint] = useState(false);

  useEffect(() => {
    if (email) sessionStorage.setItem("loginEmail", email);
    if (password) sessionStorage.setItem("loginPassword", password);
  }, [email, password]);

  useEffect(() => {
    if (error) sessionStorage.setItem("loginError", error);
  }, [error]);

  useEffect(() => {
    if (awaitingVerification) return;
    if (isRegistering) {
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setName("");
      setPhone("");
      setError("");
      sessionStorage.removeItem("loginEmail");
      sessionStorage.removeItem("loginPassword");
      sessionStorage.removeItem("loginError");
    }
    setShowEmailHint(false);
    setShowPhoneHint(false);
    setIsAdminLogin(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, [isRegistering, awaitingVerification]);

  const formatPhoneInput = (raw: string) => raw.replace(/[^\d]/g, "");

  const phoneNeeds01Hint = (digits: string) =>
    digits.length >= 2 && !digits.startsWith("01");

  const isValidEmail = (value: string) =>
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);

  const seedWelcomeAndGo = async (
    member: { _id?: string; name?: string } | null,
    displayName?: string,
  ) => {
    const welcomeName = (
      displayName ||
      member?.name ||
      sessionStorage.getItem("pendingWelcomeName") ||
      "there"
    ).trim();
    sessionStorage.removeItem("pendingWelcomeName");
    if (member?._id) {
      try {
        await apiService.notifications.ensureWelcome(welcomeName);
      } catch (welcomeErr) {
        console.error("Failed to create welcome notification:", welcomeErr);
      }
      clearDashboardCache();
      void prefetchDashboard(member._id);
    }
    setShowSuccessModal(true);
    setTimeout(() => {
      const returnToBooking = sessionStorage.getItem("returnToBooking");
      if (returnToBooking === "true") {
        sessionStorage.removeItem("returnToBooking");
        navigate("/grooming-appointment", { replace: true });
      } else {
        navigate("/member-dashboard", { replace: true });
      }
    }, 1500);
  };

  // Magic-link confirm: Supabase redirects back to /login with a session
  useEffect(() => {
    if (!user?._id) return;
    if (sessionStorage.getItem("pendingWelcomeName")) {
      void seedWelcomeAndGo(user);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setShowEmailHint(false);
    setLoading(true);

    try {
      if (!isValidEmail(email)) {
        setShowEmailHint(true);
        setLoading(false);
        return;
      }

      if (isRegistering) {
        if (password.length < 6) {
          setError("Password needs at least 6 characters.");
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError("Passwords don’t match. Please check and try again.");
          setLoading(false);
          return;
        }
        const phoneDigits = phone.replace(/[^\d]/g, "");
        if (!name.trim()) {
          setError("Please fill in your name.");
          setLoading(false);
          return;
        }
        if (!phoneDigits) {
          setShowPhoneHint(true);
          setLoading(false);
          return;
        }
        if (!phoneDigits.startsWith("01")) {
          setShowPhoneHint(true);
          setLoading(false);
          return;
        }
        setShowPhoneHint(false);

        try {
          const result = await apiService.user.preRegister({
            email,
            password,
            name,
            phone,
          });
          sessionStorage.setItem("pendingWelcomeName", name.trim());
          sessionStorage.removeItem("fromGroomingRegister");

          if (result.needsVerification) {
            setAwaitingVerification(true);
            setError("");
            return;
          }

          // Confirm email OFF (dev only) — sign in immediately
          const registered = await login(email, password);
          sessionStorage.removeItem("loginEmail");
          sessionStorage.removeItem("loginPassword");
          sessionStorage.removeItem("loginError");
          await seedWelcomeAndGo(registered, name.trim());
        } catch (err: any) {
          setError(friendlyAuthError(err?.message || "", "register"));
        }
      } else {
        const loggedInUser = await login(email, password);
        sessionStorage.removeItem("loginEmail");
        sessionStorage.removeItem("loginPassword");
        sessionStorage.removeItem("loginError");
        sessionStorage.removeItem("fromGroomingRegister");
        if (loggedInUser?._id && loggedInUser.role !== "admin") {
          void prefetchDashboard(loggedInUser._id);
        }
        setIsAdminLogin(loggedInUser?.role === "admin");
        setShowSuccessModal(true);

        setTimeout(() => {
          if (loggedInUser.role === "admin") {
            navigate("/admin-portal", { replace: true });
            return;
          }
          const returnToBooking = sessionStorage.getItem("returnToBooking");
          const fromGroomingRegister = sessionStorage.getItem(
            "fromGroomingRegister",
          );
          if (returnToBooking === "true" || fromGroomingRegister === "true") {
            sessionStorage.removeItem("returnToBooking");
            sessionStorage.removeItem("fromGroomingRegister");
            navigate("/grooming-appointment", { replace: true });
          } else if (from && from !== "/") {
            navigate(from, { replace: true });
          } else {
            navigate("/member-dashboard", { replace: true });
          }
        }, 2000);
      }
    } catch (err: any) {
      const errorMessage = friendlyAuthError(err?.message || "", "login");
      setError(errorMessage);
      sessionStorage.setItem("loginError", errorMessage);
      setShowSuccessModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setError("");
    setResendSent(false);
    setResendLoading(true);
    try {
      await apiService.user.resendVerification(email);
      setResendSent(true);
    } catch (err: any) {
      setError(
        friendlyAuthError(err?.message || "Couldn’t resend email.", "reset"),
      );
    } finally {
      setResendLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    setShowEmailHint(false);
    if (!email) {
      setError("Enter your email address first.");
      return;
    }
    if (!isValidEmail(email)) {
      setShowEmailHint(true);
      return;
    }
    try {
      setLoading(true);
      setError("");
      const result = await apiService.user.forgotPassword(email);
      if (result.message === "Password reset email sent") {
        setResetEmailSent(true);
        setShowSuccessModal(true);
        setTimeout(() => {
          setShowSuccessModal(false);
          setResetEmailSent(false);
        }, 2000);
      }
    } catch (err: any) {
      setError(friendlyAuthError(err?.message || "", "reset"));
    } finally {
      setLoading(false);
    }
  };

  const handleBackToHome = () => {
    sessionStorage.removeItem("fromGroomingRegister");
    const returnToBooking = sessionStorage.getItem("returnToBooking");
    if (!isRegistering && returnToBooking === "true") {
      sessionStorage.removeItem("returnToBooking");
      navigate("/grooming-appointment");
      return;
    }
    sessionStorage.removeItem("returnToBooking");
    setReturningFromDashboard(false);
    navigate("/");
  };

  const title = awaitingVerification
    ? "Check your email"
    : isRegistering
      ? "Create your account"
      : "Welcome back";
  const subtitle = awaitingVerification
    ? null
    : isRegistering
      ? null
      : "Access your pets, bookings, and member benefits.";

  const labelClass = "mb-1 block text-sm font-medium text-stone-700";

  return (
    <div className="font-sans min-h-screen lg:h-screen lg:overflow-hidden flex flex-col lg:flex-row bg-gradient-to-br from-rose-50 via-white to-pink-50">
      {/* Left: photo */}
      <aside className="relative h-[9.5rem] overflow-hidden bg-[#c8e0b8] lg:h-auto lg:min-h-full lg:w-[48%]">
        <img
          src="/imgs/Login-register-pic4.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[center_35%] animate-[auth-glow_18s_ease-in-out_infinite_alternate]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/30 via-transparent to-transparent" />

        <div className="relative z-10 flex h-full flex-col justify-between p-4 sm:p-8 lg:p-10">
          <button
            type="button"
            onClick={handleBackToHome}
            className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-stone-800 shadow-sm backdrop-blur-md transition hover:bg-white group"
          >
            <ChevronLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" />
            <span className="text-sm font-medium">Back</span>
          </button>

          <div className="animate-fade-in-up pb-2 lg:pb-4 max-w-sm">
            <p className="font-display text-xl font-semibold leading-snug text-white drop-shadow-md sm:text-3xl lg:text-[2.1rem]">
              Fluffy friends
              <span className="block text-rose-100 font-medium">
                welcome here.
              </span>
            </p>
          </div>
        </div>
      </aside>

      {/* Right: form */}
      <main
        className={`relative flex flex-1 flex-col overflow-y-auto bg-rose-50/40 px-5 sm:px-10 lg:px-12 xl:px-16 ${
          isRegistering
            ? "justify-start pt-3 pb-6 lg:py-8"
            : "justify-start pt-3 pb-6 lg:justify-center lg:py-10"
        }`}
      >
        <div className="relative z-10 mx-auto my-0 w-full max-w-md lg:my-auto">
          <div className="text-center">
            <img
              src="/imgs/AH%20HAO%20PET%20SHOP%20LOGO.png"
              alt="AH HAO PET SHOP"
              className={`mx-auto w-auto object-contain ${
                isRegistering ? "h-14 sm:h-[4.5rem]" : "h-14 sm:h-20 lg:h-24"
              }`}
            />
            <h1
              className={`mt-4 font-display font-bold text-stone-900 tracking-tight ${
                isRegistering
                  ? "text-2xl sm:text-[1.75rem]"
                  : "text-2xl sm:text-3xl lg:text-[2.15rem]"
              }`}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1.5 hidden text-[15px] leading-relaxed text-stone-500 lg:block">
                {subtitle}
              </p>
            )}
          </div>

          {error && (
            <div className="mt-6 flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
              <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-700">{error}</p>
            </div>
          )}

          {awaitingVerification ? (
            <div className="mt-5 text-center space-y-5">
              <p className="text-[15px] text-stone-500 leading-relaxed">
                We sent a confirmation link to
                <span className="mt-1 block font-medium text-stone-800 break-all">
                  {email}
                </span>
              </p>
              {resendSent && (
                <p className="text-sm text-emerald-600">Email resent.</p>
              )}
              <div className="space-y-3 text-sm">
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  className="font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-50"
                >
                  {resendLoading ? "Sending…" : "Resend email"}
                </button>
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setAwaitingVerification(false);
                      setResendSent(false);
                      setError("");
                      sessionStorage.removeItem("pendingWelcomeName");
                    }}
                    className="text-stone-500 hover:text-stone-800"
                  >
                    Back
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              noValidate
              className={`mt-5 flex flex-col ${
                isRegistering ? "gap-3" : "gap-3.5 lg:mt-7 lg:gap-4"
              }`}
            >
              {isRegistering && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="name" className={labelClass}>
                      Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Jie Hao"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className={labelClass}>
                      Phone
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      required
                      value={phone}
                      onChange={(e) => {
                        const next = formatPhoneInput(e.target.value);
                        setPhone(next);
                        setShowPhoneHint(phoneNeeds01Hint(next));
                      }}
                      placeholder="0123456789"
                      className={inputClass}
                    />
                    {showPhoneHint && (
                      <p className="mt-1.5 text-sm text-rose-600">
                        Phone must start with 01 (e.g. 0123456789).
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email" className={labelClass}>
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setShowEmailHint(false);
                    setError("");
                  }}
                  placeholder="you@mail.com"
                  className={inputClass}
                />
                {showEmailHint && (
                  <p className="mt-1.5 text-sm text-rose-600">
                    Use a valid email, e.g. you@mail.com
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="password" className={labelClass}>
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      isRegistering ? "new-password" : "current-password"
                    }
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      isRegistering ? "At least 6 characters" : "Your password"
                    }
                    minLength={isRegistering ? 6 : undefined}
                    className={`${inputClass} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-rose-600"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {isRegistering && (
                <div>
                  <label htmlFor="confirmPassword" className={labelClass}>
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      minLength={6}
                      className={`${inputClass} pr-11`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-rose-600"
                      aria-label={
                        showConfirmPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {!isRegistering && (
                <div className="order-2 flex items-center justify-between pt-1 lg:order-none">
                  <button
                    type="button"
                    onClick={() => setIsRegistering(true)}
                    className="text-sm font-medium text-rose-600 hover:text-rose-700"
                  >
                    Create account
                  </button>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-sm font-medium text-stone-500 hover:text-stone-800"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50 ${
                  isRegistering ? "mt-1 py-3" : "order-1 py-3.5 lg:order-none"
                }`}
              >
                {loading && (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                {loading
                  ? isRegistering
                    ? "Creating account…"
                    : "Signing In…"
                  : isRegistering
                    ? "Create member account"
                    : "Sign in"}
              </button>

              {isRegistering && (
                <p className="pt-1 text-center text-sm text-stone-500">
                  Already a member?{" "}
                  <button
                    type="button"
                    onClick={() => setIsRegistering(false)}
                    className="font-semibold text-rose-600 hover:text-rose-700"
                  >
                    Sign in
                  </button>
                </p>
              )}
            </form>
          )}
        </div>
      </main>

      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-rose-950/30 px-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl animate-fade-in-up">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle className="h-7 w-7 text-emerald-600" />
            </div>
            <h3 className="font-display mt-4 text-xl font-bold text-stone-900">
              {resetEmailSent
                ? "Check your inbox"
                : isRegistering
                  ? "Welcome to the club"
                  : "Welcome back"}
            </h3>
            <p className="mt-2 text-sm text-stone-500">
              {resetEmailSent
                ? "We’ve sent a password reset link to your email."
                : isRegistering
                  ? "Your member account is ready. Opening your dashboard…"
                  : isAdminLogin
                    ? "Opening your admin dashboard…"
                    : "Opening your member dashboard…"}
            </p>
            <div className="mt-5 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-600 border-t-transparent" />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes auth-glow {
          from { transform: scale(1); }
          to { transform: scale(1.04); }
        }
      `}</style>
    </div>
  );
};

export default Login;
