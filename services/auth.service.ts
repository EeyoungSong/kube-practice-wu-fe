import { apiClient } from "./api-client";
import {
  LoginRequest,
  SignupRequest,
  AuthResponse,
  User,
  TokenRefreshResponse,
} from "@/types/api";

class AuthService {
  async login(email: string, password: string): Promise<AuthResponse> {
    console.log("🔐 Attempting login for:", email);

    const response = await apiClient.post<AuthResponse>("/accounts/login/", {
      email,
      password,
    } as LoginRequest);

    console.log("🔐 Login response:", response);

    // ✅ Access token은 localStorage에 저장 (Authorization 헤더용)
    if (response.access) {
      localStorage.setItem("token", response.access);
      console.log("💾 Access token saved to localStorage");
    }

    // ✅ Refresh token은 서버가 HTTP-only 쿠키로 설정
    console.log("🍪 Refresh token should be set as HTTP-only cookie by server");
    console.log("🍪 Current cookies:", document.cookie);

    return response;
  }

  async signup(
    username: string,
    email: string,
    password: string
  ): Promise<AuthResponse> {
    console.log("📝 Attempting signup for:", email);

    const response = await apiClient.post<AuthResponse>("/accounts/signup/", {
      username,
      email,
      password,
    } as SignupRequest);

    console.log("📝 Signup response:", response);

    // ✅ Access token은 localStorage에 저장
    if (response.access) {
      localStorage.setItem("token", response.access);
      console.log("💾 Access token saved to localStorage");
    }

    // ✅ Refresh token은 서버가 HTTP-only 쿠키로 설정
    console.log("🍪 Refresh token should be set as HTTP-only cookie by server");

    return response;
  }

  async logout(): Promise<void> {
    try {
      console.log("🚪 Attempting logout...");
      // 서버에 로그아웃 요청을 보내서 refresh token 쿠키를 클리어
      await apiClient.post("/accounts/logout/", {});
      console.log("🚪 Logout successful");
    } catch (error) {
      console.error("🚪 Logout error:", error);
    }

    // 🧹 로컬 데이터 클리어 (access token과 사용자 정보)
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    console.log("🧹 Local auth data cleared");
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem("user");
    if (userStr && userStr !== "undefined") {
      try {
        const user = JSON.parse(userStr);
        console.log("👤 Current user from localStorage:", user);
        return user;
      } catch {
        console.warn("👤 Failed to parse user from localStorage");
        return null;
      }
    }
    console.log("👤 No user in localStorage");
    return null;
  }

  saveUser(user: User): void {
    localStorage.setItem("user", JSON.stringify(user));
    console.log("💾 User saved to localStorage:", user);
  }

  // ✅ Access token 관리 (localStorage 기반)
  getToken(): string | null {
    return localStorage.getItem("token");
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // ✅ 토큰 만료 검사 (Access token용)
  isTokenExpired(token: string): boolean {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) {
        return true;
      }

      const payload = JSON.parse(atob(parts[1]));
      if (!payload.exp) {
        return false;
      }

      // 30초 버퍼로 만료 검사
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime + 30;
    } catch (error) {
      console.error("Token decode error:", error);
      return true;
    }
  }

  // ✅ 유효한 access token 가져오기
  async getValidToken(): Promise<string | null> {
    const token = this.getToken();

    if (!token) {
      return null;
    }

    // 토큰 만료 검사
    if (this.isTokenExpired(token)) {
      try {
        await this.refreshAccessToken();
        return this.getToken(); // 재발급된 새 토큰 반환
      } catch (error) {
        console.error("Failed to refresh token:", error);
        return null;
      }
    }

    return token;
  }

  // ✅ Access token 재발급 (HTTP-only 쿠키의 refresh token 사용)
  async refreshAccessToken(): Promise<void> {
    try {
      console.log(
        "🔄 Refreshing access token using HTTP-only refresh token..."
      );

      // 서버의 HTTP-only 쿠키에 있는 refresh token으로 재발급
      const response = await apiClient.post<TokenRefreshResponse>(
        "/accounts/token/refresh/",
        {}
      );

      if (response.access) {
        localStorage.setItem("token", response.access);
        console.log("✅ New access token saved to localStorage");
      } else {
        throw new Error("No access token in refresh response");
      }
    } catch (error) {
      console.error("❌ Token refresh failed:", error);
      // 재발급 실패 시 로그아웃
      await this.logout();
      throw error;
    }
  }

  // 서버에서 인증 상태 확인 (선택적)
  async checkAuthStatus(): Promise<boolean> {
    try {
      console.log("🔍 Checking auth status with server...");
      await apiClient.get("/accounts/profile/");
      console.log("✅ Server auth check: authenticated");
      return true;
    } catch (error) {
      console.log("❌ Server auth check: not authenticated", error);
      return false;
    }
  }
}

export const authService = new AuthService();
