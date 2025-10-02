// Common API types
export interface ApiOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  requireAuth?: boolean;
  queryParams?: Record<string, string>;
}

export interface ApiError {
  message: string;
  status?: number;
  detail?: string;
}
