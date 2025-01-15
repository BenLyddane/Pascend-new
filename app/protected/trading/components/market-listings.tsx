"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { purchaseCard, getActiveTradingListings } from "@/app/actions/trading";
import { GameCard } from "@/components/game-card";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { TradeListingData } from "../types";
import { getUserTokens } from "@/app/actions/tokenActions";
import { CardWithEffects } from "@/app/actions/fetchDecks";

interface MarketListingsProps {
  userId: string;
}

const CARDS_PER_PAGE = 9;
type ValidRarity = "common" | "rare" | "epic" | "legendary";
const RARITY_ORDER: ValidRarity[] = ["legendary", "epic", "rare", "common"];

// Helper function to convert effect type to the correct format
function normalizeEffectType(type: string): "on_turn_start" | "on_battle_start" | "on_attack" | "on_successful_attack" | "on_damage_received" | "on_damage_dealt" | "on_death" {
  switch (type) {
    case "on_turn_start": return "on_turn_start";
    case "on_battle_start": return "on_battle_start";
    case "on_attack": return "on_attack";
    case "on_successful_attack": return "on_successful_attack";
    case "on_damage_received": return "on_damage_received";
    case "on_damage_dealt": return "on_damage_dealt";
    case "on_death": return "on_death";
    default: return "on_turn_start"; // Default fallback
  }
}

// Helper function to convert trading card to game card format
function convertToGameCard(card: TradeListingData["card"]): CardWithEffects {
  return {
    ...card,
    special_effects: card.special_effects.map(effect => ({
      ...effect,
      effect_type: normalizeEffectType(effect.effect_type)
    })),
    special_properties: card.special_properties?.map(prop => ({
      ...prop,
      effect_type: normalizeEffectType(prop.effect_type)
    }))
  };
}

export function MarketListings({ userId }: MarketListingsProps) {
  // All hooks must be called before any conditional returns
  const { toast } = useToast();
  const [listings, setListings] = useState<TradeListingData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [purchasedTokens, setPurchasedTokens] = useState(0);
  const [selectedListing, setSelectedListing] = useState<{id: string, price: number} | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [sortOption, setSortOption] = useState<"rarity" | "name" | "power" | "price">("rarity");
  const [filteredRarity, setFilteredRarity] = useState<"all" | "common" | "rare" | "epic" | "legendary">("all");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = useCallback(async () => {
    try {
      const [active, balance] = await Promise.all([
        getActiveTradingListings(userId),
        getUserTokens(userId)
      ]);
      setListings(active);
      setPurchasedTokens(balance.purchased_tokens);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch market data",
        variant: "destructive",
      });
    } finally {
      setIsInitialLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredListings = useMemo(
    () =>
      listings
        .filter((listing) => {
          if (filteredRarity !== "all" && listing.card.rarity !== filteredRarity) {
            return false;
          }
          const searchLower = searchTerm.toLowerCase();
          return (
            listing.card.name.toLowerCase().includes(searchLower) ||
            listing.card.description.toLowerCase().includes(searchLower)
          );
        })
        .sort((a, b) => {
          switch (sortOption) {
            case "rarity": {
              const aIndex = RARITY_ORDER.indexOf(a.card.rarity as ValidRarity);
              const bIndex = RARITY_ORDER.indexOf(b.card.rarity as ValidRarity);
              return aIndex - bIndex;
            }
            case "name":
              return a.card.name.localeCompare(b.card.name);
            case "power":
              return b.card.power - a.card.power;
            case "price":
              return a.token_price - b.token_price;
            default:
              return 0;
          }
        }),
    [listings, filteredRarity, searchTerm, sortOption]
  );

  const totalPages = Math.ceil(filteredListings.length / CARDS_PER_PAGE);
  const paginatedListings = filteredListings.slice(
    (currentPage - 1) * CARDS_PER_PAGE,
    currentPage * CARDS_PER_PAGE
  );

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePurchaseConfirm = async () => {
    if (!selectedListing) return;
    
    if (purchasedTokens < selectedListing.price) {
      toast({
        title: "Insufficient tokens",
        description: `You need ${selectedListing.price} purchased tokens to buy this card`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await purchaseCard(userId, selectedListing.id, true);
      toast({
        title: "Success",
        description: "Card purchased successfully",
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to purchase card",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No cards currently available in the market
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Stats Section */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="flex flex-col items-center p-4 rounded-lg bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10">
            <span className="text-sm text-muted-foreground">Available Balance</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{purchasedTokens}</span>
              <span className="text-xl">🪙</span>
            </div>
          </div>
          <div className="flex flex-col items-center p-4 rounded-lg bg-accent/50">
            <span className="text-sm text-muted-foreground">Listed Cards</span>
            <span className="text-2xl font-bold">{listings.length}</span>
          </div>
          <div className="flex flex-col items-center p-4 rounded-lg bg-accent/50">
            <span className="text-sm text-muted-foreground">Price Range</span>
            <span className="text-2xl font-bold">
              {Math.min(...listings.map(l => l.token_price))} - {Math.max(...listings.map(l => l.token_price))}
            </span>
          </div>
        </div>

        {/* Search, Sort, and Filter Controls */}
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 mb-6">
          <Input
            type="text"
            placeholder="Search cards..."
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <Select
            onValueChange={(value: typeof sortOption) => setSortOption(value)}
            defaultValue="rarity"
          >
            <SelectTrigger className="w-[140px]">
              <span>Sort By</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rarity">Rarity</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="power">Power</SelectItem>
              <SelectItem value="price">Price</SelectItem>
            </SelectContent>
          </Select>

          <Select
            onValueChange={(value: typeof filteredRarity) => setFilteredRarity(value)}
            defaultValue="all"
          >
            <SelectTrigger className="w-[140px]">
              <span>Filter Rarity</span>
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

        {/* Cards Grid */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 place-items-center">
          {paginatedListings.map((listing) => (
            <div key={listing.id} className="flex flex-col gap-3">
              <Card className="overflow-hidden border-2 border-gray-200 dark:border-gray-800">
                <div className="relative group">
                  <GameCard card={convertToGameCard(listing.card)} />
                </div>
              </Card>
              
              <div className="flex flex-col gap-2 px-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Price</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-bold">{listing.token_price}</span>
                    <span>🪙</span>
                  </div>
                </div>

                <Button 
                  onClick={() => setSelectedListing({ id: listing.id, price: listing.token_price })}
                  disabled={isLoading || purchasedTokens < listing.token_price}
                  className="w-full h-9 text-sm"
                  variant={purchasedTokens >= listing.token_price ? "default" : "secondary"}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  {purchasedTokens >= listing.token_price ? "Purchase" : "Insufficient Tokens"}
                </Button>
              </div>
            </div>
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

      <AlertDialog open={!!selectedListing} onOpenChange={() => setSelectedListing(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Purchase</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to purchase this card for {selectedListing?.price} tokens? 
              This action will deduct from your purchased tokens balance and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePurchaseConfirm}>
              Confirm Purchase
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
