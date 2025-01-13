"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GameCard } from "@/components/game-card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { createTradeList, purchaseTrade } from "@/app/actions/trading";
import { fetchCards, type PlayerCard } from "@/app/actions/fetchCards";
import { toast } from "sonner";
import { Database } from "@/types/database.types";
import Image from "next/image";

type TradeListing = Database["public"]["Tables"]["trade_listings"]["Row"] & {
  cards: Database["public"]["Tables"]["cards"]["Row"];
};

type CardType = Database["public"]["Tables"]["cards"]["Row"];

interface TradingClientProps {
  activeListings: TradeListing[];
  userTokens: number;
  userId: string;
}

export default function TradingClient({
  activeListings,
  userTokens,
  userId,
}: TradingClientProps) {
  const [selectedCard, setSelectedCard] = useState<PlayerCard | null>(null);
  const [tokenPrice, setTokenPrice] = useState<number>(2);
  const [isListingOpen, setIsListingOpen] = useState(false);
  const [userCards, setUserCards] = useState<PlayerCard[]>([]);

  const getUserCards = async () => {
    const cards = await fetchCards(userId);
    setUserCards(cards);
  };

  const handleCreateListing = async () => {
    if (!selectedCard || tokenPrice < 2) {
      toast.error("Please select a card and set a price of at least 2 tokens");
      return;
    }

    try {
      await createTradeList({
        cardId: selectedCard.card.id,
        tokenPrice,
        userId,
      });
      toast.success("Card listed for trade successfully");
      setIsListingOpen(false);
      setSelectedCard(null);
    } catch (error: any) {
      if (error.code === "PGRST116") {
        // Unique constraint violation
        toast.error("This card is already listed for trade.");
      } else {
        toast.error(
          error.message || "Failed to create trade listing. Please try again."
        );
      }
    }
  };

  const handlePurchase = async (listingId: string, price: number) => {
    if (userTokens < price) {
      toast.error("Insufficient tokens to purchase this card");
      return;
    }

    try {
      const { error } = await purchaseTrade(listingId, userId);
      if (!error) {
        toast.success("Card purchased successfully");
        window.location.reload();
      } else {
        if (error.code === "23503") {
          // Foreign key violation
          toast.error("Trade listing not found or has already been purchased.");
        } else if (error.code === "PGRST116") {
          // Unique constraint violation
          toast.error("You already own this card.");
        } else {
          toast.error(
            error.message || "Failed to purchase card. Please try again."
          );
        }
      }
    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Trading Center</h1>
        <div className="flex items-center gap-4">
          <span className="text-lg">Your Tokens: {userTokens}</span>
          <Dialog
            open={isListingOpen}
            onOpenChange={(open) => {
              setIsListingOpen(open);
              if (open) {
                getUserCards();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>List Card for Trade</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Trade Listing</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <label className="text-sm font-medium">Select Card</label>
                  <Command className="rounded-lg border shadow-md">
                    <CommandInput placeholder="Search your collection..." />
                    <CommandEmpty>No cards found.</CommandEmpty>
                    <CommandGroup className="max-h-[300px] overflow-y-auto">
                      {userCards.map((playerCard) => (
                        <CommandItem
                          key={playerCard.id}
                          value={playerCard.card.id.toString()}
                          onSelect={() => setSelectedCard(playerCard)}
                          className="flex items-center gap-3 p-2 cursor-pointer hover:bg-gray-100"
                        >
                          <div className="w-[50px] h-[50px] flex items-center justify-center">
                            {playerCard.card.image_url && (
                              <Image
                                src={playerCard.card.image_url}
                                alt={playerCard.card.name}
                                width={50}
                                height={50}
                                className="object-contain"
                              />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">
                              {playerCard.card.name}
                            </p>
                            {playerCard.quantity && playerCard.quantity > 1 && (
                              <p className="text-sm text-muted-foreground">
                                Quantity: {playerCard.quantity}
                              </p>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </div>
                <div>
                  <label className="text-sm font-medium">
                    Token Price (min. 2)
                  </label>
                  <Input
                    type="number"
                    min={2}
                    value={tokenPrice}
                    onChange={(e) => setTokenPrice(Number(e.target.value))}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Minimum is 2 tokens (1 token listing fee + 1 token for
                    seller)
                  </p>
                </div>
                <Button onClick={handleCreateListing}>Create Listing</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">
          Available Cards for Trade
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {activeListings.map((listing) => (
            <Card key={listing.id} className="p-4">
              <div className="space-y-4">
                <GameCard card={listing.cards} />
                <div className="flex justify-between items-center">
                  <span className="font-medium">
                    Price: {listing.token_price} tokens
                  </span>
                  {listing.seller_id !== userId && (
                    <Button
                      onClick={() =>
                        handlePurchase(listing.id, listing.token_price)
                      }
                      disabled={userTokens < listing.token_price}
                    >
                      Purchase
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {activeListings.length === 0 && (
            <p className="text-muted-foreground col-span-full text-center py-8">
              No cards currently available for trade
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
