"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, api } from "./api";
import { auth as fbAuth } from "./firebase";
import { signOut as fbSignOut } from "firebase/auth";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      // 1. Check if returning from Server-Side Google OAuth redirect with ?token=...
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const queryToken = urlParams.get("token");
        const queryEmail = urlParams.get("email");
        const queryName = urlParams.get("name");

        if (queryToken && queryEmail) {
          const newUser: User = {
            id: "",
            name: queryName || queryEmail.split("@")[0],
            email: queryEmail,
            plan: "free",
            is_email_verified: true,
          };
          login(queryToken, newUser);

          // Clean URL query params without page reload
          urlParams.delete("token");
          urlParams.delete("email");
          urlParams.delete("name");
          urlParams.delete("connected");
          const remainingQuery = urlParams.toString();
          const cleanUrl = window.location.pathname + (remainingQuery ? `?${remainingQuery}` : "");
          window.history.replaceState({}, document.title, cleanUrl);

          api.auth
            .getMe()
            .then((freshUser) => {
              setUser(freshUser);
              localStorage.setItem("outreach_user", JSON.stringify(freshUser));
            })
            .catch(() => {})
            .finally(() => setIsLoading(false));
          return;
        }
      }

      const storedToken = localStorage.getItem("outreach_token");
      const storedUser = localStorage.getItem("outreach_user");

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        // Verify token in background
        api.auth
          .getMe()
          .then((freshUser) => {
            setUser(freshUser);
            localStorage.setItem("outreach_user", JSON.stringify(freshUser));
          })
          .catch(() => {
            // Token expired or invalid
            logout();
          })
          .finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    } catch {
      setIsLoading(false);
    }
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("outreach_token", newToken);
    localStorage.setItem("outreach_user", JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("outreach_token");
    localStorage.removeItem("outreach_user");
    try {
      fbSignOut(fbAuth).catch(() => {});
    } catch {}
  };

  const refreshUser = async () => {
    try {
      const fresh = await api.auth.getMe();
      setUser(fresh);
      localStorage.setItem("outreach_user", JSON.stringify(fresh));
    } catch (e) {
      console.error("Could not refresh user", e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
