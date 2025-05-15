"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Bell, Mail, MessageSquare, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  icon: React.ReactNode;
}

export function NotificationsForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [emailSettings, setEmailSettings] = useState<NotificationSetting[]>([
    {
      id: "new-features",
      title: "New Features",
      description: "Receive notifications about new features and updates.",
      enabled: true,
      icon: <Bell className="h-5 w-5 text-primary" />,
    },
    {
      id: "account-activity",
      title: "Account Activity",
      description: "Get important notifications about your account activity.",
      enabled: true,
      icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
    },
    {
      id: "marketing",
      title: "Marketing & Promotions",
      description:
        "Stay updated with marketing communications and promotional offers.",
      enabled: false,
      icon: <Mail className="h-5 w-5 text-blue-500" />,
    },
  ]);

  const [appSettings, setAppSettings] = useState<NotificationSetting[]>([
    {
      id: "in-app-notifications",
      title: "In-App Notifications",
      description: "Show notifications within the application.",
      enabled: true,
      icon: <MessageSquare className="h-5 w-5 text-green-500" />,
    },
    {
      id: "sound-alerts",
      title: "Sound Alerts",
      description: "Play sound when notifications arrive.",
      enabled: false,
      icon: <Bell className="h-5 w-5 text-purple-500" />,
    },
  ]);

  const toggleSetting = (type: "email" | "app", id: string) => {
    if (type === "email") {
      setEmailSettings((prev) =>
        prev.map((setting) =>
          setting.id === id
            ? { ...setting, enabled: !setting.enabled }
            : setting,
        ),
      );
    } else {
      setAppSettings((prev) =>
        prev.map((setting) =>
          setting.id === id
            ? { ...setting, enabled: !setting.enabled }
            : setting,
        ),
      );
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      // API call would go here
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call

      toast({
        title: "Notification settings updated",
        description: "Your notification preferences have been saved.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to save notification settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Notification Settings</h2>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-8">
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <Mail className="mr-2 h-5 w-5" />
              Email Notifications
            </h3>
            <p className="text-muted-foreground mb-4">
              Configure which emails you'd like to receive from us.
            </p>

            <div className="space-y-4">
              {emailSettings.map((setting) => (
                <Card key={setting.id}>
                  <CardContent className="p-4 flex items-start justify-between">
                    <div className="flex items-start gap-4 pt-1">
                      {setting.icon}
                      <div>
                        <h4 className="font-medium">{setting.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {setting.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`email-${setting.id}`}
                        checked={setting.enabled}
                        onCheckedChange={() =>
                          toggleSetting("email", setting.id)
                        }
                      />
                      <Label htmlFor={`email-${setting.id}`}>
                        {setting.enabled ? "On" : "Off"}
                      </Label>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <Bell className="mr-2 h-5 w-5" />
              Application Notifications
            </h3>
            <p className="text-muted-foreground mb-4">
              Manage how you receive notifications within the application.
            </p>

            <div className="space-y-4">
              {appSettings.map((setting) => (
                <Card key={setting.id}>
                  <CardContent className="p-4 flex items-start justify-between">
                    <div className="flex items-start gap-4 pt-1">
                      {setting.icon}
                      <div>
                        <h4 className="font-medium">{setting.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {setting.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`app-${setting.id}`}
                        checked={setting.enabled}
                        onCheckedChange={() => toggleSetting("app", setting.id)}
                      />
                      <Label htmlFor={`app-${setting.id}`}>
                        {setting.enabled ? "On" : "Off"}
                      </Label>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
