import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { PlayerProfile } from "../types/database";

interface UseUserProfileResult {
  userName: string;
  isLoading: boolean;
  error: string | null;
}

export function useUserProfile(): UseUserProfileResult {
  const [userName, setUserName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function getUserName() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error("No authenticated user found");
        }

        const { data: profile, error: profileError } = await supabase
          .from("player_profiles")
          .select("settings")
          .eq("user_id", user.id)
          .single();

        if (profileError) {
          throw profileError;
        }

        if (profile?.settings?.display_name) {
          setUserName(profile.settings.display_name);
        } else {
          setUserName(user.email?.split("@")[0] || "Player");
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        setError(error instanceof Error ? error.message : "Failed to load user profile");
        setUserName("Player");
      } finally {
        setIsLoading(false);
      }
    }

    getUserName();
  }, []);

  return { userName, isLoading, error };
}
