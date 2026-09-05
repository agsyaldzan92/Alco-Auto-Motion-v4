export const API_KEY_STORAGE_KEY = 'alco_gemini_api_key';
const API_KEY_CHANGE_EVENT = 'alco_gemini_api_key_changed';

export interface KeyStatus {
  hasCustomKey: boolean;
  apiKey: string | null;
  maskedKey: string;
  source: 'custom' | 'server';
}

/**
 * Get stored Gemini API Key from localStorage
 */
export function getStoredApiKey(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const key = localStorage.getItem(API_KEY_STORAGE_KEY);
    return key && key.trim().length > 0 ? key.trim() : null;
  } catch (err) {
    console.error('Failed to read API key from localStorage:', err);
    return null;
  }
}

/**
 * Save Gemini API Key to localStorage and notify listeners
 */
export function setStoredApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    const cleanKey = key.trim();
    if (cleanKey) {
      localStorage.setItem(API_KEY_STORAGE_KEY, cleanKey);
    } else {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
    // Broadcast change event within same window
    window.dispatchEvent(new CustomEvent(API_KEY_CHANGE_EVENT, { detail: cleanKey }));
  } catch (err) {
    console.error('Failed to save API key to localStorage:', err);
  }
}

/**
 * Remove custom Gemini API Key from localStorage
 */
export function removeStoredApiKey(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(API_KEY_CHANGE_EVENT, { detail: null }));
  } catch (err) {
    console.error('Failed to remove API key from localStorage:', err);
  }
}

/**
 * Check if custom API key is present
 */
export function hasCustomApiKey(): boolean {
  return !!getStoredApiKey();
}

/**
 * Format a masked preview of the API key (e.g. AIzaSy...7X9a or custom token)
 */
export function getMaskedApiKey(key?: string | null): string {
  const targetKey = key !== undefined ? key : getStoredApiKey();
  if (!targetKey) return '';
  if (targetKey.length <= 8) return '••••••••';
  const start = targetKey.slice(0, 6);
  const end = targetKey.slice(-4);
  return `${start}...${end}`;
}

/**
 * Construct fetch headers with active Gemini API key if available
 */
export function getApiHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };

  const customKey = getStoredApiKey();
  if (customKey) {
    headers['x-gemini-api-key'] = customKey;
    headers['X-Gemini-API-Key'] = customKey;
    headers['x-api-key'] = customKey;
  }

  return headers;
}

/**
 * Subscribe to API key changes across components and storage events
 */
export function subscribeApiKeyChanges(callback: (key: string | null) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (e: Event) => {
    const customEvent = e as CustomEvent<string | null>;
    callback(customEvent.detail ?? getStoredApiKey());
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === API_KEY_STORAGE_KEY) {
      callback(getStoredApiKey());
    }
  };

  window.addEventListener(API_KEY_CHANGE_EVENT, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(API_KEY_CHANGE_EVENT, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}

/**
 * Validate an API key against server test endpoint
 */
export async function validateApiKey(apiKeyToTest?: string): Promise<{
  valid: boolean;
  message: string;
  model?: string;
}> {
  const key = apiKeyToTest !== undefined ? apiKeyToTest.trim() : getStoredApiKey();
  if (!key) {
    return { valid: false, message: 'Masukkan API key terlebih dahulu.' };
  }

  if (key.length < 20) {
    return { valid: false, message: 'API key terlalu pendek (minimal 20 karakter). Periksa kembali key Anda.' };
  }

  try {
    const res = await fetch('/api/validate-key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gemini-api-key': key,
        'X-Gemini-API-Key': key,
        'x-api-key': key,
      },
      body: JSON.stringify({ testKey: key }),
    });

    const data = await res.json();
    if (!res.ok || !data.valid) {
      return {
        valid: false,
        message: data.message || 'Key tidak valid, expired, atau tidak punya akses ke model Gemini. Coba buat ulang API key di Google AI Studio.',
      };
    }

    return {
      valid: true,
      message: data.message || 'API key terhubung dan siap digunakan!',
      model: data.model,
    };
  } catch (_err: any) {
    return {
      valid: false,
      message: 'Key tidak valid, expired, atau tidak punya akses ke model Gemini. Coba buat ulang API key di Google AI Studio.',
    };
  }
}
