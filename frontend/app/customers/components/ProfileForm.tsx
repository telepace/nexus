"use client";

import { useState } from "react";
import { User } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Edit2 } from "lucide-react";

interface ProfileFormProps {
  user: User;
  onSubmit: (data: Partial<User>) => Promise<void>;
}

export function ProfileForm({ user, onSubmit }: ProfileFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user.full_name || "");
  const [email, setEmail] = useState(user.email || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState("");

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFullName(user.full_name || "");
    setEmail(user.email || "");
    setEmailError("");
    setIsEditing(false);
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError("Email is required");
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError("Invalid email format");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        full_name: fullName,
        email,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get the initials from user's full name or fallback to 'U'
  const getInitials = () => {
    if (!user.full_name) return "U";
    return user.full_name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">My Profile</h2>

      <div className="grid md:grid-cols-[200px_1fr] gap-8">
        <div className="flex flex-col items-center">
          <Avatar className="h-32 w-32">
            <AvatarImage
              src={user.avatar_url || ""}
              alt={user.full_name || "User"}
            />
            <AvatarFallback className="text-2xl">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <Button variant="outline" size="sm" className="mt-4">
            <Upload className="mr-2 h-4 w-4" />
            Upload photo
          </Button>
        </div>

        <div>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="full_name">Full name</Label>
                {isEditing ? (
                  <Input
                    id="full_name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isSubmitting}
                  />
                ) : (
                  <div className="flex items-center h-10 px-3 rounded-md border border-input bg-background">
                    {user.full_name || "Not set"}
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                {isEditing ? (
                  <>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        validateEmail(e.target.value);
                      }}
                      disabled={isSubmitting}
                      className={emailError ? "border-destructive" : ""}
                    />
                    {emailError && (
                      <p className="text-sm text-destructive">{emailError}</p>
                    )}
                  </>
                ) : (
                  <div className="flex items-center h-10 px-3 rounded-md border border-input bg-background">
                    {user.email}
                  </div>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="created_at">Member since</Label>
                <div className="flex items-center h-10 px-3 rounded-md border border-input bg-background">
                  {new Date(user.created_at).toLocaleDateString()}
                </div>
              </div>

              {isEditing ? (
                <div className="flex justify-start space-x-2 mt-2">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  onClick={handleEdit}
                  className="mt-2 w-fit"
                >
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
