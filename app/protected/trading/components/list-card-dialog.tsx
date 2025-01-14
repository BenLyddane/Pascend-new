'use client';

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { TradingCard } from "./trading-card";
import { TradingCardData } from "../types";
import { listCardForTrade, getAvailableCardsForTrading } from "@/app/actions/trading";
import { Loader2, Plus } from "lucide-react";
import { useEffect } from "react";

interface ListCardDialogProps {
  userId: string;
  onListingCreated: () => void;
}

export function ListCardDialog({ userId, onListingCreated }: ListCardDialogProps) {
  const { toast } = useToast();
  const [selectedCard, setSelectedCard] = useState<TradingCardData | null>(null);
  const [tokenPrice, setTokenPrice] = useState<string>("2");
  const [isListing, setIsListing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const [availableCards, setAvailableCards] = useState<TradingCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

    const price = parseInt(tokenPrice);
    if (isNaN(price) || price < 2) {
      toast({
        title: "Invalid price",
        description: "Minimum listing price is 2 tokens",
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
              No cards available for trading. Cards must be generated with purchased tokens to be tradeable.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto p-2">
                {availableCards?.map((card) => (
                  <div
                    key={card.id}
                    className={`cursor-pointer transition-all ${
                      selectedCard?.id === card.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedCard(card)}
                  >
                    <TradingCard card={card} />
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
                        type="number"
                        min="2"
                        value={tokenPrice}
                        onChange={(e) => setTokenPrice(e.target.value)}
                        placeholder="Enter token price"
                      />
                    </div>
                    <Button
                      onClick={handleListCard}
                      disabled={isListing || !tokenPrice || parseInt(tokenPrice) < 2}
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
