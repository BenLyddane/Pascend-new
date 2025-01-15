import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import CollectionClient from "./collection-client";
import { fetchCards, mergeSpecialEffects } from "@/app/actions/fetchCards";

export default async function CollectionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
    return null;
  }

  const cards = await fetchCards(user.id);
  const userCards = cards.map(mergeSpecialEffects);

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
