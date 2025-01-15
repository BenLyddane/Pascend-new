'use client';

import { ListCardDialog } from "@/app/protected/trading/components/list-card-dialog";
import { UserListings } from "@/app/protected/trading/components/user-listings";

interface ListingsClientProps {
  userId: string;
}

export function ListingsClient({ userId }: ListingsClientProps) {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">My Listings</h1>
      
      <ListCardDialog userId={userId} />
      
      <div className="mt-4">
        <UserListings userId={userId} />
      </div>
    </div>
  );
}
