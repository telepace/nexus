import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Google OAuth 2.0 configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/auth/google/callback`;

// Google OAuth 2.0 token URL
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USER_INFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

export async function GET(request: NextRequest) {
  // Extract the authorization code and state from the URL
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  
  // Check if there was an error during the OAuth process
  if (error) {
    console.error("Google OAuth error:", error);
    return NextResponse.redirect(new URL("/login?error=oauth_error", request.url));
  }
  
  // Verify the state parameter to prevent CSRF attacks
  const cookiesStore = await cookies();
  const storedState = cookiesStore.get("google_oauth_state")?.value;
  if (!storedState || storedState !== state) {
    console.error("Invalid state parameter");
    return NextResponse.redirect(new URL("/login?error=invalid_state", request.url));
  }
  
  // Clear the state cookie as it's no longer needed
  await cookiesStore.set({
    name: "google_oauth_state",
    value: "",
    maxAge: 0,
    path: "/"
  });
  
  if (!code) {
    console.error("No authorization code provided");
    return NextResponse.redirect(new URL("/login?error=no_code", request.url));
  }
  
  try {
    // Exchange the authorization code for an access token
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error("Token exchange error:", errorData);
      return NextResponse.redirect(new URL("/login?error=token_exchange", request.url));
    }
    
    const tokenData = await tokenResponse.json();
    const { access_token, id_token } = tokenData;
    
    // Get the user's information using the access token
    const userResponse = await fetch(GOOGLE_USER_INFO_URL, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });
    
    if (!userResponse.ok) {
      console.error("Failed to get user info");
      return NextResponse.redirect(new URL("/login?error=user_info", request.url));
    }
    
    const userData = await userResponse.json();
    
    // Here you would typically:
    // 1. Check if the user exists in your database
    // 2. If not, create a new user
    // 3. Generate a session or JWT token
    
    // For now, we'll just simulate this by using the backend login API
    // with a special "google_auth" flag

    // In a real implementation, you'd need to call your backend API to handle this
    // For example:
    /*
    const loginResponse = await fetch(`${process.env.BACKEND_URL}/auth/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: userData.email,
        google_id: userData.sub,
        name: userData.name,
      }),
    });
    
    const loginData = await loginResponse.json();
    
    // Set the access token in a cookie
    await cookiesStore.set({
      name: "accessToken", 
      value: loginData.access_token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });
    */
    
    // For demonstration purposes, we'll just set a temporary cookie and redirect
    // This should be replaced with your actual authentication logic
    await cookiesStore.set({
      name: "accessToken", 
      value: "temporary_google_auth_token",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // 1 day
      path: "/",
    });
    
    // Redirect to the dashboard
    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(new URL("/login?error=server_error", request.url));
  }
} 