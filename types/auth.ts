// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user_id: number;
  username: string;
}

export interface TokenRefreshRequest {
  refresh: string;
}

export interface TokenRefreshResponse {
  access: string;
  refresh?: string; // Some APIs return a new refresh token
}

export interface User {
  id: number;
  email: string;
  username: string;
  user_id: number;
}
