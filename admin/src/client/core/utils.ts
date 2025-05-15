import { ApiError } from './ApiError';

/**
 * Checks if the given value is an API response (error)
 */
export function isApiResponse(value: unknown): boolean {
  return value instanceof ApiError || 
    (typeof value === 'object' && 
     value !== null && 
     ('status' in value || 'body' in value));
}

/**
 * Extracts error message from an API response
 */
export function extractApiResponseError(response: unknown): string | null {
  if (!response) return null;
  
  if (response instanceof ApiError) {
    // Handle ApiError instance
    return response.message || response.statusText || `Error ${response.status}`;
  }
  
  // Handle raw response object
  const obj = response as any;
  if (obj.body) {
    if (typeof obj.body === 'string') return obj.body;
    if (typeof obj.body === 'object') {
      return obj.body.message || obj.body.error || obj.body.detail || JSON.stringify(obj.body);
    }
  }
  
  if (obj.message) return obj.message;
  if (obj.error) return obj.error;
  if (obj.detail) return obj.detail;
  
  return null;
} 