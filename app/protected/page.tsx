// app/protected/page.tsx
import { DashLeaderboard } from "@/components/dashboard/dash-leaderboard";
import { DashCollection } from "@/components/dashboard/dash-collection";
import { DashPlay } from "@/components/dashboard/dash-play";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
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
            {greeting}, {user.email?.split("@")[0]}
          </h2>
          <p className="text-sm text-muted-foreground">
            Here's what's happening with your card collection today.
          </p>
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
