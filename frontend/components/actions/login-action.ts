"use server";

import { cookies } from "next/headers";

import { loginAccessToken } from "@/app/clientService";
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
      message: "Please correct the errors below.",
    };
  }

  const { username, password } = validatedFields.data;

  const input = {
    body: {
      username,
      password,
      // Ensure we're sending the data in the format expected by the API
      grant_type: "password",
      scope: "",
      client_id: "",
      client_secret: "",
    },
  };

  try {
    const { data, error } = await loginAccessToken(input);
    
    // Handle API specific errors
    if (error) {
      console.error("Login API error:", error);
      
      // Check for specific validation errors
      if (error.detail) {
        // Process validation errors here
        return { 
          server_validation_error: "Validation failed",
          message: "Login failed. Please check your input and try again."
        };
      }
      
      // For any other error types
      return { 
        server_validation_error: getErrorMessage(error),
        message: "Login failed. Please check your credentials and try again."
      };
    }
    
    // Check if data exists and has access_token
    if (!data || !data.access_token) {
      console.error("Login API returned invalid response:", data);
      return {
        server_error: "The server returned an invalid response.",
        message: "Login failed. Please try again later."
      };
    }
    
    // Set the access token in a cookie with appropriate security settings
    const cookieStore = await cookies();
    cookieStore.set("accessToken", data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });
  } catch (err) {
    console.error("Login error:", err);
    return {
      server_error: "An unexpected error occurred. Please try again later.",
      message: "Server error occurred. Please try again later."
    };
  }
  
  // Redirect to dashboard on successful login
  redirect("/dashboard");
}

// This function could be expanded to support Google login in the backend
export async function handleGoogleLogin(googleToken: string) {
  // This would be implemented to call your backend API endpoint for Google auth
  // For now, it's a placeholder for future implementation
  try {
    // Example implementation (commented out):
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
    console.error('Google login error:', error);
    return {
      success: false,
      error: 'Google authentication failed. Please try again.',
    };
  }
}
