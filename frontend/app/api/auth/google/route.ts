import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Google OAuth 2.0 configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/auth/google/callback`;

// Google OAuth 2.0 authorization URL
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

export async function GET(request: NextRequest) {
  // Generate a random state value to prevent CSRF attacks
  const state = Math.random().toString(36).substring(2);
  
  // Store the state in a cookie for verification later
  // In Next.js 15, cookies() returns a Promise that needs to be awaited
  const cookiesStore = await cookies();
  await cookiesStore.set({
    name: "google_oauth_state",
    value: state,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  // Construct the authorization URL
  const authUrl = new URL(GOOGLE_AUTH_URL);
  authUrl.searchParams.append("client_id", GOOGLE_CLIENT_ID);
  authUrl.searchParams.append("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("scope", "openid email profile");
  authUrl.searchParams.append("state", state);
  authUrl.searchParams.append("prompt", "select_account");
  
  // Redirect the user to Google's authorization page
  return NextResponse.redirect(authUrl.toString());
} 