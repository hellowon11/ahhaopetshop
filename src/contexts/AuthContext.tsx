import React, { createContext, useContext, useState, useEffect } from "react";
import { apiService } from "../services/apiService";
import { supabase } from "../lib/supabase";

interface User {
  _id: string;
  id?: string;
  name: string;
  email: string;
  phone: string;
  role?: "user" | "admin";
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  isLoading: boolean;
  isIntentionalLogin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isIntentionalLogin, setIsIntentionalLogin] = useState(false);

  const clearTokensAndState = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.removeItem("justLoggedIn");
    sessionStorage.removeItem("returnToBooking");
    setUser(null);
    setIsIntentionalLogin(false);
  };

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      setIsLoading(true);
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          if (mounted) clearTokensAndState();
          return;
        }
        const profile = await apiService.user.get();
        if (mounted) {
          setUser(profile);
          setIsIntentionalLogin(true);
          localStorage.setItem("user", JSON.stringify(profile));
          localStorage.setItem("token", data.session.access_token);
        }
      } catch (error) {
        console.error("Session restore failed:", error);
        if (mounted) clearTokensAndState();
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadUser();

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT" || !session) {
          clearTokensAndState();
          return;
        }
        if (
          event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED" ||
          event === "USER_UPDATED"
        ) {
          try {
            const profile = await apiService.user.get();
            setUser(profile);
            setIsIntentionalLogin(true);
            localStorage.setItem("user", JSON.stringify(profile));
            localStorage.setItem("token", session.access_token);
          } catch (e) {
            console.error("Failed to load profile after auth change:", e);
          }
        }
      },
    );

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    setIsIntentionalLogin(true);
    try {
      const userData = await apiService.user.login({ email, password });
      setUser(userData);
      sessionStorage.setItem("justLoggedIn", "true");
      return userData;
    } catch (error) {
      clearTokensAndState();
      throw error;
    }
  };

  const logout = () => {
    clearTokensAndState();
    sessionStorage.setItem("userLoggedOut", "true");
    const savedEmail = localStorage.getItem("loginEmail");
    localStorage.removeItem("loginPassword");
    localStorage.removeItem("loginError");
    if (savedEmail) localStorage.setItem("loginEmail", savedEmail);

    apiService.user.logout().finally(() => {
      window.location.href = "/login";
    });
  };

  useEffect(() => {
    const handleUnauthorized = () => logout();
    window.addEventListener("unauthorized", handleUnauthorized);
    return () => window.removeEventListener("unauthorized", handleUnauthorized);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, login, logout, isLoading, isIntentionalLogin }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

/** Admin → /admin-portal; member (or logged out) → /member-dashboard */
export const getDashboardPath = (user?: { role?: string } | null) =>
  user?.role === "admin" ? "/admin-portal" : "/member-dashboard";
