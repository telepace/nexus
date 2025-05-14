import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import axios from "axios"
import React, { StrictMode } from "react"
import ReactDOM from "react-dom/client"
import { routeTree } from "./routeTree.gen"

import { ApiError, OpenAPI } from "./client"
import { CustomProvider } from "./components/ui/provider"

// Set base URL for admin panel API
OpenAPI.BASE = import.meta.env.VITE_ADMIN_API_URL || import.meta.env.VITE_API_URL
OpenAPI.TOKEN = async () => {
  return localStorage.getItem("admin_access_token") || ""
}

// Add axios response interceptor to handle new API response format
axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.data) {
      // Handle errors in the new API response format
      const responseData = error.response.data;
      
      // Check if it contains an error field
      if (responseData.error) {
        // Use the content of the error field as the error message
        error.message = responseData.error;
      }
    }
    return Promise.reject(error);
  }
);

const handleApiError = (error: Error) => {
  if (error instanceof ApiError && [401, 403].includes(error.status)) {
    localStorage.removeItem("admin_access_token")
    window.location.href = "/admin/login"
  }
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleApiError,
  }),
  mutationCache: new MutationCache({
    onError: handleApiError,
  }),
})

const router = createRouter({ routeTree })
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

// Admin panel root element
ReactDOM.createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CustomProvider>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </CustomProvider>
  </StrictMode>,
)
