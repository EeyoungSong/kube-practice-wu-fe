import { ApiOptions } from "@/types/api";
import { authService } from "./auth.service";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

export class APIError extends Error {
  status?: number;
  detail?: string;

  constructor(message: string, status?: number, detail?: string) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.detail = detail;
  }
}

export class ApiClient {
  private baseURL: string;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async getAuthToken(): Promise<string | null> {
    if (typeof window !== "undefined") {
      // Check if we need to use authService for token validation
      const token = await authService.getValidToken();
      return token;
    }
    return null;
  }

  private async buildHeaders(options: ApiOptions): Promise<HeadersInit> {
    const headers: Record<string, string> = {
      ...options.headers,
    };

    // Content-Type을 설정하지 않은 경우에만 기본값 설정
    if (
      !headers["Content-Type"] &&
      options.body &&
      !(options.body instanceof FormData)
    ) {
      headers["Content-Type"] = "application/json";
    }

    // 인증이 필요한 경우 토큰 추가
    if (options.requireAuth) {
      const token = await this.getAuthToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  async request<T>(
    endpoint: string,
    options: ApiOptions = {},
    isRetry = false
  ): Promise<T> {
    const { method = "GET", body } = options;

    const config: RequestInit = {
      method,
      headers: await this.buildHeaders(options),
    };

    // body가 있는 경우 추가
    if (body) {
      if (body instanceof FormData) {
        config.body = body;
      } else {
        config.body = JSON.stringify(body);
      }
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      const responseText = await response.text();

      // Handle 401 Unauthorized - Token might be expired
      if (response.status === 401 && !isRetry && options.requireAuth) {
        try {
          // Try to refresh the token
          await authService.refreshAccessToken();

          // Retry the request with the new token
          return this.request<T>(endpoint, options, true);
        } catch (refreshError) {
          // If refresh fails, throw the original error
          console.error("Token refresh failed:", refreshError);
        }
      }

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        let errorDetail: string | undefined;

        try {
          if (responseText && responseText.trim()) {
            const errorData = JSON.parse(responseText);
            errorMessage =
              errorData.message || errorData.detail || errorMessage;
            errorDetail = errorData.detail;
          }
        } catch {
          // JSON 파싱 실패 시 기본 메시지 사용
        }

        throw new APIError(errorMessage, response.status, errorDetail);
      }

      // 빈 응답 처리 (204 No Content 등)
      if (!responseText || !responseText.trim()) {
        return {} as T;
      }

      return JSON.parse(responseText);
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }

      if (error instanceof Error) {
        throw new APIError(error.message);
      }

      throw new APIError("알 수 없는 오류가 발생했습니다.");
    }
  }

  // 편의 메서드들
  async get<T>(
    endpoint: string,
    options?: Omit<ApiOptions, "method">
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  async post<T>(
    endpoint: string,
    body?: any,
    options?: Omit<ApiOptions, "method" | "body">
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "POST", body });
  }

  async put<T>(
    endpoint: string,
    body?: any,
    options?: Omit<ApiOptions, "method" | "body">
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "PUT", body });
  }

  async delete<T>(
    endpoint: string,
    options?: Omit<ApiOptions, "method">
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  // FormData 업로드를 위한 특별한 메서드
  async upload<T>(
    endpoint: string,
    formData: FormData,
    options?: Omit<ApiOptions, "method" | "body">
  ): Promise<T> {
    const config: ApiOptions = {
      ...options,
      method: "POST",
      body: formData,
      headers: {
        ...options?.headers,
        // FormData의 경우 Content-Type을 설정하지 않음
      },
    };

    // Content-Type 헤더 제거 (브라우저가 자동으로 설정)
    if (config.headers && "Content-Type" in config.headers) {
      delete config.headers["Content-Type"];
    }

    return this.request<T>(endpoint, config);
  }
}

// 기본 API 클라이언트 인스턴스
export const apiClient = new ApiClient();
