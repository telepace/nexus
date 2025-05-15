import { sendToBackground } from "@plasmohq/messaging"

/**
 * This content script listens for messages from the OAuth callback page
 * and forwards them to the extension's background script.
 */
(function() {
  // We only want this script to run on our OAuth callback page
  if (!window.location.href.includes("/api/v1/login/google/callback")) {
    return
  }
  
  // Function to extract token from page content or URL params
  const extractTokenFromPage = () => {
    // Check if the token is in URL fragment or query params
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get("token")
    
    if (token) {
      return token
    }
    
    // Look for token in page content (if the API embeds it in the page)
    const tokenElement = document.getElementById("auth-token")
    if (tokenElement) {
      return tokenElement.textContent.trim()
    }
    
    return null
  }
  
  // Extract token and send to background
  const processToken = async () => {
    const token = extractTokenFromPage()
    
    if (!token) {
      console.error("No authentication token found")
      return
    }
    
    try {
      // Send token to background script
      const response = await sendToBackground({
        name: "google-auth",
        body: { token }
      })
      
      if (response.success) {
        // Token was processed successfully, close this tab
        // First show a success message
        document.body.innerHTML = `
          <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>Authentication Successful</h1>
            <p>You've been successfully authenticated with Google. You can now close this tab and return to the extension.</p>
          </div>
        `
        
        // After a short delay, close the tab
        setTimeout(() => {
          window.close()
        }, 3000)
      } else {
        // Show error
        document.body.innerHTML = `
          <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>Authentication Failed</h1>
            <p>Error: ${response.message}</p>
            <p>Please close this tab and try again.</p>
          </div>
        `
      }
    } catch (error) {
      console.error("Failed to process token:", error)
    }
  }
  
  // Process when the DOM is fully loaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", processToken)
  } else {
    processToken()
  }
})(); 