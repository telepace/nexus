import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useState } from "react"

import {
  type Body_login_login_access_token as AccessToken,
  type ApiError,
  LoginService,
  OpenAPI,
  type UserPublic,
  type UserRegister,
  UsersService,
} from "@/client"
import { request } from "@/client/core/request"
import { handleError } from "@/utils"

const isLoggedIn = () => {
  return localStorage.getItem("access_token") !== null
}

// 自定义logout API调用，确保包含授权令牌
const callLogoutAPI = async (): Promise<void> => {
  const token = localStorage.getItem("access_token")
  if (!token) {
    throw new Error("No access token found")
  }

  return request(OpenAPI, {
    method: "POST",
    url: "/api/v1/logout",
    headers: {
      Authorization: `Bearer ${token}`
    },
  })
}

const useAuth = () => {
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: user } = useQuery<UserPublic | null, Error>({
    queryKey: ["currentUser"],
    queryFn: UsersService.readUserMe,
    enabled: isLoggedIn(),
  })

  const signUpMutation = useMutation({
    mutationFn: (data: UserRegister) =>
      UsersService.registerUser({ requestBody: data }),

    onSuccess: () => {
      navigate({ to: "/login" })
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
    },
  })

  const login = async (data: AccessToken) => {
    const response = await LoginService.loginAccessToken({
      formData: data,
    })
    localStorage.setItem("access_token", response.access_token)
  }

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: () => {
      navigate({ to: "/" })
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
  })

  const logout = async () => {
    try {
      // 尝试调用后端的logout接口，确保请求完成
      await callLogoutAPI()
      console.log("成功调用登出API")
    } catch (error) {
      console.error("登出API调用失败:", error)
    } finally {
      // 不管API调用成功或失败，都清除本地token并跳转
      localStorage.removeItem("access_token")
      queryClient.clear() // 清除所有缓存的查询数据
      navigate({ to: "/login" })
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

export { isLoggedIn }
export default useAuth
