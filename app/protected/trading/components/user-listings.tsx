'use client';

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cancelListing, getUserListings } from "@/app/actions/trading";
import { TradingCard } from "./trading-card";
import { Loader2 } from "lucide-react";
import { TradeListingData } from "../types";

interface UserListingsProps {
  userId: string;
}

export function UserListings({ userId }: UserListingsProps) {
  const { toast } = useToast();
  const [listings, setListings] = useState<TradeListingData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const fetchListings = useCallback(async () => {
    try {
      const userListings = await getUserListings(userId);
      setListings(userListings);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch your listings",
        variant: "destructive",
      });
    } finally {
      setIsInitialLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleCancelListing = async (listingId: string) => {
    setIsLoading(true);
    try {
      await cancelListing(userId, listingId);
      toast({
        title: "Success",
        description: "Listing cancelled successfully",
      });
      fetchListings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel listing",
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
        You haven't listed any cards for trading
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
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Status:</span>
              <span className="text-sm font-medium capitalize">{listing.status}</span>
            </div>
            {listing.status === 'active' && (
              <Button 
                onClick={() => handleCancelListing(listing.id)}
                disabled={isLoading}
                variant="destructive"
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Cancel Listing
              </Button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
