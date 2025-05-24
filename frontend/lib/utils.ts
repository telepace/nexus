import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class values using clsx and twMerge.
 */
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
 * Extracts an error message from an error object or string.
 *
 * This function checks if the input is a string and returns it directly.
 * If the input is an object, it attempts to retrieve the error message from the `detail` or `message` property.
 * If these properties are not present, it tries to stringify the object. If stringification fails, it returns a generic error message.
 *
 * @param error - The error object or string from which to extract the message.
 * @returns A formatted error message string.
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
