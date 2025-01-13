import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import CollectionClient from "./collection-client";

type CardData = {
  id: string;
  name: string;
  description: string;
  rarity: string;
  power: number;
  health: number;
  modifier: number;
  image_url: string;
  special_effects: Array<{
    id: string;
    name: string;
    description: string;
    value?: number;
  }>;
};

// Server-side function to fetch user cards
async function fetchUserCards(userId: string): Promise<CardData[]> {
  const supabase = await createClient();
  const { data: userCards, error } = await supabase
    .from("cards")
    .select(
      `
      id,
      name,
      description,
      rarity,
      power,
      health,
      modifier,
      image_url,
      special_effects
    `
    )
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching cards:", error);
    return [];
  }

  return userCards || [];
}

export default async function CollectionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
    return null;
  }

  const userCards = await fetchUserCards(user.id);

  if (userCards.length === 0) {
    return (
      <div className="flex flex-col items-center py-8">
        <div>No cards found</div>
        <Link href="/protected/collection/create-cards">
          <Button
            size="lg"
            className="mt-4 bg-gradient-to-r from-purple-500 to-blue-500
                       hover:from-purple-600 hover:to-blue-600
                       text-white shadow-lg transition-all hover:scale-105"
          >
            <PlusCircle className="mr-2 h-5 w-5" />
            Create New Card
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      {/* Header Buttons */}
      <div className="flex justify-between items-center mb-8">
        {/* Build Deck Button */}
        <Link href="/protected/collection/deck-building">
          <Button
            size="lg"
            className="bg-gradient-to-r from-green-500 to-teal-500
                       hover:from-green-600 hover:to-teal-600
                       text-white shadow-lg transition-all hover:scale-105"
          >
            <PlusCircle className="mr-2 h-5 w-5" />
            My Decks
          </Button>
        </Link>

        {/* Create New Card Button */}
        <Link href="/protected/collection/create-cards">
          <Button
            size="lg"
            className="bg-gradient-to-r from-purple-500 to-blue-500
                       hover:from-purple-600 hover:to-blue-600
                       text-white shadow-lg transition-all hover:scale-105"
          >
            <PlusCircle className="mr-2 h-5 w-5" />
            Create New Card
          </Button>
        </Link>
      </div>

      {/* Render client component */}
      <Card>
        <CardContent className="pt-6">
          <CollectionClient userCards={userCards} />
        </CardContent>
      </Card>
    </div>
  );
}
