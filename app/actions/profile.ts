'use server';

import { createClient } from "@/utils/supabase/server";

export async function updateBasicProfile(userId: string, formData: FormData) {
  const supabase = await createClient();

  // Verify user authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user || user.id !== userId) {
    return { error: "Unauthorized access" };
  }

  // Get form data
  const display_name = formData.get("display_name")?.toString();
  const avatar_url = formData.get("avatar_url")?.toString();
  const email = formData.get("email")?.toString();

  // Validate display name
  if (display_name && (display_name.length < 3 || display_name.length > 30)) {
    return { error: "Display name must be between 3 and 30 characters" };
  }

  // Start transaction
  let message = "Profile updated successfully";

  // Update email if changed and different from current
  if (email && email !== user.email) {
    const { error: emailError } = await supabase.auth.updateUser({
      email: email,
    });

    if (emailError) {
      return { error: "Email update failed. Please try again." };
    }
    message = "Profile updated. Please check your email to confirm the new address.";
  }

  // Update profile
  const updateData = {
    avatar_url,
    display_name: display_name,
  };
  
  console.log('Attempting profile update:', {
    userId,
    updateData,
    authenticatedUser: user
  });

  const { data: profile, error: profileError } = await supabase
    .from("player_profiles")
    .update(updateData)
    .eq("user_id", userId)
    .select()
    .single();

  if (profileError) {
    console.error('Profile update error:', {
      error: profileError,
      code: profileError.code,
      details: profileError.details,
      hint: profileError.hint,
      message: profileError.message
    });
    return { error: `Profile update failed: ${profileError.message}` };
  }

  console.log('Profile updated successfully:', profile);
  return { success: message };
}


export async function updateSecuritySettings(userId: string, formData: FormData) {
  const supabase = await createClient();

  // Verify user authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user || user.id !== userId) {
    return { error: "Unauthorized access" };
  }

  const password = formData.get("password")?.toString();
  const confirm_password = formData.get("confirm_password")?.toString();

  if (!password || !confirm_password) {
    return { error: "Please fill in all fields" };
  }

  if (password !== confirm_password) {
    return { error: "Passwords do not match" };
  }

  // Validate password strength
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters long" };
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

  // Verify user authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user || user.id !== userId) {
    return { error: "Unauthorized access" };
  }

  // Get current profile settings to preserve any other settings
  const { data: currentProfile, error: profileFetchError } = await supabase
    .from("player_profiles")
    .select("settings")
    .eq("user_id", userId)
    .single();

  if (profileFetchError) {
    return { error: "Failed to fetch current settings" };
  }

  // Get form data
  const email_notifications = formData.get("email_notifications") === "on";
  const ingame_notifications = formData.get("ingame_notifications") === "on";
  const card_animation = formData.get("card_animation") === "on";
  const theme = formData.get("theme")?.toString() || "system";

  // Merge new settings with existing ones
  const settings = {
    ...currentProfile?.settings,
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
