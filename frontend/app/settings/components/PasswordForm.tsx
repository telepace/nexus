"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { encryptPassword } from "../../../lib/encryption"; // Adjusted path
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Eye, EyeOff } from "lucide-react";

export function PasswordForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [errors, setErrors] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const validateForm = () => {
    const newErrors = {
      current_password: "",
      new_password: "",
      confirm_password: "",
    };
    let isValid = true;

    // Current password validation
    if (!formData.current_password) {
      newErrors.current_password = "Current password is required";
      isValid = false;
    }

    // New password validation
    if (!formData.new_password) {
      newErrors.new_password = "New password is required";
      isValid = false;
    } else if (formData.new_password.length < 8) {
      newErrors.new_password = "Password must be at least 8 characters";
      isValid = false;
    } else if (formData.new_password === formData.current_password) {
      newErrors.new_password =
        "New password cannot be the same as the current one";
      isValid = false;
    }

    // Confirm password validation
    if (formData.new_password !== formData.confirm_password) {
      newErrors.confirm_password = "The passwords do not match";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Here you would make an API call to update the password
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const response = await fetch(`${apiUrl}/api/v1/users/me/password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${document.cookie.split("accessToken=")[1]?.split(";")[0]}`,
        },
        body: JSON.stringify({
          current_password: (() => {
            try {
              return encryptPassword(formData.current_password);
            } catch (error) {
              console.error("Failed to encrypt current password:", error);
              throw new Error("Password encryption failed. Please try again.");
            }
          })(),
          new_password: (() => {
            try {
              return encryptPassword(formData.new_password);
            } catch (error) {
              console.error("Failed to encrypt new password:", error);
              throw new Error("Password encryption failed. Please try again.");
            }
          })(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to update password");
      }

      // Reset form
      setFormData({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });

      toast({
        title: "Password Updated",
        description: "Your password has been updated successfully.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error updating password:", error);
      toast({
        title: "Update Failed",
        description:
          error instanceof Error
            ? error.message
            : "There was an error updating your password.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user types
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Change Password</h2>

      <form onSubmit={handleSubmit} className="max-w-md">
        <div className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="current_password">Current Password</Label>
            <div className="relative">
              <Input
                id="current_password"
                name="current_password"
                type={showCurrentPassword ? "text" : "password"}
                placeholder="Current Password"
                value={formData.current_password}
                onChange={handleChange}
                disabled={isSubmitting}
                className={
                  errors.current_password ? "border-destructive pr-10" : "pr-10"
                }
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400"
              >
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.current_password && (
              <p className="text-sm text-destructive">
                {errors.current_password}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="new_password">New Password</Label>
            <div className="relative">
              <Input
                id="new_password"
                name="new_password"
                type={showNewPassword ? "text" : "password"}
                placeholder="New Password"
                value={formData.new_password}
                onChange={handleChange}
                disabled={isSubmitting}
                className={
                  errors.new_password ? "border-destructive pr-10" : "pr-10"
                }
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400"
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.new_password && (
              <p className="text-sm text-destructive">{errors.new_password}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="confirm_password">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirm_password"
                name="confirm_password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={formData.confirm_password}
                onChange={handleChange}
                disabled={isSubmitting}
                className={
                  errors.confirm_password ? "border-destructive pr-10" : "pr-10"
                }
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {errors.confirm_password && (
              <p className="text-sm text-destructive">
                {errors.confirm_password}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? "Updating..." : "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
}
