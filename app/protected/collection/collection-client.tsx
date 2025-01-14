"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, StarIcon, GemIcon } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { GameCard } from "@/components/game-card";
import type { Database } from "@/types/database.types";

import { CardWithEffects } from "@/app/actions/fetchDecks";

interface CollectionClientProps {
  userCards: CardWithEffects[];
}

interface CardStats {
  totalCards: number;
  uniqueCards: number;
  legendaryCount: number;
  epicCount: number;
  collectionProgress: number;
}

function getCollectionStats(cards: CardWithEffects[]): CardStats {
  const uniqueCards = cards.length;
  const legendaryCount = cards.filter(card => card.rarity === "legendary").length;
  const epicCount = cards.filter(card => card.rarity === "epic").length;
  
  return {
    totalCards: uniqueCards, // For now, total equals unique since we're not tracking duplicates
    uniqueCards,
    legendaryCount,
    epicCount,
    collectionProgress: 0, // We can calculate this if needed
  };
}

// Type for valid rarity values - includes "all" for filtering
type ValidRarity = "common" | "rare" | "epic" | "legendary";
type Rarity = ValidRarity | "all";
type SortOption = "rarity" | "name" | "power";

const rarityOrder: ValidRarity[] = ["legendary", "epic", "rare", "common"];

export default function CollectionClient({ userCards }: CollectionClientProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortOption, setSortOption] = useState<SortOption>("rarity");
  const [filteredRarity, setFilteredRarity] = useState<Rarity>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const cardsPerPage = 6;

  // Filter and sort logic
  const filteredCards = useMemo(
    () =>
      userCards
        .filter((card) => {
          if (filteredRarity !== "all" && card.rarity !== filteredRarity) {
            return false;
          }
          const searchLower = searchTerm.toLowerCase();
          return (
            card.name.toLowerCase().includes(searchLower) ||
            card.description.toLowerCase().includes(searchLower)
          );
        })
        .sort((a, b) => {
          switch (sortOption) {
            case "rarity": {
              const aIndex = rarityOrder.indexOf(a.rarity as ValidRarity);
              const bIndex = rarityOrder.indexOf(b.rarity as ValidRarity);
              return aIndex - bIndex;
            }
            case "name":
              return a.name.localeCompare(b.name);
            case "power":
              return b.power - a.power;
            default:
              return 0;
          }
        }),
    [userCards, filteredRarity, searchTerm, sortOption]
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredCards.length / cardsPerPage);
  const paginatedCards = filteredCards.slice(
    (currentPage - 1) * cardsPerPage,
    currentPage * cardsPerPage
  );

  // Handle page changes
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Calculate collection stats
  const stats = useMemo(() => getCollectionStats(userCards), [userCards]);

  return (
    <div>
      {/* Collection Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
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
        <div className="flex flex-col items-center p-2 rounded-lg bg-accent/50">
          <span className="text-sm text-muted-foreground">Epic</span>
          <div className="flex items-center gap-1">
            <span className="text-2xl font-bold">{stats.epicCount}</span>
            <GemIcon size={16} className="text-purple-500" />
          </div>
        </div>
      </div>

      {/* Search, Sort, and Filter Controls */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Search Input */}
        <Input
          type="text"
          placeholder="Search cards..."
          className="flex-1"
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {/* Sort Dropdown */}
        <Select
          onValueChange={(value: SortOption) => setSortOption(value)}
          defaultValue="rarity"
        >
          <SelectTrigger className="w-48">
            <span>Sort By</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rarity">Rarity</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="power">Power</SelectItem>
          </SelectContent>
        </Select>

        {/* Filter by Rarity */}
        <Select
          onValueChange={(value: Rarity) => setFilteredRarity(value)}
          defaultValue="all"
        >
          <SelectTrigger className="w-48">
            <span>Filter by Rarity</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="common">Common</SelectItem>
            <SelectItem value="rare">Rare</SelectItem>
            <SelectItem value="epic">Epic</SelectItem>
            <SelectItem value="legendary">Legendary</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards Display */}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 place-items-center p-6">
        {paginatedCards.map((card) => (
          <GameCard key={card.id} card={card} />
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-8">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="icon"
                onClick={() => handlePageChange(page)}
              >
                {page}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
