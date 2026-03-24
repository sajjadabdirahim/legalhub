import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

interface AuthContextType {
  isLoggedIn: boolean;
  userEmail: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("legalhub_user");
    if (stored) {
      setIsLoggedIn(true);
      setUserEmail(stored);
    }
  }, []);

  const doLogin = (email: string) => {
    localStorage.setItem("legalhub_user", email);
    setIsLoggedIn(true);
    setUserEmail(email);
  };

  const login = useCallback(async (email: string, _password: string) => {
    if (email && email.includes("@")) {
      doLogin(email);
      return true;
    }
    return false;
  }, []);

  const signup = useCallback(async (email: string, _password: string) => {
    if (email && email.includes("@")) {
      doLogin(email);
      return true;
    }
    return false;
  }, []);

  const loginWithGoogle = useCallback(async () => {
    // Mock Google login
    doLogin("user@gmail.com");
    return true;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("legalhub_user");
    setIsLoggedIn(false);
    setUserEmail(null);
  }, []);

  return (
    <AuthContext.Provider value={{ isLoggedIn, userEmail, login, signup, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
