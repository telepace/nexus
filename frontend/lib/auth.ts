import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Types for user data
export interface User {
  id: string;
  full_name: string | null;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  avatar_url?: string;
}

// Type for auth context
export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  updateUser: (userData: Partial<User>) => Promise<void>;
  login: (token: string) => void;
  logout: () => void;
}

// Client-side hook
export function useAuth(): AuthContextType {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const router = useRouter();

  const fetchUser = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = getCookie("accessToken");
      if (!token) {
        console.log("No access token found");
        setIsLoading(false);
        return;
      }
      
      // In a real implementation, you would fetch from your API
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      console.log(`Fetching user data from ${apiUrl}/api/v1/users/me`);
      
      const response = await fetch(`${apiUrl}/api/v1/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", response.status, errorText);
        throw new Error(`Failed to fetch user data: ${response.status} ${errorText}`);
      }

      const userData = await response.json();
      console.log("User data fetched successfully:", userData);
      setUser(userData);
    } catch (err) {
      console.error("Error in fetchUser:", err);
      setError(
        err instanceof Error ? err : new Error("An unknown error occurred"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    try {
      const token = getCookie("accessToken");
      if (!token) {
        throw new Error("No access token found");
      }
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${apiUrl}/api/v1/users/me`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update user data: ${response.status} ${errorText}`);
      }

      const updatedUser = await response.json();
      setUser(updatedUser);
    } catch (err) {
      console.error("Error in updateUser:", err);
      setError(
        err instanceof Error ? err : new Error("An unknown error occurred"),
      );
      throw err;
    }
  };

  const login = (token: string) => {
    // Store the token in a cookie
    document.cookie = `accessToken=${token};path=/;max-age=${60 * 60 * 24 * 7}`; // 7 days
    console.log("Access token stored in cookie");
    // Fetch user data after login
    fetchUser();
  };

  const logout = () => {
    // Clear the token
    document.cookie = "accessToken=;path=/;max-age=0";
    console.log("Access token cleared");
    // Reset user
    setUser(null);
    // Redirect to login page
    router.push("/login");
  };

  useEffect(() => {
    console.log("Auth hook mounted, checking for token");
    const token = getCookie("accessToken");
    if (token) {
      console.log("Token found, fetching user");
      fetchUser();
    } else {
      console.log("No token found");
      setIsLoading(false);
    }
  }, []);

  return {
    user,
    isLoading,
    error,
    updateUser,
    login,
    logout,
  };
}

// Helper to get cookie value on client side
function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift();
  }
  return undefined;
}
