import { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
}

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T = unknown>() {
  const { token } = useAuth();
  const [state, setState] = useState<ApiState<T>>({ data: null, loading: false, error: null });

  const request = useCallback(async (url: string, options: ApiOptions = {}): Promise<T> => {
    setState({ data: null, loading: true, error: null });
    try {
      const res = await fetch(url, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || `Request failed: ${res.status}`);
      }

      if (res.status === 204) {
        setState({ data: null, loading: false, error: null });
        return null as T;
      }

      const data = await res.json() as T;
      setState({ data, loading: false, error: null });
      return data;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setState({ data: null, loading: false, error: msg });
      throw e;
    }
  }, [token]);

  return { ...state, request };
}

// Simple fetch helper for one-shot requests
export async function apiFetch<T>(url: string, token?: string | null, options: ApiOptions = {}): Promise<T> {
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }

  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}
