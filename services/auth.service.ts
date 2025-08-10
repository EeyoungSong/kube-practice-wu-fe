import { apiClient } from "./api-client";
import {
  LoginRequest,
  SignupRequest,
  AuthResponse,
  User,
  TokenRefreshRequest,
  TokenRefreshResponse,
} from "@/types/api";

class AuthService {
  private refreshPromise: Promise<string> | null = null;

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>("/accounts/login/", {
      email,
      password,
    } as LoginRequest);

    // 토큰 저장
    this.saveTokens(response.access, response.refresh);

    return response;
  }

  async signup(
    username: string,
    email: string,
    password: string
  ): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>("/accounts/signup/", {
      username,
      email,
      password,
    } as SignupRequest);

    // 토큰 저장
    this.saveTokens(response.access, response.refresh);

    return response;
  }

  logout(): void {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    this.refreshPromise = null;
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem("user");
    if (userStr && userStr !== "undefined") {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }

  saveUser(user: User): void {
    localStorage.setItem("user", JSON.stringify(user));
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem("token");
  }

  getToken(): string | null {
    return localStorage.getItem("token");
  }

  getRefreshToken(): string | null {
    return localStorage.getItem("refreshToken");
  }

  private saveTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem("token", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
  }

  async refreshAccessToken(): Promise<string> {
    // If a refresh is already in progress, return the existing promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // Create a new refresh promise
    this.refreshPromise = this.performTokenRefresh();

    try {
      const newToken = await this.refreshPromise;
      return newToken;
    } finally {
      // Clear the promise after completion
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<string> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    try {
      const response = await apiClient.post<TokenRefreshResponse>(
        "/accounts/token/refresh/",
        { refresh: refreshToken } as TokenRefreshRequest,
        { requireAuth: false } // Don't use auth header for refresh
      );

      if (response.access) {
        localStorage.setItem("token", response.access);

        // If a new refresh token is provided, update it
        if (response.refresh) {
          localStorage.setItem("refreshToken", response.refresh);
        }

        return response.access;
      }

      throw new Error("No access token in refresh response");
    } catch (error) {
      // If refresh fails, clear all auth data
      this.logout();
      throw error;
    }
  }

  isTokenExpired(token: string): boolean {
    try {
      // JWT tokens have three parts separated by dots
      const parts = token.split(".");
      if (parts.length !== 3) {
        return true;
      }

      // Decode the payload (second part)
      const payload = JSON.parse(atob(parts[1]));

      if (!payload.exp) {
        return false; // If no expiration, assume it's valid
      }

      // Check if token is expired (with 60 second buffer)
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp < currentTime + 60;
    } catch (error) {
      // If we can't decode the token, assume it's invalid
      return true;
    }
  }

  async getValidToken(): Promise<string | null> {
    const token = this.getToken();

    if (!token) {
      return null;
    }

    // Check if token is expired or about to expire
    if (this.isTokenExpired(token)) {
      try {
        const newToken = await this.refreshAccessToken();
        return newToken;
      } catch (error) {
        console.error("Failed to refresh token:", error);
        return null;
      }
    }

    return token;
  }
}

export const authService = new AuthService();
