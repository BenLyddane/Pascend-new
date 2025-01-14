'use client';

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { purchaseCard, getActiveTradingListings } from "@/app/actions/trading";
import { TradingCard } from "./trading-card";
import { Loader2 } from "lucide-react";
import { TradeListingData } from "../types";

interface MarketListingsProps {
  userId: string;
}

export function MarketListings({ userId }: MarketListingsProps) {
  const { toast } = useToast();
  const [listings, setListings] = useState<TradeListingData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const fetchListings = useCallback(async () => {
    try {
      const active = await getActiveTradingListings(userId);
      setListings(active);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch market listings",
        variant: "destructive",
      });
    } finally {
      setIsInitialLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handlePurchaseCard = async (listingId: string) => {
    setIsLoading(true);
    try {
      await purchaseCard(userId, listingId);
      toast({
        title: "Success",
        description: "Card purchased successfully",
      });
      fetchListings();
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
      {listings.map((listing) => (
        <Card key={listing.id} className="p-4">
          <TradingCard card={listing.card} />
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Price:</span>
              <span className="text-sm font-bold">{listing.token_price} tokens</span>
            </div>
            <Button 
              onClick={() => handlePurchaseCard(listing.id)}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Purchase Card
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
