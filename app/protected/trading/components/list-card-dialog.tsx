"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { GameCard } from "@/components/game-card";
import { TradingCardData } from "../types";
import {
  listCardForTrade,
  getAvailableCardsForTrading,
} from "@/app/actions/trading";
import { Loader2, Plus, Search } from "lucide-react";

interface ListCardDialogProps {
  userId: string;
  onListingCreated: () => void;
}

export function ListCardDialog({
  userId,
  onListingCreated,
}: ListCardDialogProps) {
  const { toast } = useToast();
  const [selectedCard, setSelectedCard] = useState<TradingCardData | null>(
    null
  );
  const [tokenPrice, setTokenPrice] = useState<string>("2");
  const [isListing, setIsListing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [availableCards, setAvailableCards] = useState<TradingCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter cards based on search query
  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) return availableCards;

    const query = searchQuery.toLowerCase();
    return availableCards.filter(
      (card) =>
        card.name.toLowerCase().includes(query) ||
        card.description.toLowerCase().includes(query) ||
        card.rarity.toLowerCase().includes(query)
    );
  }, [availableCards, searchQuery]);

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const cards = await getAvailableCardsForTrading(userId);
        setAvailableCards(cards);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to fetch available cards",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      setIsLoading(true);
      fetchCards();
    }
  }, [userId, isOpen, toast]);

  const handleListCard = async () => {
    if (!selectedCard) return;

    // Ensure the price is a whole number
    const price = Math.floor(parseFloat(tokenPrice));
    if (isNaN(price) || price < 2 || price !== parseFloat(tokenPrice)) {
      toast({
        title: "Invalid price",
        description: "Price must be a whole number of at least 2 tokens",
        variant: "destructive",
      });
      return;
    }

    setIsListing(true);
    try {
      await listCardForTrade(userId, selectedCard.id, price);
      toast({
        title: "Success",
        description: "Card listed for trade",
      });
      onListingCreated();
      setIsOpen(false);
      setSelectedCard(null);
      setTokenPrice("2");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to list card",
        variant: "destructive",
      });
    } finally {
      setIsListing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full mb-4">
          <Plus className="w-4 h-4 mr-2" />
          List Card for Trade
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>List Card for Trade</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : availableCards?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No cards available for trading. Cards must be generated with
              purchased tokens to be tradeable.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4">
                <div className="relative flex-grow">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search cards by name, description, or rarity..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto p-2">
                {filteredCards.map((card) => (
                  <div
                    key={card.id}
                    className={`cursor-pointer transition-all ${
                      selectedCard?.id === card.id ? "ring-2 ring-primary" : ""
                    }`}
                    onClick={() => setSelectedCard(card)}
                  >
                    <GameCard card={card} />
                  </div>
                ))}
              </div>

              {selectedCard && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center gap-4">
                    <div className="flex-grow">
                      <label className="text-sm font-medium mb-2 block">
                        Token Price (Minimum 2)
                      </label>
                      <Input
                        type="text"
                        pattern="\d*"
                        min="2"
                        value={tokenPrice}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "" || /^\d+$/.test(value)) {
                            setTokenPrice(value);
                          }
                        }}
                        onBlur={() => {
                          const value = parseInt(tokenPrice);
                          if (!isNaN(value) && value >= 2) {
                            setTokenPrice(value.toString());
                          } else {
                            setTokenPrice("2");
                          }
                        }}
                        placeholder="Enter token price (whole numbers only)"
                      />
                    </div>
                    <Button
                      onClick={handleListCard}
                      disabled={
                        isListing || !tokenPrice || parseInt(tokenPrice) < 2
                      }
                      className="mt-6"
                    >
                      {isListing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      List Card
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
