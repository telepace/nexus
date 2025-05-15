"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { User } from "@/lib/auth";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Shield, Trash2, Lock, Fingerprint, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface PrivacyFormProps {
  user: User;
}

export function PrivacyForm({ user }: PrivacyFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const [privacySettings, setPrivacySettings] = useState({
    dataSharing: true,
    analyticsTracking: true,
    usageStatistics: false,
    marketingCookies: false,
  });

  const handleToggle = (setting: keyof typeof privacySettings) => {
    setPrivacySettings((prev) => ({
      ...prev,
      [setting]: !prev[setting],
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      // API call would go here
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call

      toast({
        title: "Privacy settings updated",
        description: "Your privacy preferences have been saved.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to save privacy settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);

    try {
      // API call would go here
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate API call

      toast({
        title: "Account scheduled for deletion",
        description: "Your account will be permanently deleted within 30 days.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Deletion failed",
        description:
          "Failed to delete account. Please try again later or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Privacy & Data</h2>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-8">
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Data Privacy
            </h3>
            <p className="text-muted-foreground mb-4">
              Control how your data is used and shared across our services.
            </p>

            <Card className="mb-4">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <Fingerprint className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <Label htmlFor="data-sharing" className="font-medium">
                        Data Sharing
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Allow us to share anonymized data with our partners
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="data-sharing"
                    checked={privacySettings.dataSharing}
                    onCheckedChange={() => handleToggle("dataSharing")}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <Eye className="h-5 w-5 text-purple-500 mt-0.5" />
                    <div>
                      <Label
                        htmlFor="analytics-tracking"
                        className="font-medium"
                      >
                        Analytics Tracking
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Enable analytics to help us improve our products
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="analytics-tracking"
                    checked={privacySettings.analyticsTracking}
                    onCheckedChange={() => handleToggle("analyticsTracking")}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <Lock className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <Label htmlFor="usage-statistics" className="font-medium">
                        Usage Statistics
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Collect information about how you use our application
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="usage-statistics"
                    checked={privacySettings.usageStatistics}
                    onCheckedChange={() => handleToggle("usageStatistics")}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <Lock className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div>
                      <Label
                        htmlFor="marketing-cookies"
                        className="font-medium"
                      >
                        Marketing Cookies
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Allow use of cookies for personalized marketing
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="marketing-cookies"
                    checked={privacySettings.marketingCookies}
                    onCheckedChange={() => handleToggle("marketingCookies")}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center text-destructive">
              <Trash2 className="mr-2 h-5 w-5" />
              Delete Account
            </h3>
            <p className="text-muted-foreground mb-4">
              Permanently delete your account and all associated data. This
              cannot be undone.
            </p>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="mt-2">
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    your account and remove all your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isDeletingAccount}
                  >
                    {isDeletingAccount ? "Deleting..." : "Delete Account"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
