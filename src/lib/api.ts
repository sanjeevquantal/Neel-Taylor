// A tiny API client with base URL and auth header handling

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

const getBaseUrl = (): string => {
  const envUrl = (import.meta as any)?.env?.VITE_API_BASE_URL as string | undefined;
  // Fallback to Render backend if not configured
  return envUrl || "https://neeltaylor-ifob.onrender.com/api";
};

const getAuthToken = (): string | undefined => {
  try {
    // Try common keys; adjust if your login sets a specific one
    return (
      localStorage.getItem("auth_token") ||
      localStorage.getItem("token") ||
      localStorage.getItem("jwt") ||
      undefined
    ) || undefined;
  } catch {
    return undefined;
  }
};

// Check if JWT token is expired
export const isTokenExpired = (token: string): boolean => {
  try {
    // JWT tokens have 3 parts separated by dots
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    
    // Decode the payload (second part)
    const payload = JSON.parse(atob(parts[1]));
    
    // Check if token has expiration claim
    if (!payload.exp) return true;
    
    // Check if token is expired (exp is in seconds, Date.now() is in milliseconds)
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch {
    // If we can't parse the token, consider it expired
    return true;
  }
};

// Get valid auth token (returns undefined if expired)
export const getValidAuthToken = (): string | undefined => {
  const token = getAuthToken();
  if (!token || isTokenExpired(token)) {
    return undefined;
  }
  return token;
};

export interface RequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
  // When using absolute URLs, set absolute=true to skip base join
  absolute?: boolean;
}

// Custom error types for better error handling
export class NetworkError extends Error {
  // httpStatus is optional and only set for server responses
  public httpStatus?: number;
  public rawBody?: string;
  constructor(
    message: string,
    public type: 'NETWORK_ERROR' | 'TIMEOUT' | 'OFFLINE' | 'SERVER_ERROR' | 'UNKNOWN',
    options?: { httpStatus?: number; rawBody?: string }
  ) {
    super(message);
    this.name = 'NetworkError';
    this.httpStatus = options?.httpStatus;
    this.rawBody = options?.rawBody;
  }
}

export async function apiFetch<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = options.absolute ? path : `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    ...(options.headers || {}),
  };

  // Only set Content-Type for JSON requests
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const token = getValidAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body !== undefined ? (options.body instanceof FormData ? options.body : JSON.stringify(options.body)) : undefined,
      signal: options.signal,
      credentials: "omit",
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      
      // Handle 401 Unauthorized - token expired or invalid
      if (response.status === 401) {
        // Clear expired token
        localStorage.removeItem('auth_token');
        localStorage.removeItem('campaigner-auth');
        // Dispatch custom event to notify app of logout
        window.dispatchEvent(new CustomEvent('auth-expired'));
      }
      
      // Try to surface a concise message for common errors
      let conciseMessage = response.statusText || `HTTP ${response.status}`;
      try {
        if (text && text.trim().startsWith('{')) {
          const json = JSON.parse(text);
          // Prefer typical API fields when present
          conciseMessage = json.message || json.detail || conciseMessage;
        } else if (text) {
          conciseMessage = text;
        }
      } catch {
        // ignore JSON parse errors
      }

      throw new NetworkError(
        `Request failed ${response.status}: ${conciseMessage}`,
        'SERVER_ERROR',
        { httpStatus: response.status, rawBody: text }
      );
    }

    // Try to parse JSON; fall back to text
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return (await response.json()) as T;
    }
    return (await response.text()) as unknown as T;
  } catch (error) {
    // Handle different types of network errors
    if (error instanceof NetworkError) {
      throw error;
    }
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      // Network error - could be offline, DNS failure, or server unreachable
      if (!navigator.onLine) {
        throw new NetworkError(
          'You appear to be offline. Please check your internet connection and try again.',
          'OFFLINE'
        );
      } else {
        throw new NetworkError(
          'Unable to connect to the server. Please check your internet connection or try again later.',
          'NETWORK_ERROR'
        );
      }
    }
    
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new NetworkError(
        'Request was cancelled due to timeout. Please try again.',
        'TIMEOUT'
      );
    }
    
    // Generic error fallback
    throw new NetworkError(
      error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
      'UNKNOWN'
    );
  }
}

export const apiClient = {
  get: <T = unknown>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...(options || {}), method: "GET" }),
  post: <T = unknown>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...(options || {}), method: "POST", body }),
  patch: <T = unknown>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...(options || {}), method: "PATCH", body }),
  delete: <T = unknown>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiFetch<T>(path, { ...(options || {}), method: "DELETE" }),
  uploadFile: <T = unknown>(path: string, file: File, conversationId?: number, options?: Omit<RequestOptions, "method" | "body">) => {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add conversation_id as query parameter
    const queryParams = conversationId ? `?conversation_id=${conversationId}` : '';
    const fullPath = `${path}${queryParams}`;
    
    return apiFetch<T>(fullPath, { ...(options || {}), method: "POST", body: formData });
  },
};

export default apiClient;