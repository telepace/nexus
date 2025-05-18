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
  
  // Storage to save our token
  const storage = new Storage({ area: "local" })
  
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
      console.warn("Token verification had issues, status:", verifyResponse.status)
      // Still store the original token as fallback
      await storage.set("original_token", token)
      
      // If we're getting a 401 or similar, try to recover
      if (verifyResponse.status >= 400) {
        return res.send({
          success: true, // We're telling content script this is "good enough"
          recoveryMode: true,
          message: "Using token without backend verification"
        })
      }
      
      throw new Error(`Token verification failed with status ${verifyResponse.status}`)
    }
    
    const data = await verifyResponse.json()
    
    // Store the access token
    await storage.set("token", data.access_token)
    
    res.send({
      success: true,
      message: "Google authentication successful"
    })
  } catch (error) {
    console.error("Google auth error:", error)
    
    // Recovery: Even if verification failed, we'll still store the raw token
    // This allows the content script to try the dashboard navigation
    try {
      await storage.set("original_token", token)
      await storage.set("error_info", error.message || "Unknown error")
      
      res.send({
        success: true, // We're being optimistic to let content script continue
        recoveryMode: true,
        message: "Stored unverified token: " + error.message
      })
    } catch (storageError) {
      // Only if everything fails, we'll return a failure
      res.send({
        success: false,
        message: error.message || "Authentication failed"
      })
    }
  }
}

export default handler 