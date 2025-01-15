'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cancelListing, getUserListings } from "@/app/actions/trading";
import { GameCard } from "@/components/game-card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar } from "lucide-react";
import { TradeListingData } from "../types";
import { Database } from "@/types/database.types";

type TradeListingStatus = Database["public"]["Enums"]["trade_listing_status"];
import { format } from "date-fns";

interface UserListingsProps {
  userId: string;
}

export type UserListingsRef = {
  fetchListings: () => Promise<void>;
};

export const UserListings = forwardRef<UserListingsRef, UserListingsProps>(
  function UserListings({ userId }, ref) {
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

    useImperativeHandle(ref, () => ({
      fetchListings
    }), [fetchListings]);

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

    const getStatusBadgeVariant = (status: TradeListingStatus): "default" | "secondary" | "destructive" | "outline" => {
      switch (status) {
        case 'active':
          return 'default';
        case 'sold':
          return 'secondary';
        case 'cancelled':
          return 'destructive';
        default:
          return 'outline';
      }
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <Card key={listing.id} className="overflow-hidden">
              <div className="relative">
                <Badge 
                  className="absolute top-2 right-2 z-10" 
                  variant={getStatusBadgeVariant(listing.status)}
                >
                  {listing.status}
                </Badge>
                <GameCard card={listing.card} className="w-full" />
              </div>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Listed {format(new Date(listing.listed_at), 'MMM d, yyyy')}</span>
                    </div>
                    <Badge variant="outline" className="text-lg font-bold">
                      {listing.token_price} tokens
                    </Badge>
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
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }
);
