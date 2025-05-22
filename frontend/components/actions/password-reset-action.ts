"use server";

import {
  resetForgotPassword as recoverPassword,
  resetResetPassword as resetPassword,
} from "@/app/clientService";
import { redirect } from "next/navigation";
import { passwordResetConfirmSchema } from "@/lib/definitions";
import { getErrorMessage } from "@/lib/utils";

export async function passwordReset(prevState: unknown, formData: FormData) {
  const email = formData.get("email") as string;

  // 基本的电子邮件验证
  if (!email || !email.includes("@")) {
    return {
      errors: {
        email: ["请输入有效的电子邮件地址"],
      },
    };
  }

  const input = {
    path: {
      email,
    },
  };

  try {
    const { error } = await recoverPassword(input);
    if (error) {
      return { server_validation_error: getErrorMessage(error) };
    }
    return { message: "密码重置链接已发送到您的邮箱，请查收。" };
  } catch (err) {
    console.error("Password reset error:", err);
    return {
      server_error: "发生了意外错误，请稍后再试。",
    };
  }
}

export async function passwordResetConfirm(
  prevState: unknown,
  formData: FormData,
) {
  const validatedFields = passwordResetConfirmSchema.safeParse({
    token: formData.get("resetToken") as string,
    password: formData.get("password") as string,
    passwordConfirm: formData.get("passwordConfirm") as string,
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { token, password } = validatedFields.data;
  const input = {
    body: {
      token,
      new_password: password,
    },
  };
  try {
    const { error } = await resetPassword(input);
    if (error) {
      return { server_validation_error: getErrorMessage(error) };
    }

    // 成功后先返回成功消息，延迟重定向让用户看到成功提示
    return { message: "密码已成功重置！正在跳转到登录页面..." };
  } catch (err) {
    console.error("Password reset confirmation error:", err);
    return {
      server_error: "发生了意外错误，请稍后再试。",
    };
  }
}

// 成功后的重定向函数，用于客户端使用
export async function redirectAfterSuccess() {
  redirect("/login");
}
