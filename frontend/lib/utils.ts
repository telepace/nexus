import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Type for objects that might have error properties
 */
interface ErrorLike {
  detail?: string;
  message?: string;
}

/**
 * Extract error message from error object
 * @param error - Error object that may contain detail, message, or be a string
 * @returns Formatted error message string
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    const errorObj = error as ErrorLike;

    // Type guard for objects with detail property
    if ("detail" in error && typeof errorObj.detail === "string") {
      return errorObj.detail;
    }

    // Type guard for objects with message property
    if ("message" in error && typeof errorObj.message === "string") {
      return errorObj.message;
    }

    // If error is an object but doesn't have detail or message,
    // try to stringify it or return a generic message
    try {
      return JSON.stringify(error);
    } catch {
      return "An error occurred";
    }
  }

  return "An unknown error occurred";
}
