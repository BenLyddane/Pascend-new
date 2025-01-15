"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
  checkCardTradeEligibility,
} from "@/app/actions/trading";
import { TradeError } from "@/app/actions/trading/types";

const MIN_LISTING_PRICE = 2;
const MAX_LISTING_PRICE = 1000;
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
    if (isNaN(price) || price < MIN_LISTING_PRICE || price > MAX_LISTING_PRICE || price !== parseFloat(tokenPrice)) {
      toast({
        title: "Invalid price",
        description: `Price must be a whole number between ${MIN_LISTING_PRICE} and ${MAX_LISTING_PRICE} tokens`,
        variant: "destructive",
      });
      return;
    }

    setIsListing(true);
    try {
      // Check card eligibility first
      const { eligible, reason } = await checkCardTradeEligibility(userId, selectedCard.id);
      if (!eligible && reason) {
        throw new Error(reason);
      }

      await listCardForTrade(userId, selectedCard.id, price);
      toast({
        title: "Success",
        description: "Card listed for trade",
      });
      onListingCreated();
      setIsOpen(false);
      setSelectedCard(null);
      setTokenPrice(MIN_LISTING_PRICE.toString());
    } catch (error) {
      const tradeError = error as TradeError;
      let errorMessage = "Failed to list card";
      
      if (tradeError.code === "INSUFFICIENT_TOKENS") {
        errorMessage = "You don't have enough tokens to list this card";
      } else if (tradeError.code === "CARD_NOT_FOUND") {
        errorMessage = "Card not found";
      } else if (tradeError.code === "NOT_OWNER") {
        errorMessage = "You don't own this card";
      } else if (tradeError.code === "FREE_TOKEN_CARD") {
        errorMessage = "This card cannot be traded (generated with free tokens)";
      } else if (tradeError.code === "CARD_INACTIVE") {
        errorMessage = "This card is not active";
      } else if (tradeError.code === "ALREADY_LISTED") {
        errorMessage = "This card is already listed";
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast({
        title: "Error",
        description: errorMessage,
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
                min={MIN_LISTING_PRICE}
                max={MAX_LISTING_PRICE}
                value={tokenPrice}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "" || /^\d+$/.test(value)) {
                    const numValue = parseInt(value);
                    if (!value || (numValue >= MIN_LISTING_PRICE && numValue <= MAX_LISTING_PRICE)) {
                      setTokenPrice(value);
                    }
                  }
                }}
                onBlur={() => {
                  const value = parseInt(tokenPrice);
                  if (!isNaN(value) && value >= MIN_LISTING_PRICE && value <= MAX_LISTING_PRICE) {
                    setTokenPrice(value.toString());
                  } else {
                    setTokenPrice(MIN_LISTING_PRICE.toString());
                  }
                }}
                placeholder={`Enter token price (${MIN_LISTING_PRICE}-${MAX_LISTING_PRICE})`}
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
