"use server";

import { redirect } from "next/navigation";

import { registerUser } from "@/app/clientService";

import { registerSchema } from "@/lib/definitions";
import { getErrorMessage } from "@/lib/utils";

export async function register(prevState: unknown, formData: FormData) {
  const validatedFields = registerSchema.safeParse({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    full_name: formData.get("full_name") as string || null,
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { email, password, full_name } = validatedFields.data;

  const input = {
    body: {
      email,
      password,
      full_name,
    },
  };
  try {
    const { error } = await registerUser(input);
    if (error) {
      return { server_validation_error: getErrorMessage(error) };
    }
  } catch (err) {
    console.error("Registration error:", err);
    return {
      server_error: "An unexpected error occurred. Please try again later.",
    };
  }
  redirect(`/login`);
}
