"use client";

// components/dashboard/dash-collection.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  LayersIcon,
  SparklesIcon,
  StarIcon,
  ShieldIcon,
  SwordIcon,
  Loader2Icon,
  GemIcon,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { CardModal } from "./card-modal";
import { useState, useEffect } from "react";
import type { CardWithEffects, CardRarity, BaseCardEffect, isBaseCardEffect } from "@/types/game.types";

import type { Database, Json } from "@/types/database.types";

type DbCard = Database["public"]["Tables"]["cards"]["Row"];
type DbCollectionStats = Database["public"]["Tables"]["collection_stats"]["Row"];

type CardStats = Pick<DbCollectionStats, "total_cards" | "unique_cards" | "legendary_count" | "epic_count" | "collection_progress">;

// Keep PlayerCard as DbCard for database operations
type PlayerCard = DbCard;

// Convert database card to CardWithEffects type
function convertToCardWithEffects(card: PlayerCard): CardWithEffects {
  let effects: BaseCardEffect[] = [];
  
  if (card.special_effects && Array.isArray(card.special_effects)) {
    effects = card.special_effects
      .filter((effect): effect is Json => effect !== null && typeof effect === 'object')
      .map(effect => {
        const jsonEffect = effect as { [key: string]: Json };
        return {
          name: String(jsonEffect.name || ''),
          description: String(jsonEffect.description || ''),
          effect_type: String(jsonEffect.effect_type || ''),
          effect_icon: String(jsonEffect.effect_icon || ''),
          value: typeof jsonEffect.value === 'number' ? jsonEffect.value : 0
        };
      });
  }

  return {
    ...card,
    special_effects: effects,
  };
}

const rarityColors: Record<CardRarity, string> = {
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

async function getCollectionStats(cards: PlayerCard[]): Promise<CardStats> {
  const uniqueCards = cards.length;
  const legendaryCount = cards.filter(card => card.rarity === "legendary").length;
  const epicCount = cards.filter(card => card.rarity === "epic").length;
  
  return {
    total_cards: uniqueCards, // For now, total equals unique since we're not tracking duplicates
    unique_cards: uniqueCards,
    legendary_count: legendaryCount,
    epic_count: epicCount,
    collection_progress: 0, // We can calculate this if needed
  };
}

async function getAllCards(): Promise<PlayerCard[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data: cards, error } = await supabase
    .from("cards")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (error) {
    console.error("Error fetching cards:", error);
    return [];
  }

  return cards || [];
}

function CardPreview({ card, onClick }: { card: PlayerCard; onClick: () => void }) {
  return (
    <div
      className={`aspect-[3/4] rounded-lg ${rarityColors[card.rarity as CardRarity]} p-2 flex flex-col cursor-pointer hover:scale-105 transition-transform`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <Badge variant="outline" className="bg-background/50">
          {card.power}/{card.health}
        </Badge>
        {card.rarity === "legendary" && <StarIcon className="text-amber-500" size={16} />}
        {card.rarity === "epic" && <GemIcon className="text-purple-500" size={16} />}
      </div>
      {card.image_url && (
        <div className="flex-grow flex items-center justify-center my-2">
          <img 
            src={card.image_url} 
            alt={card.name}
            className="w-full h-full object-cover rounded"
          />
        </div>
      )}
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

function CollectionContent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCard, setSelectedCard] = useState<PlayerCard | null>(null);
  const [stats, setStats] = useState<CardStats | null>(null);
  const [cards, setCards] = useState<PlayerCard[]>([]);

  // Fetch data on mount
  useEffect(() => {
    const fetchData = async () => {
      const fetchedCards = await getAllCards();
      const fetchedStats = await getCollectionStats(fetchedCards);
      setStats(fetchedStats);
      setCards(fetchedCards);
    };
    fetchData();
  }, []);

  // Filter cards based on search
  const filteredCards = cards.filter(card => 
    card.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <CardContent>
      {/* Collection Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="flex flex-col items-center p-2 rounded-lg bg-accent/50 hover:bg-accent/70 transition-colors">
          <span className="text-sm text-muted-foreground">Collection</span>
          <div className="flex items-center gap-1">
            <span className="text-2xl font-bold">{stats?.unique_cards || 0}</span>
            <LayersIcon size={16} className="text-blue-500 ml-1" />
          </div>
        </div>
        <div className="flex flex-col items-center p-2 rounded-lg bg-accent/50 hover:bg-accent/70 transition-colors">
          <span className="text-sm text-muted-foreground">Legendary</span>
          <div className="flex items-center gap-1">
            <span className="text-2xl font-bold">{stats?.legendary_count || 0}</span>
            <StarIcon size={16} className="text-amber-500" />
          </div>
        </div>
        <div className="flex flex-col items-center p-2 rounded-lg bg-accent/50 hover:bg-accent/70 transition-colors">
          <span className="text-sm text-muted-foreground">Epic</span>
          <div className="flex items-center gap-1">
            <span className="text-2xl font-bold">{stats?.epic_count || 0}</span>
            <GemIcon size={16} className="text-purple-500" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          placeholder="Search cards..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Cards Carousel */}
      {filteredCards.length > 0 ? (
        <Carousel className="w-full">
          <CarouselContent>
            {filteredCards.map((card) => (
              <CarouselItem key={card.id} className="basis-1/3 md:basis-1/4 lg:basis-1/5">
                <CardPreview 
                  card={card} 
                  onClick={() => setSelectedCard(card)}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-1" />
          <CarouselNext className="right-1" />
        </Carousel>
      ) : (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <LayersIcon size={48} className="mb-2 opacity-50" />
          <span className="text-sm font-medium">
            {searchTerm ? "No cards found" : "No cards yet"}
          </span>
          {searchTerm ? (
            <span className="text-xs mt-1">Try a different search term</span>
          ) : (
            <span className="text-xs mt-1">Create cards to build your collection</span>
          )}
        </div>
      )}

      {/* Card Modal */}
      <CardModal
        card={selectedCard ? convertToCardWithEffects(selectedCard) : null}
        isOpen={!!selectedCard}
        onClose={() => setSelectedCard(null)}
      />
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
      <CollectionContent />
    </Card>
  );
}
