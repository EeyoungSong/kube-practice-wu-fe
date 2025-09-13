"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { authService } from "@/services/auth.service";
import { User } from "@/types/auth";
import { APIError } from "@/services/api-client";

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // ✅ localStorage에서 사용자 정보와 access token 확인
    const checkAuth = async () => {
      const savedUser = authService.getCurrentUser();
      const accessToken = authService.getToken();

      if (savedUser && accessToken) {
        // access token이 유효한지 확인
        const validToken = await authService.getValidToken();
        if (validToken) {
          setUser(savedUser);
          console.log("✅ User authenticated with valid access token");
        } else {
          // 토큰이 유효하지 않으면 로컬 데이터 클리어
          localStorage.removeItem("user");
          localStorage.removeItem("token");
          console.log("❌ Invalid token, cleared local data");
        }
      } else {
        console.log("❌ No user or access token found");
      }

      setIsLoading(false);
    };

    checkAuth();
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

      console.log("✅ Login successful");
    } catch (error) {
      console.error("❌ Login error:", error);
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

      console.log("✅ Signup successful");
    } catch (error) {
      console.error("❌ Signup error:", error);
      if (error instanceof APIError) {
        throw new Error(error.message);
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    await authService.logout();
    console.log("✅ Logout completed");
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
