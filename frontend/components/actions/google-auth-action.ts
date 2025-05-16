"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Redirects the user to the backend Google OAuth login endpoint
 * This is the recommended approach as it keeps OAuth secrets on the backend
 */
export async function initiateGoogleLogin() {
  // Get the backend API URL from environment variables
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
  
  // Redirect to the backend Google OAuth endpoint
  redirect(`${apiUrl}/api/v1/login/google`);
}

/**
 * Process Google OAuth login token received from the backend
 * This is called by the frontend callback page when the backend redirects back with a token
 */
export async function processGoogleAuthToken(token: string) {
  if (!token) {
    redirect("/login?error=no_token");
    return;
  }

  try {
    // Store the token in a cookie
    const cookieStore = await cookies();
    cookieStore.set("accessToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    // Redirect to the dashboard
    redirect("/dashboard");
  } catch (error) {
    console.error("Error processing Google auth token:", error);
    redirect("/login?error=token_processing_error");
  }
} 