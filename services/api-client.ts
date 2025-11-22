import { ApiOptions } from "@/types/common";

// TODO: 환경변수 설정 필요
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://4.230.112.41/wu-be-api/api/v1";

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

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
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

    // ✅ Access token을 localStorage에서 가져와서 Authorization 헤더에 추가
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        console.log("🔑 Adding Authorization header with access token");
      } else {
        console.log("🔑 No access token found in localStorage");
      }
    }

    return headers;
  }

  async request<T>(
    endpoint: string,
    options: ApiOptions = {},
    isRetry = false
  ): Promise<T> {
    const { method = "GET", body, queryParams } = options;

    // queryParams가 있으면 URL에 추가
    let fullUrl = `${this.baseURL}${endpoint}`;
    if (queryParams && Object.keys(queryParams).length > 0) {
      const urlParams = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value) {
          urlParams.append(key, value);
        }
      });
      fullUrl += `?${urlParams.toString()}`;
    }

    const config: RequestInit = {
      method,
      headers: await this.buildHeaders(options),
      // ✅ 쿠키 포함 (refresh token용)
      credentials: "include",
    };

    // body가 있는 경우 추가
    if (body) {
      if (body instanceof FormData) {
        config.body = body;
      } else {
        config.body = JSON.stringify(body);
      }
    }

    // 🔍 디버깅: 요청 로그
    console.log(`🌐 API Request: ${method} ${fullUrl}`);
    console.log(`🔑 Headers:`, config.headers);

    try {
      const response = await fetch(fullUrl, config);
      const responseText = await response.text();

      console.log(`📡 Response Status: ${response.status} for ${endpoint}`);

      // ✅ Handle 401 Unauthorized - access token이 만료되었거나 무효함
      if (response.status === 401 && !isRetry) {
        try {
          console.log("🔄 Got 401, attempting to refresh access token...");

          // ✅ HTTP-only 쿠키의 refresh token을 사용하여 새 access token 발급
          const refreshResponse = await fetch(
            `${this.baseURL}/accounts/token/refresh/`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include", // refresh token 쿠키 포함
            }
          );

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            if (refreshData.access) {
              // ✅ 새 access token을 localStorage에 저장
              localStorage.setItem("token", refreshData.access);
              console.log(
                "✅ New access token saved, retrying original request"
              );

              // 원래 요청 재시도
              return this.request<T>(endpoint, options, true);
            }
          }

          throw new Error("Failed to refresh access token");
        } catch (refreshError) {
          console.error("❌ Token refresh failed:", refreshError);
          // access token과 사용자 정보 클리어
          localStorage.removeItem("token");
          localStorage.removeItem("user");

          // 로그인 페이지로 리다이렉트 (선택적)
          if (typeof window !== "undefined") {
            window.location.href = "/auth/login";
          }
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

        console.error(`❌ API Error: ${errorMessage}`, {
          responseText,
          status: response.status,
        });
        throw new APIError(errorMessage, response.status, errorDetail);
      }

      // 빈 응답 처리 (204 No Content 등)
      if (!responseText || !responseText.trim()) {
        console.log(`✅ Empty response for ${endpoint}`);
        return {} as T;
      }

      console.log(`✅ Success response for ${endpoint}`);
      return JSON.parse(responseText);
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }

      if (error instanceof Error) {
        console.error(`❌ Network Error:`, error.message);
        throw new APIError(error.message);
      }

      console.error(`❌ Unknown Error:`, error);
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

  async patch<T>(
    endpoint: string,
    body?: any,
    options?: Omit<ApiOptions, "method" | "body">
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "PATCH", body });
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
