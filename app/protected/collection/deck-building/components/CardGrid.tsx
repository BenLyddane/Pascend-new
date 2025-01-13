"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GameCardDeckBuilder } from "@/components/game-card-deck-builder";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import type { CardWithEffects } from "@/app/actions/fetchDecks";

type Rarity = "common" | "rare" | "epic" | "legendary" | "all";
type SortOption = "rarity" | "name" | "power";

interface CardGridProps {
  cards: CardWithEffects[];
  selectedCardIds: string[];
  onCardSelect: (card: CardWithEffects) => void;
}

export function CardGrid({
  cards,
  selectedCardIds,
  onCardSelect,
}: CardGridProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortOption, setSortOption] = useState<SortOption>("rarity");
  const [filteredRarity, setFilteredRarity] = useState<Rarity>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const cardsPerPage = 9; // 3x3 grid

  const { paginatedCards, totalPages } = useMemo(() => {
    const filtered = cards
      .filter((card) => {
        if (filteredRarity !== "all" && card.rarity !== filteredRarity)
          return false;
        return card.name.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => {
        if (sortOption === "rarity") {
          const rarityOrder: Rarity[] = ["legendary", "epic", "rare", "common"];
          return (
            rarityOrder.indexOf(a.rarity as Rarity) -
            rarityOrder.indexOf(b.rarity as Rarity)
          );
        }
        return sortOption === "name"
          ? a.name.localeCompare(b.name)
          : b.power - a.power;
      });

    const totalPages = Math.ceil(filtered.length / cardsPerPage);
    const startIndex = (currentPage - 1) * cardsPerPage;
    const paginatedCards = filtered.slice(
      startIndex,
      startIndex + cardsPerPage
    );

    return { paginatedCards, totalPages };
  }, [cards, filteredRarity, searchTerm, sortOption, currentPage]);

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <Input
          type="text"
          placeholder="Search cards..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <Select
          onValueChange={(value: SortOption) => setSortOption(value)}
          defaultValue="rarity"
        >
          <SelectTrigger className="w-36">Sort By</SelectTrigger>
          <SelectContent>
            <SelectItem value="rarity">Rarity</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="power">Power</SelectItem>
          </SelectContent>
        </Select>
        <Select
          onValueChange={(value: Rarity) => setFilteredRarity(value)}
          defaultValue="all"
        >
          <SelectTrigger className="w-48">Filter by Rarity</SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="common">Common</SelectItem>
            <SelectItem value="rare">Rare</SelectItem>
            <SelectItem value="epic">Epic</SelectItem>
            <SelectItem value="legendary">Legendary</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col space-y-6">
        <ScrollArea className="h-[calc(100vh-22rem)]">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-8 pr-4">
            {paginatedCards.map((card) => (
              <div key={card.id} className="relative isolate w-full">
                <div
                  className={`cursor-pointer transition-all duration-300 ${
                    selectedCardIds.includes(card.id)
                      ? "ring-2 ring-green-500 scale-105"
                      : ""
                  }`}
                  onClick={() => onCardSelect(card)}
                >
                  <GameCardDeckBuilder card={card} />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Pagination Controls - Outside ScrollArea */}
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
