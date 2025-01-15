import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function StatsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Fetch profile data
  const { data: profile } = await supabase
    .from("player_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Game Statistics</CardTitle>
        <CardDescription>Your game performance and ranking history</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <h3 className="font-semibold">Current Season</h3>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Rank Points</p>
              <p className="text-2xl font-bold">{profile?.rank_points}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Seasonal Points</p>
              <p className="text-2xl font-bold">
                {profile?.seasonal_rank_points}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Season Highest</p>
              <p className="text-2xl font-bold">
                {profile?.season_highest_rank}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Match History</h3>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Matches</p>
              <p className="text-2xl font-bold">{profile?.total_matches}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Wins</p>
                <p className="text-xl font-bold text-green-500">
                  {profile?.wins}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Losses</p>
                <p className="text-xl font-bold text-red-500">
                  {profile?.losses}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Draws</p>
                <p className="text-xl font-bold text-yellow-500">
                  {profile?.draws}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Achievements</h3>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Current Streak</p>
              <p className="text-2xl font-bold">{profile?.current_streak}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Longest Streak</p>
              <p className="text-2xl font-bold">{profile?.longest_streak}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Win Rate</p>
              <p className="text-2xl font-bold">
                {profile?.total_matches
                  ? Math.round((profile?.wins / profile?.total_matches) * 100)
                  : 0}
                %
              </p>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Account Created</p>
          <p className="text-md">
            {new Date(profile?.created_at || Date.now()).toLocaleDateString()}
          </p>
          {profile?.last_match_at && (
            <>
              <p className="text-sm text-muted-foreground">Last Match</p>
              <p className="text-md">
                {new Date(profile.last_match_at).toLocaleDateString()}
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
