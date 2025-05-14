import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { client } from "@/app/openapi-client/sdk.gen";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("accessToken");

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const response = await fetch("/api/v1/users/me", {
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
    });

    if (!response.ok) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    
    return NextResponse.next();
  } catch (error) {
    console.error("Authentication error:", error);
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
