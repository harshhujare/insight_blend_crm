import { env } from '@/config/env';

export class ApiError extends Error {
  public status: number;
  public data: any;

  constructor(status: number, data: any, message?: string) {
    const errorMsg =
      message ||
      (typeof data === 'object' && data !== null
        ? data.error || data.message || `Request failed with status ${status}`
        : `Request failed with status ${status}`);
    super(errorMsg);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const TOKEN_STORAGE_KEY = 'ib_auth_token';

let authToken: string | null = null;
let authErrorHandler: (() => void) | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }
}

export function getAuthToken(): string | null {
  if (authToken) return authToken;
  if (typeof window !== 'undefined') {
    authToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  }
  return authToken;
}

export function setAuthErrorHandler(handler: () => void): void {
  authErrorHandler = handler;
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  // Normalize base URL and endpoint
  const baseUrl = env.NEXT_PUBLIC_API_URL.replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  let url = `${baseUrl}${cleanEndpoint}`;

  if (options.params) {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // Always send cookies for cross-origin or same-origin
  };

  let response: Response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (networkError: unknown) {
    const errorMsg = networkError instanceof Error ? networkError.message : 'Network connection failed';
    throw new ApiError(0, { error: errorMsg }, `Cannot connect to API server (${baseUrl})`);
  }

  let data: any = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    try {
      data = await response.text();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      if (authErrorHandler) {
        authErrorHandler();
      }
      throw new ApiError(401, data, 'Session expired or unauthenticated');
    }

    if (response.status === 403) {
      throw new ApiError(403, data, 'Access denied: insufficient permissions');
    }

    throw new ApiError(response.status, data);
  }

  return data as T;
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  patch: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  put: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};
