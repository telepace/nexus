"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CustomersPage() {
  const { user, isLoading, error, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    // For debugging purposes
    const checkAuth = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
        const token = document.cookie
          .split('; ')
          .find(row => row.startsWith('accessToken='))
          ?.split('=')[1];
        
        if (token) {
          const response = await fetch(`${apiUrl}/api/v1/users/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          
          const data = await response.json();
          setDebugInfo({
            status: response.status,
            data: data,
            token: token ? 'Present' : 'Missing',
          });
        } else {
          setDebugInfo({ token: 'Missing' });
        }
      } catch (e) {
        setDebugInfo({ error: e instanceof Error ? e.message : String(e) });
      }
    };
    
    checkAuth();
  }, []);

  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      full_name: formData.get("full_name") as string,
      email: formData.get("email") as string,
    };

    try {
      await updateUser(data);
      setUpdateSuccess(true);
      setUpdateError(false);
      setIsEditing(false);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setUpdateSuccess(false);
      }, 3000);
    } catch (error) {
      setUpdateError(true);
      setUpdateSuccess(false);

      // Clear error message after 3 seconds
      setTimeout(() => {
        setUpdateError(false);
      }, 3000);
    }
  };

  if (isLoading) {
    return <div className="container mx-auto py-8">
      <p className="text-center">Loading user data...</p>
    </div>;
  }

  if (error) {
    return <div className="container mx-auto py-8">
      <Alert variant="destructive">
        <AlertDescription>Error loading user data: {error.message}</AlertDescription>
      </Alert>
      <div className="mt-4 p-4 border rounded bg-gray-50">
        <h3 className="font-medium">Debug Info:</h3>
        <pre className="text-sm mt-2 overflow-auto">{JSON.stringify(debugInfo, null, 2)}</pre>
      </div>
    </div>;
  }

  if (!user) {
    return <div className="container mx-auto py-8">
      <Alert variant="warning">
        <AlertDescription>You are not logged in. Please login to view this page.</AlertDescription>
      </Alert>
      <div className="mt-4 p-4 border rounded bg-gray-50">
        <h3 className="font-medium">Debug Info:</h3>
        <pre className="text-sm mt-2 overflow-auto">{JSON.stringify(debugInfo, null, 2)}</pre>
      </div>
    </div>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">User Settings</h1>

      {updateSuccess && (
        <Alert variant="success">
          <AlertDescription>Your profile has been updated successfully.</AlertDescription>
        </Alert>
      )}

      {updateError && (
        <Alert variant="destructive">
          <AlertDescription>There was an error updating your profile.</AlertDescription>
        </Alert>
      )}

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-2 border rounded bg-gray-50 text-xs">
          <details>
            <summary>Debug Info</summary>
            <pre>{JSON.stringify({ user, debugInfo }, null, 2)}</pre>
          </details>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="profile" aria-label="My profile">
            My profile
          </TabsTrigger>
          <TabsTrigger value="password" aria-label="Password">
            Password
          </TabsTrigger>
          <TabsTrigger value="appearance" aria-label="Appearance">
            Appearance
          </TabsTrigger>
          <TabsTrigger value="notifications" aria-label="Notifications">
            Notifications
          </TabsTrigger>
          <TabsTrigger value="privacy" aria-label="Privacy">
            Privacy
          </TabsTrigger>
        </TabsList>

        <Card className="mt-6">
          <CardContent className="p-6">
            {activeTab === "profile" && (
              <div aria-label="My profile">
                {isEditing ? (
                  <form onSubmit={handleProfileUpdate}>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="full_name">Full name</Label>
                        <Input
                          id="full_name"
                          name="full_name"
                          defaultValue={user.full_name || ""}
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          defaultValue={user.email}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit">Save</Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsEditing(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-semibold">
                        {user.full_name}
                      </h2>
                      <p>{user.email}</p>
                    </div>
                    <Button onClick={() => setIsEditing(true)}>Edit</Button>
                  </div>
                )}
              </div>
            )}

            {activeTab === "password" && (
              <div aria-label="Password">
                <h2 className="text-xl font-semibold mb-4">Change Password</h2>
                <form className="space-y-4">
                  <div>
                    <Label htmlFor="current_password">Current Password</Label>
                    <Input
                      id="current_password"
                      type="password"
                      placeholder="Current Password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new_password">New Password</Label>
                    <Input
                      id="new_password"
                      type="password"
                      placeholder="New Password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirm_password">Confirm Password</Label>
                    <Input
                      id="confirm_password"
                      type="password"
                      placeholder="Confirm Password"
                    />
                  </div>
                  <Button type="submit">Save</Button>
                </form>
              </div>
            )}

            {activeTab === "appearance" && (
              <div aria-label="Appearance">
                <h2 className="text-xl font-semibold mb-4">Appearance</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="theme-system">System</Label>
                    <input
                      type="radio"
                      id="theme-system"
                      name="theme"
                      value="system"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="theme-light">Light</Label>
                    <input
                      type="radio"
                      id="theme-light"
                      name="theme"
                      value="light"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="theme-dark">Dark</Label>
                    <input
                      type="radio"
                      id="theme-dark"
                      name="theme"
                      value="dark"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div aria-label="Notifications">
                <h2 className="text-xl font-semibold mb-4">
                  Notification Settings
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-gray-500">
                        Receive notifications via email
                      </p>
                    </div>
                    <Switch id="email-notifications" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Application Notifications</p>
                      <p className="text-sm text-gray-500">
                        Receive notifications in the app
                      </p>
                    </div>
                    <Switch id="app-notifications" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "privacy" && (
              <div aria-label="Privacy">
                <h2 className="text-xl font-semibold mb-4">Privacy Settings</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Data Sharing</p>
                      <p className="text-sm text-gray-500">
                        Allow anonymized data sharing
                      </p>
                    </div>
                    <Switch id="data-sharing" />
                  </div>
                  <div className="mt-8">
                    <h3 className="text-lg font-medium text-red-600 mb-2">
                      Delete Account
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      This action cannot be undone. It will permanently delete
                      your account.
                    </p>
                    <Button variant="destructive">Delete Account</Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
