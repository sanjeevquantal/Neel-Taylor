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
  constructor(message: string, public type: 'NETWORK_ERROR' | 'TIMEOUT' | 'OFFLINE' | 'SERVER_ERROR' | 'UNKNOWN') {
    super(message);
    this.name = 'NetworkError';
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

  const token = getAuthToken();
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
      throw new NetworkError(
        `Request failed ${response.status}: ${text || response.statusText}`,
        'SERVER_ERROR'
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