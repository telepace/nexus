import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import icon from "data-base64:~assets/icon.png";
import { Storage } from "@plasmohq/storage";
import { Button } from "~/routes/ui/button";
import { ReloadIcon } from "@radix-ui/react-icons";

const LoginForm = () => {
  const navigation = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const storage = new Storage({ area: "local" });

  const validateForm = () => {
    if (!email) {
      setError("Email is required");
      return false;
    }
    if (!password) {
      setError("Password is required");
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return false;
    }
    
    setError("");
    return true;
  };

  const handleSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    try {
      // Call the API to authenticate with username/password
      const response = await fetch(`${process.env.PLASMO_PUBLIC_BACKEND_URL}/api/v1/login/access-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          username: email,
          password: password,
          grant_type: "password",
          scope: "",
          client_id: "",
          client_secret: "",
        }),
      });

      const data = await response.json();
      setLoading(false);

      if (response.ok && data.access_token) {
        // Store the token
        await storage.set("token", data.access_token);
        navigation("/");
      } else {
        setError(data.detail || "Incorrect email or password");
      }
    } catch (error) {
      console.error("Login error:", error);
      setLoading(false);
      setError("An error occurred. Please try again later.");
    }
  };

  const handleGoogleLogin = async () => {
    try {
      // This is a placeholder for Google Auth
      // In a real implementation, you'd use OAuth flow
      // For browser extensions, you'd typically use a popup window or redirect
      
      // Redirect to Google Auth
      chrome.tabs.create({
        url: `${process.env.PLASMO_PUBLIC_BACKEND_URL}/api/v1/login/google`,
      });
      
      // Note: You'll need to handle the token return from Google
      // This would typically involve listening for a callback message
      // For simplicity, this example doesn't implement the complete flow
    } catch (error) {
      console.error("Google login error:", error);
      setError("Failed to login with Google. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md mx-auto space-y-8">
        <div className="flex flex-col items-center space-y-2">
          <div className="bg-gray-800 p-3 rounded-full ring-2 ring-gray-700 shadow-lg">
            <img className="w-12 h-12" src={icon} alt="Nexus" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-white mt-4">Nexus</h1>
        </div>

        <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-xl border border-gray-700 p-6">
          <div className="space-y-6">
            <h2 className="text-xl font-medium text-white">Login to your account</h2>
            <p className="text-gray-400 text-sm">
              Access your Nexus account to use the extension
            </p>

            <Button
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-gray-800 py-2 px-4 rounded-md transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
                <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                  <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                  <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                  <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                  <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                </g>
              </svg>
              Continue with Google
            </Button>

            <div className="relative flex items-center justify-center py-2">
              <div className="border-t border-gray-700 w-full absolute"></div>
              <div className="bg-gray-800 px-4 relative z-10 text-sm text-gray-400">or</div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-gray-300">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-white placeholder:text-gray-500"
                  placeholder="Enter your email"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-gray-300">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-white placeholder:text-gray-500"
                  placeholder="Enter your password"
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm mt-1">{error}</p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-teal-600 hover:bg-teal-500 text-white py-2 px-4 rounded-md transition-colors"
              >
                {loading ? (
                  <>
                    <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  "Log In"
                )}
              </Button>
            </form>

            <div className="text-center mt-4">
              <p className="text-sm text-gray-400">
                Don't have an account?{" "}
                <a 
                  onClick={() => navigation("/register")}
                  className="text-teal-400 hover:text-teal-300 hover:underline cursor-pointer"
                >
                  Sign up
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm; 