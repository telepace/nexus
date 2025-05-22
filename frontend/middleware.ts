import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readUserMe } from "@/app/clientService";

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
    const response = NextResponse.next();
    return response;
  } catch (e) {
    console.error("[Middleware] 处理请求时出错:", e);
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/customers/:path*"],
};
