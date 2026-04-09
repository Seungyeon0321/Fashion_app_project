import { ApiResponseDto } from '../dto/api-response.dto.js';

export function ok<T>(data: T): ApiResponseDto<T> {
  return { success: true, data };
}

export function fail(
  code: string,
  message: string,
  details?: unknown,
): ApiResponseDto<never> {
  return { success: false, error: { code, message, details } };
}

