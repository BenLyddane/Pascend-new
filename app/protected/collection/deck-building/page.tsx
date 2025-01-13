import { createClient } from "@/utils/supabase/server";
import { DeckBuilder } from "./components/DeckBuilder";
import { fetchCards, type PlayerCard } from "@/app/actions/fetchCards";
import { fetchDecks, type CardWithEffects } from "@/app/actions/fetchDecks";

export const dynamic = "force-dynamic";

export default async function DeckBuilderPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch cards and decks
  const [playerCards, decksResult] = await Promise.all([
    fetchCards(user.id),
    fetchDecks(user.id),
  ]);

  console.log('Player Cards:', JSON.stringify(playerCards, null, 2));

  // Transform Card[] to CardWithEffects[]
  const cards: CardWithEffects[] = playerCards.map(card => ({
    ...card,
    keywords: card.keywords || [],
    modifier: card.modifier || 0,
    is_active: card.is_active || false,
  }));

  console.log('Transformed Cards:', JSON.stringify(cards, null, 2));

  return (
    <main className="container mx-auto py-4">
      <DeckBuilder
        initialCards={cards}
        initialDecks={decksResult.decks}
        userId={user.id}
      />
    </main>
  );
}
