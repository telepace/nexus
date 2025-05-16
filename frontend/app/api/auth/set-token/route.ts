import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    
    if (!token) {
      return NextResponse.json(
        { error: "No token provided" },
        { status: 400 }
      );
    }
    
    // 设置access token cookie
    const cookieStore = await cookies();
    cookieStore.set("accessToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7天
      path: "/",
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error setting token:", error);
    return NextResponse.json(
      { error: "Failed to process token" },
      { status: 500 }
    );
  }
} 