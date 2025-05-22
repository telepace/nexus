import * as z from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password should be at least 8 characters.") // Minimum length validation
  .refine((password) => /[A-Z]/.test(password), {
    message: "Password should contain at least one uppercase letter.",
  }) // At least one uppercase letter
  .refine((password) => /[!@#$%^&*(),.?":{}|<>]/.test(password), {
    message: "Password should contain at least one special character.",
  });

export const passwordResetConfirmSchema = z
  .object({
    password: passwordSchema,
    passwordConfirm: z.string(),
    token: z.string({ required_error: "Token is required" }),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwords must match.",
    path: ["passwordConfirm"],
  });

export const registerSchema = z.object({
  email: z.string().email("Invalid email").min(1, "Email is required"),
  password: passwordSchema,
  full_name: z.string().optional().nullable(),
});

export const loginSchema = z.object({
  username: z.string().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

export const updatePasswordSchema = z.object({
  current_password: z
    .string()
    .min(8, "Current password must be at least 8 characters")
    .max(40, "Current password must be less than 40 characters"),
  new_password: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .max(40, "New password must be less than 40 characters"),
});

export const itemSchema = z.object({
  title: z.string().min(1, "Title is required").max(255, "Title too long"),
  description: z
    .string()
    .max(255, "Description too long")
    .optional()
    .nullable(),
});
