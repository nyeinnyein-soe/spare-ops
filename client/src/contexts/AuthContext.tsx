import React, { createContext, useContext, useState } from "react";
import { User } from "../types";

interface AuthContextType {
  currentUser: User | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUserSession: (user: User) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("spareops_user");
    return saved ? JSON.parse(saved) : null;
  });

  const login = (user: User, token: string) => {
    localStorage.setItem("spareops_token", token);
    localStorage.setItem("spareops_user", JSON.stringify(user));
    setCurrentUser(user);
  };

  const logout = () => {
    localStorage.removeItem("spareops_token");
    localStorage.removeItem("spareops_user");
    setCurrentUser(null);
  };

  const updateUserSession = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem("spareops_user", JSON.stringify(user));
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        login,
        logout,
        updateUserSession,
        isAuthenticated: !!currentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
