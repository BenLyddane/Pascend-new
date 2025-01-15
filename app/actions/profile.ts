'use server';

import { createClient } from "@/utils/supabase/server";

export async function updateBasicProfile(userId: string, formData: FormData) {
  const supabase = await createClient();

  // Get form data
  const display_name = formData.get("display_name")?.toString();
  const avatar_url = formData.get("avatar_url")?.toString();

  // Get current profile settings
  const { data: currentProfile } = await supabase
    .from("player_profiles")
    .select("settings")
    .eq("user_id", userId)
    .single();

  // Merge new settings with existing ones
  const settings = {
    ...currentProfile?.settings,
    display_name,
  };

  // Update profile settings
  const { error: profileError } = await supabase
    .from("player_profiles")
    .update({
      avatar_url,
      settings,
    })
    .eq("user_id", userId);

  if (profileError) {
    return { error: "Profile update failed" };
  }

  return { success: "Profile updated successfully" };
}


export async function updateSecuritySettings(userId: string, formData: FormData) {
  const supabase = await createClient();

  const password = formData.get("password")?.toString();
  const confirm_password = formData.get("confirm_password")?.toString();

  if (!password || !confirm_password) {
    return { error: "Please fill in all fields" };
  }

  if (password !== confirm_password) {
    return { error: "Passwords do not match" };
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return { error: "Failed to update password" };
  }

  return { success: "Password updated successfully" };
}


export async function updateSettings(userId: string, formData: FormData) {
  const supabase = await createClient();

  // Get form data
  const email_notifications = formData.get("email_notifications") === "on";
  const ingame_notifications = formData.get("ingame_notifications") === "on";
  const card_animation = formData.get("card_animation") === "on";
  const theme = formData.get("theme")?.toString() || "system";

  // Update profile settings
  const settings = {
    notifications: {
      email: email_notifications,
      inGame: ingame_notifications,
    },
    preferences: {
      theme,
      cardAnimation: card_animation,
    },
  };

  const { error: profileError } = await supabase
    .from("player_profiles")
    .update({
      settings,
    })
    .eq("user_id", userId);

  if (profileError) {
    return { error: "Settings update failed" };
  }

  return { success: "Settings updated successfully" };
}
