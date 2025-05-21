"use server";

import { cookies } from "next/headers";

import { authJwtLogin } from "@/app/clientService";
import { redirect } from "next/navigation";
import { loginSchema } from "@/lib/definitions";
import { getErrorMessage } from "@/lib/utils";

export async function login(prevState: unknown, formData: FormData) {
  const validatedFields = loginSchema.safeParse({
    username: formData.get("username") as string,
    password: formData.get("password") as string,
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { username, password } = validatedFields.data;

  const input = {
    body: {
      username,
      password,
      // 确保发送需要的参数
      grant_type: "password",
      scope: "",
      client_id: "",
      client_secret: "",
    },
  };

  try {
    const { data, error } = await authJwtLogin(input);

    // 处理API特定错误
    if (error) {
      console.error("Login API error:", error);

      // 检查特定的验证错误
      if (error.detail) {
        // 返回验证错误
        return {
          server_validation_error: error.detail,
        };
      }

      // 处理其他类型错误
      return {
        server_validation_error: getErrorMessage(error),
      };
    }

    // 检查data是否存在并有access_token
    if (!data || !data.access_token) {
      console.error("Login API returned invalid response:", data);
      return {
        server_error: "The server returned an invalid response.",
      };
    }

    // 在cookie中设置带有适当安全设置的访问令牌
    const cookieStore = await cookies();
    cookieStore.set("accessToken", data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7天
      path: "/",
    });
  } catch (err) {
    console.error("Login error:", err);
    return {
      server_error: "An unexpected error occurred. Please try again later.",
    };
  }

  // 成功登录后重定向到控制面板
  redirect("/dashboard");
}

// 此函数可扩展以支持后端的Google登录
export async function handleGoogleLogin() {
  // 以后实现的占位符
  try {
    // 示例实现（注释掉）:
    /*
    const response = await fetch('/api/auth/google/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token: googleToken }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Google authentication failed');
    }

    const cookieStore = await cookies();
    cookieStore.set("accessToken", data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });
    */

    return { success: true };
  } catch (error) {
    console.error("Google login error:", error);
    return {
      success: false,
      error: "Google authentication failed. Please try again.",
    };
  }
}
