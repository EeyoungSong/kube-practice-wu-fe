"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { authService, APIError } from "@/services";
import type { User } from "@/types/api";
import { authInterceptor } from "@/utils/auth-interceptor";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 로컬 스토리지에서 사용자 정보 확인
    const savedUser = authService.getCurrentUser();
    if (savedUser) {
      setUser(savedUser);
      // Start token monitoring if user is logged in
      authInterceptor.startTokenMonitoring();
    }
    setIsLoading(false);

    // Cleanup on unmount
    return () => {
      authInterceptor.stopTokenMonitoring();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);

      const response = await authService.login(email, password);

      // 사용자 객체 생성
      const user: User = {
        id: response.user_id,
        email: email,
        username: response.username,
        user_id: response.user_id,
      };

      setUser(user);
      authService.saveUser(user);
      
      // Start token monitoring after successful login
      authInterceptor.startTokenMonitoring();
    } catch (error) {
      console.error("로그인 오류:", error);
      if (error instanceof APIError) {
        throw new Error(error.message);
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (username: string, email: string, password: string) => {
    try {
      setIsLoading(true);

      const response = await authService.signup(username, email, password);

      // 사용자 객체 생성
      const user: User = {
        id: response.user_id,
        email: email,
        username: response.username,
        user_id: response.user_id,
      };

      setUser(user);
      authService.saveUser(user);
      
      // Start token monitoring after successful signup
      authInterceptor.startTokenMonitoring();
    } catch (error) {
      console.error("회원가입 오류:", error);
      if (error instanceof APIError) {
        throw new Error(error.message);
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    authService.logout();
    
    // Stop token monitoring on logout
    authInterceptor.stopTokenMonitoring();
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
