'use client';

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarketListings } from "@/app/protected/trading/components/market-listings";
import { UserListings } from "@/app/protected/trading/components/user-listings";
import { ListCardDialog } from "@/app/protected/trading/components/list-card-dialog";

interface TradingClientProps {
  userId: string;
}

export default function TradingClient({ userId }: TradingClientProps) {
  const [key, setKey] = useState<number>(0);

  const handleListingCreated = () => {
    // Force re-render of both listings components
    setKey((prev: number) => prev + 1);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Trading Center</h1>
      
      <ListCardDialog userId={userId} onListingCreated={handleListingCreated} />

      <Tabs defaultValue="market" className="w-full mt-8" key={key}>
        <TabsList className="mb-4">
          <TabsTrigger value="market">Card Market</TabsTrigger>
          <TabsTrigger value="my-listings">My Listings</TabsTrigger>
        </TabsList>

        <TabsContent value="market">
          <MarketListings userId={userId} />
        </TabsContent>

        <TabsContent value="my-listings">
          <UserListings userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
