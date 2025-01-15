"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { purchaseCard, getActiveTradingListings } from "@/app/actions/trading";
import { GameCard } from "@/components/game-card";
import { Loader2 } from "lucide-react";
import { TradeListingData } from "../types";
import { getUserTokens } from "@/app/actions/tokenActions";
import { CardWithEffects } from "@/app/actions/fetchDecks";

interface MarketListingsProps {
  userId: string;
}

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
  const { toast } = useToast();
  const [listings, setListings] = useState<TradeListingData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [purchasedTokens, setPurchasedTokens] = useState(0);

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

  const handlePurchaseCard = async (listingId: string, price: number) => {
    // Validate token balance before attempting purchase
    if (purchasedTokens < price) {
      toast({
        title: "Insufficient tokens",
        description: `You need ${price} purchased tokens to buy this card`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await purchaseCard(userId, listingId, true); // Explicitly use purchased tokens
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="col-span-full mb-4 p-4 bg-muted rounded-lg">
        <div className="text-sm">
          <span className="font-medium">Available Purchased Tokens:</span>
          <span className="ml-2 font-bold">{purchasedTokens}</span>
        </div>
      </div>

      {listings.map((listing) => (
        <Card key={listing.id} className="p-4">
          <div className="w-full">
            <GameCard card={convertToGameCard(listing.card)} />
          </div>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Price:</span>
              <span className="text-sm font-bold">{listing.token_price} tokens</span>
            </div>

            <Button 
              onClick={() => handlePurchaseCard(listing.id, listing.token_price)}
              disabled={isLoading || purchasedTokens < listing.token_price}
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Purchase with Purchased Tokens
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
