"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function logout() {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    redirect("/login");
    return;
  }

  // Call the logout endpoint
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    const response = await fetch(`${apiUrl}/api/v1/logout`, {
      method: "POST",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Logout failed:", await response.text());
    } else {
      console.log("Logout successful");
      // You could log the successful response if needed
      // const result = await response.json();
      // console.log("Logout response:", result);
    }
  } catch (error) {
    console.error("Error during logout:", error);
  }

  // Remove the access token cookie regardless of API response
  cookieStore.delete("accessToken");

  // Redirect to login page
  redirect("/login");
}
