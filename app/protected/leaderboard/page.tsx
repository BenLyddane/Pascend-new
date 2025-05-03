import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import RankLeaderboard from "./components/rank-leaderboard";
import RankExplanation from "./components/rank-explanation";

export default async function LeaderboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <RankLeaderboard />
        </div>
        <div className="md:col-span-1">
          <RankExplanation />
        </div>
      </div>
    </div>
  );
}
