import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// Google OAuth 2.0 configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/auth/google/callback`;
const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// Google OAuth 2.0 token URL
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USER_INFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

export async function GET(request: NextRequest) {
  // 检查环境变量是否配置
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.error("Google OAuth credentials not configured");
    return NextResponse.redirect(
      new URL("/login?error=oauth_config_error", request.url),
    );
  }

  // Extract the authorization code and state from the URL
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // 添加日志调试
  console.log(
    `OAuth Callback received: code=${!!code}, state=${!!state}, error=${error || "none"}`,
  );

  // Check if there was an error during the OAuth process
  if (error) {
    console.error("Google OAuth error:", error);
    return NextResponse.redirect(
      new URL(`/login?error=oauth_error&details=${error}`, request.url),
    );
  }

  // Verify the state parameter to prevent CSRF attacks
  const cookiesStore = await cookies();
  const storedState = cookiesStore.get("google_oauth_state")?.value;
  if (!storedState || storedState !== state) {
    console.error("Invalid state parameter", {
      storedState,
      receivedState: state,
    });
    return NextResponse.redirect(
      new URL("/login?error=invalid_state", request.url),
    );
  }

  // Clear the state cookie as it's no longer needed
  await cookiesStore.set({
    name: "google_oauth_state",
    value: "",
    maxAge: 0,
    path: "/",
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
      const errorData = await tokenResponse.text();
      console.error("Token exchange error:", errorData);
      return NextResponse.redirect(
        new URL(
          `/login?error=token_exchange&details=${encodeURIComponent(errorData)}`,
          request.url,
        ),
      );
    }

    const tokenData = await tokenResponse.json();
    const { access_token } = tokenData;

    // Get the user's information using the access token
    const userResponse = await fetch(GOOGLE_USER_INFO_URL, {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!userResponse.ok) {
      const errorData = await userResponse.text();
      console.error("Failed to get user info:", errorData);
      return NextResponse.redirect(
        new URL(
          `/login?error=user_info&details=${encodeURIComponent(errorData)}`,
          request.url,
        ),
      );
    }

    // Parse user data
    const userData = await userResponse.json();
    console.log("Received user data:", userData);

    // 调用后端认证 API
    try {
      const backendAuthUrl = `${BACKEND_URL}/api/v1/auth/google-callback`;
      console.log(`Calling backend auth API: ${backendAuthUrl}`);

      const backendResponse = await fetch(backendAuthUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: access_token,
          user_info: userData,
        }),
      });

      if (!backendResponse.ok) {
        const backendError = await backendResponse.text();
        console.error("Backend auth error:", backendError);
        return NextResponse.redirect(
          new URL(
            `/login?error=backend_auth&details=${encodeURIComponent(backendError)}`,
            request.url,
          ),
        );
      }

      const authData = await backendResponse.json();

      // 将后端返回的 token 设置为 cookie
      await cookiesStore.set({
        name: "accessToken",
        value: authData.access_token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      });

      // Redirect to the dashboard
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } catch (backendError) {
      console.error("Backend communication error:", backendError);
      // 临时登录处理 - 实际应用中，应该始终使用后端验证
      await cookiesStore.set({
        name: "accessToken",
        value: "temporary_google_auth_token",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24, // 1 day
        path: "/",
      });

      // Redirect to the dashboard
      return NextResponse.redirect(
        new URL("/dashboard?temp=true", request.url),
      );
    }
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(
      new URL(
        `/login?error=server_error&details=${encodeURIComponent(String(error))}`,
        request.url,
      ),
    );
  }
}
