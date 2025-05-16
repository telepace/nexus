import { sendToBackground } from "@plasmohq/messaging"

/**
 * This content script handles the OAuth callback flow,
 * intercepting both success and error states.
 */
(function() {
  // Check if we're on a relevant page
  const isCallbackPage = window.location.href.includes("/login/google/callback") || 
                        window.location.href.includes("/api/v1/login/google/callback")
  
  const isErrorPage = window.location.href.includes("/login?error=token_processing_error") ||
                      window.location.href.includes("/login?error=no_token")
  
  if (!isCallbackPage && !isErrorPage) {
    return
  }
  
  console.log("OAuth receiver content script activated")
  
  // If we're on the error page, try to recover the flow
  if (isErrorPage) {
    handleErrorRecovery()
    return
  }
  
  // Otherwise, we're on the callback page with a token
  handleCallbackPage()
  
  /**
   * Handles the case where we're on the error page
   */
  function handleErrorRecovery() {
    console.log("Detected error page, attempting recovery")
    
    // Show a user friendly message
    document.body.innerHTML = `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1>Authentication Handling</h1>
        <p>We're processing your login. You'll be redirected to the dashboard shortly...</p>
      </div>
    `
    
    // Wait briefly then redirect to dashboard
    setTimeout(() => {
      navigateToDashboard()
    }, 1500)
  }
  
  /**
   * Handles the callback page with token
   */
  function handleCallbackPage() {
    // Extract token from URL
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get("token")
    
    if (!token) {
      console.error("No token found in URL")
      return
    }
    
    // Show processing message first
    document.body.innerHTML = `
      <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1>Authentication Processing</h1>
        <p>Please wait while we complete your sign-in...</p>
      </div>
    `
    
    // Process the token through our background script
    processTokenAndRedirect(token)
  }
  
  /**
   * Processes the token and handles redirection
   */
  async function processTokenAndRedirect(token) {
    try {
      // Send token to background script
      const response = await sendToBackground({
        name: "google-auth",
        body: { token }
      })
      
      // Update UI based on result
      if (response.success) {
        document.body.innerHTML = `
          <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>Authentication Successful!</h1>
            <p>Redirecting you to the dashboard...</p>
          </div>
        `
        
        // Redirect to dashboard
        setTimeout(() => {
          navigateToDashboard()
        }, 1000)
      } else {
        // Show error but still try to redirect
        document.body.innerHTML = `
          <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>Authentication Notice</h1>
            <p>Message: ${response.message || 'Unknown status'}</p>
            <p>We'll still try to navigate you to the dashboard...</p>
          </div>
        `
        
        // Try to redirect anyway after a delay
        setTimeout(() => {
          navigateToDashboard()
        }, 2000)
      }
    } catch (error) {
      console.error("Failed to process token:", error)
      
      document.body.innerHTML = `
        <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>Authentication Error</h1>
          <p>An error occurred: ${error.message || 'Unknown error'}</p>
          <p>We'll still try to navigate you to the dashboard...</p>
        </div>
      `
      
      // Try to redirect anyway after a longer delay
      setTimeout(() => {
        navigateToDashboard()
      }, 3000)
    }
  }
  
  /**
   * Utility function to try multiple navigation methods to dashboard
   */
  function navigateToDashboard() {
    const dashboardUrl = "http://localhost:3000/dashboard"
    
    console.log("Attempting to navigate to dashboard:", dashboardUrl)
    
    // Try multiple navigation methods
    try {
      // Method 1: Direct location change
      window.location.href = dashboardUrl
    } catch (err) {
      console.log("Direct navigation failed, trying window.open", err)
      
      try {
        // Method 2: Open in new tab
        const newTab = window.open(dashboardUrl, "_self")
        
        if (!newTab) {
          throw new Error("Could not open new tab")
        }
      } catch (err2) {
        console.error("All automatic navigation methods failed", err2)
        
        // Method 3: Show clickable link
        document.body.innerHTML = `
          <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>Navigation Failed</h1>
            <p>We couldn't automatically redirect you to the dashboard.</p>
            <p>Please click the button below:</p>
            <a href="${dashboardUrl}" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background-color: #4285f4; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Go to Dashboard
            </a>
          </div>
        `
      }
    }
  }
})(); 