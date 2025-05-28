"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

/**
 * Renders a user settings page with user profile management and configuration tabs.
 *
 * This component handles user authentication, profile editing, and displays various settings sections
 * such as profile, password, appearance, notifications, and privacy. It manages state for loading,
 * error handling, and form submissions.
 *
 * @returns A React element representing the user settings page.
 */
export default function SettingsPage() {
  const { user, isLoading, error, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

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
    } catch {
      setUpdateError(true);
      setUpdateSuccess(false);

      // Clear error message after 3 seconds
      setTimeout(() => {
        setUpdateError(false);
      }, 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <p>Loading user data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>
            Error loading user data: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertDescription>
            You are not logged in. Please login to view this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">User Settings</h1>

      {updateSuccess && (
        <Alert variant="default" className="mb-6">
          <AlertDescription>
            Your profile has been updated successfully.
          </AlertDescription>
        </Alert>
      )}

      {updateError && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            There was an error updating your profile.
          </AlertDescription>
        </Alert>
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
            <TabsContent value="profile" className="mt-0">
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
                          disabled={isSubmitting}
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          defaultValue={user.email}
                          disabled={isSubmitting}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsEditing(false)}
                          disabled={isSubmitting}
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
                      <p className="text-muted-foreground">{user.email}</p>
                    </div>
                    <Button onClick={() => setIsEditing(true)}>Edit</Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="password" className="mt-0">
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
            </TabsContent>

            <TabsContent value="appearance" className="mt-0">
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
            </TabsContent>

            <TabsContent value="notifications" className="mt-0">
              <div aria-label="Notifications">
                <h2 className="text-xl font-semibold mb-4">
                  Notification Settings
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via email
                      </p>
                    </div>
                    <Switch id="email-notifications" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Application Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications in the app
                      </p>
                    </div>
                    <Switch id="app-notifications" />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="privacy" className="mt-0">
              <div aria-label="Privacy">
                <h2 className="text-xl font-semibold mb-4">Privacy Settings</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Data Sharing</p>
                      <p className="text-sm text-muted-foreground">
                        Allow anonymized data sharing
                      </p>
                    </div>
                    <Switch id="data-sharing" />
                  </div>
                  <div className="mt-8">
                    <h3 className="text-lg font-medium text-destructive mb-2">
                      Delete Account
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      This action cannot be undone. It will permanently delete
                      your account.
                    </p>
                    <Button variant="destructive">Delete Account</Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
