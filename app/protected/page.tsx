// app/protected/page.tsx
import { DashLeaderboard } from "@/components/dashboard/dash-leaderboard";
import { DashCollection } from "@/components/dashboard/dash-collection";
import { DashPlay } from "@/components/dashboard/dash-play";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Loading skeletons for each component
function LeaderboardSkeleton() {
  return <Skeleton className="w-full h-[200px] rounded-lg" />;
}

function CollectionSkeleton() {
  return <Skeleton className="w-full h-[400px] rounded-lg" />;
}

function PlaySkeleton() {
  return <Skeleton className="w-full h-[400px] rounded-lg" />;
}

export default async function ProtectedPage() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    redirect('/sign-in');
  }
  
  // Get user profile for display name
  const { data: profile } = await supabase
    .from('player_profiles')
    .select('display_name')
    .eq('user_id', user.id)
    .single();
  
  const displayName = profile?.display_name || user.email?.split("@")[0] || 'Player';
  
  // Get the time of day for greeting
  const hour = new Date().getHours();
  let greeting = "Good evening";
  if (hour < 12) greeting = "Good morning";
  else if (hour < 18) greeting = "Good afternoon";

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome Section */}
      <div className="flex items-baseline justify-between border-b pb-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">
            {greeting}, {displayName}
          </h2>
          <p className="text-sm text-muted-foreground">
            Here's what's happening with your card collection today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link 
            href="/protected/play/multiplayer" 
            className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white px-4 py-2 rounded-md text-sm font-medium shadow-md transition-all hover:shadow-lg"
          >
            Quick Match
          </Link>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid gap-6">
        {/* Top Leaderboard Section */}
        <Suspense fallback={<LeaderboardSkeleton />}>
          <DashLeaderboard />
        </Suspense>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Collection Section */}
          <Suspense fallback={<CollectionSkeleton />}>
            <DashCollection />
          </Suspense>

          {/* Play Section */}
          <Suspense fallback={<PlaySkeleton />}>
            <DashPlay />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
