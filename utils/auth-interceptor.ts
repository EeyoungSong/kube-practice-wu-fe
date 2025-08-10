/**
 * Auth interceptor for HTTP-only cookie based authentication
 * Since tokens are stored in HTTP-only cookies, we can't access them directly
 * This interceptor only handles 401 responses by triggering logout
 */
export class AuthInterceptor {
  /**
   * Setup global fetch interceptor for automatic token refresh
   * This wraps the global fetch to handle 401 errors with cookie-based auth
   */
  setupGlobalInterceptor(): void {
    // HTTP-only cookie 방식에서는 별도의 글로벌 인터셉터가 필요하지 않음
    // ApiClient에서 이미 401 처리와 토큰 재발급을 처리하고 있음
    console.log("Global interceptor setup for HTTP-only cookie auth");
  }

  /**
   * Handle authentication failure
   * This can be called when we detect authentication issues
   */
  handleAuthFailure(): void {
    // 인증 실패 시 사용자 정보만 클리어 (쿠키는 서버에서 관리)
    localStorage.removeItem("user");

    // 로그인 페이지로 리다이렉트하거나 이벤트 발생
    if (typeof window !== "undefined") {
      window.location.href = "/auth/login";
    }
  }
}

// Create a singleton instance
export const authInterceptor = new AuthInterceptor();
