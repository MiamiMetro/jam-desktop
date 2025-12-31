// API Client for backend integration
// Backend is at http://localhost:3000

const API_BASE_URL = 'http://localhost:3000';

export interface PaginatedResponse<T> {
  data: T[];
  limit: number;
  offset: number;
  total?: number;
  hasMore?: boolean;
}

export interface ApiError {
  message: string;
  status: number;
}

// Get auth token from localStorage
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

// Set auth token in localStorage
export function setAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

// API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `API Error: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (Array.isArray(errorData) && errorData.length > 0) {
          errorMessage = errorData.map((err: { message?: string }) => err.message || JSON.stringify(err)).join(', ');
        }
      } catch {
        // If response is not JSON, use statusText
      }
      
      const error: ApiError = {
        message: errorMessage,
        status: response.status,
      };
      
      // Handle 401 unauthorized
      if (response.status === 401) {
        setAuthToken(null);
        // Could dispatch logout event here if needed
      }

      throw error;
    }

    // Handle empty responses (204 No Content)
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return {} as T;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw {
        message: 'Network error: Could not connect to server',
        status: 0,
      } as ApiError;
    }
    throw error;
  }
}

// GET request
export async function apiGet<T>(endpoint: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
  }
  const queryString = searchParams.toString();
  const url = queryString ? `${endpoint}?${queryString}` : endpoint;
  return apiRequest<T>(url, { method: 'GET' });
}

// Helper function to remove undefined values from object
function removeUndefined<T extends Record<string, unknown>>(obj: T): T {
  const cleaned = { ...obj };
  Object.keys(cleaned).forEach(key => {
    if (cleaned[key] === undefined) {
      delete cleaned[key];
    }
  });
  return cleaned;
}

// POST request
export async function apiPost<T>(endpoint: string, data?: unknown): Promise<T> {
  const body = data 
    ? JSON.stringify(typeof data === 'object' && data !== null && !Array.isArray(data) 
        ? removeUndefined(data as Record<string, unknown>)
        : data)
    : undefined;
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body,
  });
}

// PATCH request
export async function apiPatch<T>(endpoint: string, data?: unknown): Promise<T> {
  const body = data 
    ? JSON.stringify(typeof data === 'object' && data !== null && !Array.isArray(data) 
        ? removeUndefined(data as Record<string, unknown>)
        : data)
    : undefined;
  return apiRequest<T>(endpoint, {
    method: 'PATCH',
    body,
  });
}

// DELETE request
export async function apiDelete<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'DELETE' });
}

