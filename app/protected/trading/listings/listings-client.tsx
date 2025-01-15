'use client';

import { ListCardDialog } from "@/app/protected/trading/components/list-card-dialog";
import { UserListings, UserListingsRef } from "@/app/protected/trading/components/user-listings";
import { useCallback, useRef } from "react";
import { Database } from "@/types/database.types";

interface ListingsClientProps {
  userId: Database["public"]["Tables"]["users"]["Row"]["id"];
}

export function ListingsClient({ userId }: ListingsClientProps) {
  const userListingsRef = useRef<UserListingsRef>(null);

  const handleListingCreated = useCallback(() => {
    if (userListingsRef.current) {
      userListingsRef.current.fetchListings();
    }
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">My Listings</h1>
      
      <ListCardDialog 
        userId={userId} 
        onListingCreated={handleListingCreated} 
      />
      
      <div className="mt-4">
        <UserListings 
          ref={userListingsRef}
          userId={userId} 
        />
      </div>
    </div>
  );
}
