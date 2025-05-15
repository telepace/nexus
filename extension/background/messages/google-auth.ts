import { Storage } from "@plasmohq/storage"
import type { PlasmoMessaging } from "@plasmohq/messaging"

/**
 * Message handler for processing Google authentication callbacks.
 * This allows the OAuth flow to communicate with the extension.
 */
const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const { token } = req.body
  
  if (!token) {
    return res.send({
      success: false,
      message: "No token provided"
    })
  }
  
  try {
    // Verify the token with the backend
    const verifyResponse = await fetch(
      `${process.env.PLASMO_PUBLIC_BACKEND_URL}/api/v1/login/verify-google-token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ token })
      }
    )
    
    if (!verifyResponse.ok) {
      throw new Error("Token verification failed")
    }
    
    const data = await verifyResponse.json()
    
    // Store the access token
    const storage = new Storage({ area: "local" })
    await storage.set("token", data.access_token)
    
    res.send({
      success: true,
      message: "Google authentication successful"
    })
  } catch (error) {
    console.error("Google auth error:", error)
    res.send({
      success: false,
      message: error.message || "Authentication failed"
    })
  }
}

export default handler 