import { authService } from '@/services/auth.service';

/**
 * Token refresh interceptor for automatic token management
 * This can be used to periodically check and refresh tokens
 */
export class AuthInterceptor {
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

  /**
   * Start monitoring token expiration
   */
  startTokenMonitoring(): void {
    this.stopTokenMonitoring(); // Clear any existing interval

    // Initial check
    this.checkAndRefreshToken();

    // Set up periodic checks
    this.checkInterval = setInterval(() => {
      this.checkAndRefreshToken();
    }, this.CHECK_INTERVAL);
  }

  /**
   * Stop monitoring token expiration
   */
  stopTokenMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Check if token needs refresh and refresh if necessary
   */
  private async checkAndRefreshToken(): Promise<void> {
    try {
      const token = authService.getToken();
      
      if (!token) {
        return; // No token to check
      }

      // Check if token is expired or about to expire
      if (authService.isTokenExpired(token)) {
        console.log('Token is expired or about to expire, refreshing...');
        await authService.refreshAccessToken();
        console.log('Token refreshed successfully');
      }
    } catch (error) {
      console.error('Error checking/refreshing token:', error);
      // Don't throw - this is a background operation
    }
  }

  /**
   * Setup global fetch interceptor for automatic token refresh
   * This wraps the global fetch to handle 401 errors
   */
  setupGlobalInterceptor(): void {
    const originalFetch = window.fetch;

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      // First attempt
      let response = await originalFetch(input, init);

      // If 401 and has auth header, try to refresh
      if (response.status === 401 && init?.headers) {
        const headers = new Headers(init.headers);
        const authHeader = headers.get('Authorization');
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
          try {
            // Refresh the token
            const newToken = await authService.refreshAccessToken();
            
            // Update the headers with new token
            headers.set('Authorization', `Bearer ${newToken}`);
            
            // Retry the request
            response = await originalFetch(input, {
              ...init,
              headers
            });
          } catch (error) {
            console.error('Failed to refresh token in interceptor:', error);
          }
        }
      }

      return response;
    };
  }
}

// Create a singleton instance
export const authInterceptor = new AuthInterceptor();