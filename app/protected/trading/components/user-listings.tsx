'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cancelListing, getUserListings } from "@/app/actions/trading";
import { GameCard } from "@/components/game-card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { TradeListingData } from "../types";
import { Database } from "@/types/database.types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

type TradeListingStatus = Database["public"]["Enums"]["trade_listing_status"];
import { format } from "date-fns";

const CARDS_PER_PAGE = 9;
type ValidRarity = "common" | "rare" | "epic" | "legendary";
const RARITY_ORDER: ValidRarity[] = ["legendary", "epic", "rare", "common"];

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
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [sortOption, setSortOption] = useState<"rarity" | "name" | "power" | "price">("rarity");
    const [filteredRarity, setFilteredRarity] = useState<"all" | "common" | "rare" | "epic" | "legendary">("all");
    const [currentPage, setCurrentPage] = useState(1);

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
        {/* Stats Section */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="flex flex-col items-center p-4 rounded-lg bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10">
            <span className="text-sm text-muted-foreground">Total Listings</span>
            <span className="text-2xl font-bold">{listings.length}</span>
          </div>
          <div className="flex flex-col items-center p-4 rounded-lg bg-accent/50">
            <span className="text-sm text-muted-foreground">Active Listings</span>
            <span className="text-2xl font-bold">
              {listings.filter(l => l.status === 'active').length}
            </span>
          </div>
          <div className="flex flex-col items-center p-4 rounded-lg bg-accent/50">
            <span className="text-sm text-muted-foreground">Total Value</span>
            <span className="text-2xl font-bold">
              {listings.reduce((sum, l) => sum + l.token_price, 0)} 🪙
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
                  <Badge 
                    className="absolute top-2 right-2 z-10" 
                    variant={getStatusBadgeVariant(listing.status)}
                  >
                    {listing.status}
                  </Badge>
                  <GameCard card={listing.card} />
                </div>
              </Card>

              <div className="flex flex-col gap-2 px-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4" />
                    <span>Listed {format(new Date(listing.listed_at), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-bold">{listing.token_price}</span>
                    <span>🪙</span>
                  </div>
                </div>

                {listing.status === 'active' && (
                  <Button 
                    onClick={() => handleCancelListing(listing.id)}
                    disabled={isLoading}
                    variant="destructive"
                    className="w-full h-9 text-sm"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Cancel Listing
                  </Button>
                )}
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
    );
  }
);
