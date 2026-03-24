import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { getStoredAccessToken, setStoredAccessToken } from "@/lib/api";
import { loginWithGoogleCredential, loginWithPassword, registerWithPassword } from "@/lib/authApi";

export type AuthActionResult = { ok: true } | { ok: false; message: string };

interface AuthContextType {
  isLoggedIn: boolean;
  userEmail: string | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<AuthActionResult>;
  signup: (email: string, password: string) => Promise<AuthActionResult>;
  loginWithGoogle: (credential?: string, devEmail?: string) => Promise<AuthActionResult>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_KEY = "legalhub_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const storedEmail = localStorage.getItem(USER_KEY);
    const tok = getStoredAccessToken();
    if (storedEmail && tok) {
      setIsLoggedIn(true);
      setUserEmail(storedEmail);
      setAccessToken(tok);
    } else if (storedEmail && !tok) {
      localStorage.removeItem(USER_KEY);
      setStoredAccessToken(null);
    }
  }, []);

  const persistSession = useCallback((email: string, token: string | null) => {
    localStorage.setItem(USER_KEY, email);
    setUserEmail(email);
    setAccessToken(token);
    setIsLoggedIn(!!email && !!token);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<AuthActionResult> => {
    if (!email || !email.includes("@")) {
      return { ok: false, message: "Enter a valid email address." };
    }
    const result = await loginWithPassword(email, password);
    if (result.ok) {
      const tok = getStoredAccessToken();
      persistSession(result.email, tok);
      return { ok: true };
    }
    return { ok: false, message: result.message };
  }, [persistSession]);

  const signup = useCallback(async (email: string, password: string): Promise<AuthActionResult> => {
    if (!email || !email.includes("@")) {
      return { ok: false, message: "Enter a valid email address." };
    }
    const result = await registerWithPassword(email, password);
    if (result.ok) {
      const tok = getStoredAccessToken();
      persistSession(result.email, tok);
      return { ok: true };
    }
    return { ok: false, message: result.message };
  }, [persistSession]);

  const loginWithGoogle = useCallback(
    async (credential?: string, devEmail?: string): Promise<AuthActionResult> => {
      const result = await loginWithGoogleCredential(credential, devEmail);
      if (result.ok) {
        const tok = getStoredAccessToken();
        persistSession(result.email, tok);
        return { ok: true };
      }
      return { ok: false, message: result.message };
    },
    [persistSession]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(USER_KEY);
    setStoredAccessToken(null);
    setIsLoggedIn(false);
    setUserEmail(null);
    setAccessToken(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        userEmail,
        accessToken,
        login,
        signup,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
