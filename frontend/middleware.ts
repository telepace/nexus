import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readUserMe } from "@/app/clientService";

// Supported locales
const locales = ['en', 'zh'];
const defaultLocale = 'en';

function getLocaleFromPath(pathname: string): { locale: string; pathnameWithoutLocale: string } {
  const [, firstSegment, ...rest] = pathname.split('/');
  
  // Check if first segment is a non-english locale
  if (locales.includes(firstSegment) && firstSegment !== 'en') {
    return {
      locale: firstSegment,
      pathnameWithoutLocale: '/' + rest.join('/')
    };
  }
  
  // For root paths and /en/ paths, treat as English
  if (firstSegment === 'en') {
    return {
      locale: 'en',
      pathnameWithoutLocale: '/' + rest.join('/')
    };
  }
  
  // Default: treat root paths as English
  return {
    locale: 'en',
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
    console.log("[Middleware] 根路径，直接放行 (默认英文)");
    return NextResponse.next();
  }

  // Handle /en/ paths - optionally redirect to root paths
  if (pathname.startsWith('/en/')) {
    const pathWithoutEn = pathname.replace('/en', '');
    console.log("[Middleware] /en/ 路径，重定向到根路径:", pathWithoutEn);
    return NextResponse.redirect(new URL(pathWithoutEn, request.url));
  }

  // Handle paths without locale prefix - treat as English (no redirect needed)
  const firstSegment = pathname.split('/')[1];
  if (!locales.includes(firstSegment)) {
    console.log("[Middleware] 根路径访问，识别为英文");
    // No redirect needed, treat as English root path
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
    const loginPath = locale === 'en' ? '/login' : `/${locale}/login`;
    const redirectUrl = new URL(loginPath, request.url);
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
      const loginPath = locale === 'en' ? '/login' : `/${locale}/login`;
      return NextResponse.redirect(new URL(loginPath, request.url));
    }

    console.log("[Middleware] 验证成功, 用户:", data?.email);

    const { search } = request.nextUrl;

    // Scenario 1: Setup not complete
    if (data.is_setup_complete === false && pathnameWithoutLocale !== "/setup") {
      console.log("[Middleware] Setup not complete, redirecting to /setup");
      const setupPath = locale === 'en' ? '/setup' : `/${locale}/setup`;
      const setupRedirectUrl = new URL(setupPath, request.url);
      // Preserve original intended path as callbackUrl for after setup
      setupRedirectUrl.searchParams.set("callbackUrl", pathname + search);
      return NextResponse.redirect(setupRedirectUrl);
    }

    // Scenario 2: Setup complete but user is on setup page
    if (data.is_setup_complete === true && pathnameWithoutLocale === "/setup") {
      console.log(
        "[Middleware] Setup complete, redirecting from /setup to /content-library",
      );
      const contentLibraryPath = locale === 'en' ? '/content-library' : `/${locale}/content-library`;
      return NextResponse.redirect(new URL(contentLibraryPath, request.url));
    }

    const response = NextResponse.next();
    return response;
  } catch (e) {
    console.error("[Middleware] 处理请求时出错:", e);
    const loginPath = locale === 'en' ? '/login' : `/${locale}/login`;
    return NextResponse.redirect(new URL(loginPath, request.url));
  }
}

export const config = {
  matcher: [
    "/",
    // English routes (root paths)
    "/dashboard/:path*",
    "/home/:path*",
    "/settings/:path*",
    "/setup",
    "/favorites/:path*",
    "/prompts/:path*",
    "/content-library/:path*",
    "/login",
    "/register",
    "/password-recovery/:path*",
    // Legacy /en/ routes (will be redirected)
    "/en/:path*",
    // Other language routes
    "/(zh)/dashboard/:path*",
    "/(zh)/home/:path*",
    "/(zh)/settings/:path*",
    "/(zh)/setup",
    "/(zh)/favorites/:path*",
    "/(zh)/prompts/:path*",
    "/(zh)/content-library/:path*",
    "/(zh)/login",
    "/(zh)/register",
    "/(zh)/password-recovery/:path*",
  ],
};
