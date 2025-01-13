// components/dashboard/dash-collection.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  LayersIcon,
  SparklesIcon,
  StarIcon,
  ShieldIcon,
  SwordIcon,
  Loader2Icon,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { Suspense } from "react";

interface CardStats {
  totalCards: number;
  uniqueCards: number;
  legendaryCount: number;
  collectionProgress: number;
}

interface PlayerCard {
  id: string;
  name: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  type: "attack" | "defense" | "utility";
  power: number;
}

const rarityColors = {
  common: "bg-slate-200 dark:bg-slate-700",
  rare: "bg-blue-200 dark:bg-blue-800",
  epic: "bg-purple-200 dark:bg-purple-800",
  legendary: "bg-amber-200 dark:bg-amber-800",
};

const typeIcons = {
  attack: SwordIcon,
  defense: ShieldIcon,
  utility: SparklesIcon,
};

async function getCollectionStats(): Promise<CardStats> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      totalCards: 0,
      uniqueCards: 0,
      legendaryCount: 0,
      collectionProgress: 0,
    };
  }

  const { data: stats, error } = await supabase
    .from("player_collections")
    .select(
      `
      total_cards,
      unique_cards,
      legendary_count,
      collection_progress
    `
    )
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("Error fetching collection stats:", error);
    return {
      totalCards: 0,
      uniqueCards: 0,
      legendaryCount: 0,
      collectionProgress: 0,
    };
  }

  return {
    totalCards: stats?.total_cards || 0,
    uniqueCards: stats?.unique_cards || 0,
    legendaryCount: stats?.legendary_count || 0,
    collectionProgress: stats?.collection_progress || 0,
  };
}

async function getRecentCards(): Promise<PlayerCard[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data: cards, error } = await supabase
    .from("player_cards")
    .select(
      `
      id,
      name,
      rarity,
      type,
      power
    `
    )
    .eq("user_id", user.id)
    .order("acquired_at", { ascending: false })
    .limit(6);

  if (error) {
    console.error("Error fetching cards:", error);
    return [];
  }

  return cards || [];
}

function CardPreview({ card }: { card: PlayerCard }) {
  const TypeIcon = typeIcons[card.type];

  return (
    <div
      className={`aspect-[3/4] rounded-lg ${rarityColors[card.rarity]} p-2 flex flex-col`}
    >
      <div className="flex justify-between items-start">
        <Badge variant="outline" className="bg-background/50">
          {card.power}
        </Badge>
        <TypeIcon size={16} />
      </div>
      <div className="flex-grow flex items-center justify-center">
        {card.rarity === "legendary" && (
          <StarIcon className="text-amber-500" size={24} />
        )}
      </div>
      <div className="text-xs font-medium truncate text-center">
        {card.name}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 mb-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-12 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[3/4] rounded-lg" />
        ))}
      </div>
    </div>
  );
}

async function DashCollectionContent() {
  const stats = await getCollectionStats();
  const recentCards = await getRecentCards();

  return (
    <CardContent>
      {/* Collection Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="flex flex-col items-center p-2 rounded-lg bg-accent/50">
          <span className="text-sm text-muted-foreground">Collection</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold">{stats.uniqueCards}</span>
            <span className="text-sm text-muted-foreground">
              / {stats.totalCards}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-center p-2 rounded-lg bg-accent/50">
          <span className="text-sm text-muted-foreground">Legendary</span>
          <div className="flex items-center gap-1">
            <span className="text-2xl font-bold">{stats.legendaryCount}</span>
            <StarIcon size={16} className="text-amber-500" />
          </div>
        </div>
      </div>

      {/* Recent Cards Grid */}
      <div className="grid grid-cols-3 gap-4">
        {recentCards.length > 0 ? (
          recentCards.map((card) => <CardPreview key={card.id} card={card} />)
        ) : (
          <div className="col-span-3 flex flex-col items-center justify-center h-48 text-muted-foreground">
            <LayersIcon size={48} className="mb-2" />
            <span className="text-sm">No cards yet</span>
          </div>
        )}
      </div>
    </CardContent>
  );
}

export function DashCollection() {
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Your Collection</CardTitle>
        <Link
          href="/protected/collection"
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          View all cards →
        </Link>
      </CardHeader>
      <Suspense fallback={<LoadingState />}>
        <DashCollectionContent />
      </Suspense>
    </Card>
  );
}

export default DashCollection;
