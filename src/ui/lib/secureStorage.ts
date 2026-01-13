/**
 * Secure Token Storage
 * 
 * Uses OS keychain (via keytar) when running in Electron for secure storage.
 * Falls back to localStorage when running in browser (development only).
 * 
 * This protects against XSS attacks that could steal tokens from localStorage.
 */

const TOKEN_ACCOUNT = 'supabase-auth-token';
const REFRESH_TOKEN_ACCOUNT = 'supabase-refresh-token';

/**
 * Check if we're running in Electron with secure storage available
 */
function hasSecureStorage(): boolean {
  return !!(window.electron?.secureStorage);
}

/**
 * Store the access token securely
 */
export async function setAccessToken(token: string): Promise<void> {
  if (hasSecureStorage()) {
    const result = await window.electron!.secureStorage.setToken(TOKEN_ACCOUNT, token);
    if (!result.success) {
      console.error('Failed to store access token securely:', result.error);
      // Don't fall back to localStorage for security
      throw new Error('Failed to store token securely');
    }
  } else {
    // Browser fallback (development only - not secure)
    console.warn('Using localStorage for token storage (not secure for production)');
    localStorage.setItem(TOKEN_ACCOUNT, token);
  }
}

/**
 * Get the stored access token
 */
export async function getAccessToken(): Promise<string | null> {
  if (hasSecureStorage()) {
    const result = await window.electron!.secureStorage.getToken(TOKEN_ACCOUNT);
    if (!result.success) {
      console.error('Failed to retrieve access token:', result.error);
      return null;
    }
    return result.token ?? null;
  } else {
    // Browser fallback (development only)
    return localStorage.getItem(TOKEN_ACCOUNT);
  }
}

/**
 * Delete the stored access token
 */
export async function deleteAccessToken(): Promise<void> {
  if (hasSecureStorage()) {
    const result = await window.electron!.secureStorage.deleteToken(TOKEN_ACCOUNT);
    if (!result.success) {
      console.error('Failed to delete access token:', result.error);
    }
  } else {
    localStorage.removeItem(TOKEN_ACCOUNT);
  }
}

/**
 * Store the refresh token securely
 */
export async function setRefreshToken(token: string): Promise<void> {
  if (hasSecureStorage()) {
    const result = await window.electron!.secureStorage.setToken(REFRESH_TOKEN_ACCOUNT, token);
    if (!result.success) {
      console.error('Failed to store refresh token securely:', result.error);
      throw new Error('Failed to store refresh token securely');
    }
  } else {
    console.warn('Using localStorage for refresh token storage (not secure for production)');
    localStorage.setItem(REFRESH_TOKEN_ACCOUNT, token);
  }
}

/**
 * Get the stored refresh token
 */
export async function getRefreshToken(): Promise<string | null> {
  if (hasSecureStorage()) {
    const result = await window.electron!.secureStorage.getToken(REFRESH_TOKEN_ACCOUNT);
    if (!result.success) {
      console.error('Failed to retrieve refresh token:', result.error);
      return null;
    }
    return result.token ?? null;
  } else {
    return localStorage.getItem(REFRESH_TOKEN_ACCOUNT);
  }
}

/**
 * Delete the stored refresh token
 */
export async function deleteRefreshToken(): Promise<void> {
  if (hasSecureStorage()) {
    const result = await window.electron!.secureStorage.deleteToken(REFRESH_TOKEN_ACCOUNT);
    if (!result.success) {
      console.error('Failed to delete refresh token:', result.error);
    }
  } else {
    localStorage.removeItem(REFRESH_TOKEN_ACCOUNT);
  }
}

/**
 * Clear all stored tokens
 */
export async function clearAllTokens(): Promise<void> {
  await deleteAccessToken();
  await deleteRefreshToken();
}

/**
 * Check if secure storage is available (for UI feedback)
 */
export function isSecureStorageAvailable(): boolean {
  return hasSecureStorage();
}

