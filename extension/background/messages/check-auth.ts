import { Storage } from "@plasmohq/storage"
import type { PlasmoMessaging } from "@plasmohq/messaging"

/**
 * Message handler for checking authentication status
 * and validating the stored token.
 */
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  try {
    const storage = new Storage({ area: "local" })
    const token = await storage.get("token")
    
    if (!token) {
      return res.send({
        isAuthenticated: false,
        message: "No token found"
      })
    }
    
    // Validate the token with the backend
    const response = await fetch(
      `${process.env.PLASMO_PUBLIC_BACKEND_URL}/api/v1/users/me`,
      {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      }
    )
    
    if (!response.ok) {
      // Token is invalid or expired
      await storage.remove("token")
      return res.send({
        isAuthenticated: false,
        message: "Invalid or expired token"
      })
    }
    
    // Token is valid, return user info
    const userData = await response.json()
    
    res.send({
      isAuthenticated: true,
      user: userData,
      message: "Authenticated"
    })
  } catch (error) {
    console.error("Auth check error:", error)
    res.send({
      isAuthenticated: false,
      message: error.message || "Authentication check failed"
    })
  }
}

export default handler 