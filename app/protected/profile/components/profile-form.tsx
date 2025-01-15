"use client";

import { useState } from "react";
import { useStatus } from "./status-context";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusMessage } from "./status-message";
import { updateBasicProfile } from "@/app/actions/profile";

import { Database } from "@/types/database.types";
import { User } from "@supabase/supabase-js";

type Profile = Database["public"]["Tables"]["player_profiles"]["Row"] & {
  settings?: {
    notifications?: {
      email?: boolean;
      inGame?: boolean;
    };
    preferences?: {
      theme?: string;
      cardAnimation?: boolean;
    };
    display_name?: string;
  };
};

interface ProfileFormProps {
  user: User;
  profile: Profile;
}

export function ProfileForm({ user, profile }: ProfileFormProps) {
  const { setStatus } = useStatus();
  const getInitialDisplayName = (): string => {
    if (profile.settings?.display_name) {
      return profile.settings.display_name;
    }
    if (user.email) {
      return user.email.split("@")[0];
    }
    return "";
  };

  const [displayName, setDisplayName] = useState<string>(
    getInitialDisplayName()
  );
  const [avatarUrl, setAvatarUrl] = useState<string>(profile.avatar_url ?? "");

  const formAction = async (formData: FormData) => {
    try {
      const result = await updateBasicProfile(user.id, formData);
      setStatus({ 
        message: result.success || result.error || "An error occurred", 
        type: result.success ? "success" : "error" 
      });
      
      if (result.success) {
        setDisplayName(formData.get('display_name')?.toString() || getInitialDisplayName());
        setAvatarUrl(formData.get('avatar_url')?.toString() || '');
      }
    } catch (error) {
      setStatus({ message: "An unexpected error occurred", type: "error" });
    }
  };

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={String(user.email || "")}
            disabled
            className="bg-muted"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="display_name">Display Name</Label>
          <Input
            id="display_name"
            name="display_name"
            value={String(displayName)}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your display name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="avatar_url">Avatar URL</Label>
          <Input
            id="avatar_url"
            name="avatar_url"
            type="url"
            value={String(avatarUrl)}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://example.com/avatar.jpg"
          />
        </div>

        <SubmitButton>Update Profile</SubmitButton>
      </form>

      <StatusMessage />
    </div>
  );
}
