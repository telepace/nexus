import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readUserMe } from "@/app/clientService";

/**
 * Middleware function to handle authentication and user setup redirection.
 *
 * This middleware checks for an access token in cookies, validates its effectiveness,
 * and redirects users based on their setup completion status. It logs various steps
 * and handles errors by redirecting to the login page.
 *
 * @param request - The Next.js request object containing the URL and cookies.
 * @returns A NextResponse object representing either a redirection or the original request.
 */
export async function middleware(request: NextRequest) {
  console.log("[Middleware] 处理路径:", request.nextUrl.pathname);

  // 检查cookies
  const token = request.cookies.get("accessToken");
  console.log("[Middleware] accessToken:", token ? "存在" : "不存在");

  if (!token) {
    console.log("[Middleware] 没有token，重定向到登录页面");
    // 保存原始URL以便登录后重定向回来
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const options = {
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
    };

    console.log("[Middleware] 验证token有效性");
    const { data, error } = await readUserMe(options as any);

    if (error) {
      console.log("[Middleware] 验证失败:", error);
      return NextResponse.redirect(new URL("/login", request.url));
    }

    console.log("[Middleware] 验证成功, 用户:", data?.email);

    const { pathname, search } = request.nextUrl;

    // Scenario 1: Setup not complete
    if (data.is_setup_complete === false && pathname !== "/setup") {
      console.log("[Middleware] Setup not complete, redirecting to /setup");
      const setupRedirectUrl = new URL("/setup", request.url);
      // Preserve original intended path as callbackUrl for after setup
      setupRedirectUrl.searchParams.set("callbackUrl", pathname + search);
      return NextResponse.redirect(setupRedirectUrl);
    }

    // Scenario 2: Setup complete but user is on setup page
    if (data.is_setup_complete === true && pathname === "/setup") {
      console.log(
        "[Middleware] Setup complete, redirecting from /setup to /content-library",
      );
      return NextResponse.redirect(new URL("/content-library", request.url));
    }

    const response = NextResponse.next();
    return response;
  } catch (e) {
    console.error("[Middleware] 处理请求时出错:", e);
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/settings/:path*",
    "/setup",
    "/favorites/:path*",
    "/prompts/:path*",
    "/content-library/:path*",
  ],
};
