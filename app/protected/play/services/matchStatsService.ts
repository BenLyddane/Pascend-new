import { createClient } from "@/utils/supabase/client";
import { updateMatchStats } from "@/app/actions/updateMatchStats";

export async function saveMatchStats(
  userId: string,
  opponentId: string,
  winner: 1 | 2 | "draw",
  stats: any
): Promise<void> {
  try {
    await updateMatchStats(userId, opponentId, winner, stats);
  } catch (error) {
    console.error("Error saving match stats:", error);
    throw new Error("Failed to save match statistics");
  }
}

export async function getCurrentUserId(): Promise<string> {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error("Failed to get current user");
  }

  return user.id;
}
