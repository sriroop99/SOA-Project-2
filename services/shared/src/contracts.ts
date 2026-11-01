import { ApiResponse } from './types.js';

export function makeSuccessResponse<T>(data: T, meta?: ApiResponse['meta'], message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    meta,
    timestamp: new Date().toISOString(),
  };
}

export function makeErrorResponse(code: string, message: string, details?: any): ApiResponse<null> {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: new Date().toISOString(),
  };
}

export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 8000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}
