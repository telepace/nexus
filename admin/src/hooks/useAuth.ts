import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useState } from "react"

import {
  type Body_login_login_access_token as AccessToken,
  type ApiError,
  LoginService,
  type UserPublic,
  type UserRegister,
  UsersService,
  OpenAPI
} from "@/client"
import { handleError } from "@/utils"
import { request } from "@/client/core/request"

const isLoggedIn = () => {
  return localStorage.getItem("access_token") !== null
}

const isAdminLoggedIn = () => {
  return localStorage.getItem("admin_access_token") !== null
}

// Custom logout API call
const callLogoutAPI = async (isAdmin = false): Promise<void> => {
  return request(OpenAPI, {
    method: "POST",
    url: isAdmin ? "/api/v1/admin/logout" : "/api/v1/logout",
  })
}

const useAuth = (isAdmin = false) => {
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const tokenKey = isAdmin ? "admin_access_token" : "access_token"
  const loginRedirect = isAdmin ? "/admin" : "/"
  const logoutRedirect = isAdmin ? "/admin/login" : "/login"
  
  const { data: user } = useQuery<UserPublic | null, Error>({
    queryKey: ["currentUser", isAdmin ? "admin" : "user"],
    queryFn: isAdmin ? 
      () => UsersService.readUserMe() : 
      UsersService.readUserMe,
    enabled: isAdmin ? isAdminLoggedIn() : isLoggedIn(),
  })

  const signUpMutation = useMutation({
    mutationFn: (data: UserRegister) =>
      UsersService.registerUser({ requestBody: data }),

    onSuccess: () => {
      navigate({ to: logoutRedirect })
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })

  const login = async (data: AccessToken) => {
    const loginEndpoint = isAdmin ? 
      () => LoginService.loginAccessToken({ formData: data }) : 
      () => LoginService.loginAccessToken({ formData: data });
      
    const response = await loginEndpoint();
    localStorage.setItem(tokenKey, response.access_token)
  }

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: () => {
      navigate({ to: loginRedirect })
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
  })

  const logout = async () => {
    try {
      // Try to call the backend logout API
      await callLogoutAPI(isAdmin)
    } catch (error) {
      console.error('Logout API call failed:', error)
    } finally {
      // Clear local token and redirect regardless of API call success or failure
      localStorage.removeItem(tokenKey)
      queryClient.clear() // Clear all cached query data
      navigate({ to: logoutRedirect })
    }
  }

  return {
    signUpMutation,
    loginMutation,
    logout,
    user,
    error,
    resetError: () => setError(null),
  }
}

export { isLoggedIn, isAdminLoggedIn }
export default useAuth
