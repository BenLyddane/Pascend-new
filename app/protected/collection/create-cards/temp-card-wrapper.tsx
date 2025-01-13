import { Suspense } from "react";
import { ClientTempCardCarousel } from "./temp-card-carousel";
import { TempCard } from "@/types/game.types";

interface TempCardWrapperProps {
  cards: TempCard[];
  userId: string;
}

export default function TempCardWrapper({
  cards,
  userId,
}: TempCardWrapperProps) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-8">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="text-sm text-muted-foreground">Loading cards...</p>
          </div>
        </div>
      }
    >
      <ClientTempCardCarousel cards={cards} userId={userId} />
    </Suspense>
  );
}
