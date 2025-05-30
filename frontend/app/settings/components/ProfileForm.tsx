"use client";

import { useState } from "react";
import { User } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Upload,
  Edit2,
  RefreshCw,
  Palette,
  User as UserIcon,
} from "lucide-react";
import NiceAvatar, { genConfig } from "react-nice-avatar";

interface ProfileFormProps {
  user: User;
  onSubmit: (data: Partial<User>) => Promise<void>;
}

/**
 * ProfileForm component for managing user profile information and avatars.
 *
 * This component renders a form for editing user profiles, including fields for full name and email.
 * It also provides options to switch between traditional and anime avatars, with functionalities to generate,
 * randomize, or use a traditional avatar. The component manages state for editing mode, form inputs,
 * validation errors, and avatar configurations. It handles form submission by validating the email and
 * calling the onSubmit prop with updated user data.
 *
 * @param user - The user object containing initial profile information.
 * @param onSubmit - A callback function to handle form submission with updated user data.
 */
export function ProfileForm({ user, onSubmit }: ProfileFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user.full_name || "");
  const [email, setEmail] = useState(user.email || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [animeAvatarConfig, setAnimeAvatarConfig] = useState(
    user.anime_avatar_config || null,
  );
  const [avatarType, setAvatarType] = useState<"traditional" | "anime">(
    user.anime_avatar_config ? "anime" : "traditional",
  );

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

  /**
   * Handles form submission by validating email, preparing user data,
   * and submitting it to an external handler.
   *
   * The function prevents default form behavior, checks if the email is valid,
   * sets a submitting state, constructs user data including optional anime avatar config,
   * submits the data using `onSubmit`, toggles editing mode on success,
   * logs errors on failure, and ensures the submitting state is reset.
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData: Partial<User> = {
        full_name: fullName,
        email,
      };

      // Include anime avatar config if it exists
      if (animeAvatarConfig) {
        submitData.anime_avatar_config = animeAvatarConfig;
      }

      await onSubmit(submitData);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Generates an anime avatar configuration and sets the avatar type to 'anime'.
   */
  const handleGenerateAnimeAvatar = () => {
    const newConfig = genConfig();
    setAnimeAvatarConfig(newConfig);
    setAvatarType("anime");
  };

  /**
   * Generates a new configuration and sets it as the anime avatar configuration.
   */
  const handleRandomizeAvatar = () => {
    const newConfig = genConfig();
    setAnimeAvatarConfig(newConfig);
  };

  /**
   * Sets avatar type to traditional and clears anime avatar configuration.
   */
  const handleUseTraditionalAvatar = () => {
    setAnimeAvatarConfig(null);
    setAvatarType("traditional");
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

  /**
   * Renders an avatar based on the type and configuration provided.
   *
   * This function checks if the avatarType is 'anime' and if there is a valid animeAvatarConfig.
   * If both conditions are met, it renders a NiceAvatar component with specific styling and config.
   * Otherwise, it renders a default Avatar component with an image or fallback text based on user data.
   */
  const renderAvatar = () => {
    if (avatarType === "anime" && animeAvatarConfig) {
      return (
        <div className="h-32 w-32 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
          <NiceAvatar
            style={{ width: "128px", height: "128px" }}
            {...animeAvatarConfig}
          />
        </div>
      );
    }

    return (
      <Avatar className="h-32 w-32">
        {user.avatar_url ? (
          <AvatarImage src={user.avatar_url} alt={user.full_name || "User"} />
        ) : null}
        <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
      </Avatar>
    );
  };

  /**
   * Renders avatar buttons based on the avatar type and configuration.
   */
  const renderAvatarButtons = () => {
    if (avatarType === "anime" && animeAvatarConfig) {
      return (
        <div className="mt-4 space-y-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRandomizeAvatar}
            className="w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Randomize Avatar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUseTraditionalAvatar}
            className="w-full"
          >
            <UserIcon className="mr-2 h-4 w-4" />
            Use Traditional Avatar
          </Button>
        </div>
      );
    }

    return (
      <div className="mt-4 space-y-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerateAnimeAvatar}
          className="w-full"
        >
          <Palette className="mr-2 h-4 w-4" />
          Generate Anime Avatar
        </Button>
        <Button variant="outline" size="sm" className="w-full">
          <Upload className="mr-2 h-4 w-4" />
          Upload photo
        </Button>
      </div>
    );
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">My Profile</h2>

      <div className="grid md:grid-cols-[200px_1fr] gap-8">
        <div className="flex flex-col items-center">
          {renderAvatar()}
          {renderAvatarButtons()}
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
