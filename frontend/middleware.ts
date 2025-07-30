import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readUserMe } from "@/app/clientService";

// Supported locales
const locales = ['en', 'zh'];
const defaultLocale = 'en';

function getLocaleFromPath(pathname: string): { locale: string; pathnameWithoutLocale: string } {
  const [, firstSegment, ...rest] = pathname.split('/');
  
  if (locales.includes(firstSegment)) {
    return {
      locale: firstSegment,
      pathnameWithoutLocale: '/' + rest.join('/')
    };
  }
  
  return {
    locale: defaultLocale,
    pathnameWithoutLocale: pathname
  };
}

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

  const { pathname } = request.nextUrl;
  const { locale, pathnameWithoutLocale } = getLocaleFromPath(pathname);

  // Handle locale redirection for root path
  if (pathname === "/") {
    console.log("[Middleware] 根路径，直接放行");
    return NextResponse.next();
  }

  // Handle locale redirection for paths without locale prefix
  if (!locales.includes(pathname.split('/')[1])) {
    console.log("[Middleware] 路径缺少locale前缀，重定向到:", `/${defaultLocale}${pathname}`);
    return NextResponse.redirect(new URL(`/${defaultLocale}${pathname}`, request.url));
  }

  // Skip locale processing for auth pages and API routes
  if (pathnameWithoutLocale.startsWith('/login') || 
      pathnameWithoutLocale.startsWith('/register') || 
      pathnameWithoutLocale.startsWith('/password-recovery') ||
      pathnameWithoutLocale.startsWith('/api') ||
      pathnameWithoutLocale.startsWith('/share')) {
    return NextResponse.next();
  }

  // 检查cookies
  const token = request.cookies.get("accessToken");
  console.log("[Middleware] accessToken:", token ? "存在" : "不存在");

  if (!token) {
    console.log("[Middleware] 没有token，重定向到登录页面");
    // 保存原始URL以便登录后重定向回来
    const redirectUrl = new URL(`/${locale}/login`, request.url);
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
      return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
    }

    console.log("[Middleware] 验证成功, 用户:", data?.email);

    const { search } = request.nextUrl;

    // Scenario 1: Setup not complete
    if (data.is_setup_complete === false && pathnameWithoutLocale !== "/setup") {
      console.log("[Middleware] Setup not complete, redirecting to /setup");
      const setupRedirectUrl = new URL(`/${locale}/setup`, request.url);
      // Preserve original intended path as callbackUrl for after setup
      setupRedirectUrl.searchParams.set("callbackUrl", pathname + search);
      return NextResponse.redirect(setupRedirectUrl);
    }

    // Scenario 2: Setup complete but user is on setup page
    if (data.is_setup_complete === true && pathnameWithoutLocale === "/setup") {
      console.log(
        "[Middleware] Setup complete, redirecting from /setup to /content-library",
      );
      return NextResponse.redirect(new URL(`/${locale}/content-library`, request.url));
    }

    const response = NextResponse.next();
    return response;
  } catch (e) {
    console.error("[Middleware] 处理请求时出错:", e);
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/home/:path*",
    "/settings/:path*",
    "/setup",
    "/favorites/:path*",
    "/prompts/:path*",
    "/content-library/:path*",
    "/(en|zh)/dashboard/:path*",
    "/(en|zh)/home/:path*",
    "/(en|zh)/settings/:path*",
    "/(en|zh)/setup",
    "/(en|zh)/favorites/:path*",
    "/(en|zh)/prompts/:path*",
    "/(en|zh)/content-library/:path*",
  ],
};
