import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GameCard } from "@/components/game-card";
import Link from "next/link";
import type { CardWithEffects } from "@/app/actions/fetchDecks";

export default function Hero() {
  // Example cards with all required fields
  const exampleCards: CardWithEffects[] = [
    {
      id: "04f84989",
      name: "Retro Rocketeer",
      description: "Ready to write the next rock of the world and a dash of nostalgia, this card will fling you into a future past.",
      image_url: "https://ffooujlmsrztfxlsdsip.supabase.co/storage/v1/object/public/card-images/c9280311-0880-4c00-b96d-7c895f1a6153/24ae4233-8cda-4d8e-ac62-3038485e24f3-retro-rocketeer.jpg",
      rarity: "common",
      power: 4,
      health: 1,
      modifier: 1,
      created_at: null,
      edition: "standard",
      generated_with_purchased_tokens: false,
      is_active: true,
      keywords: [],
      user_id: "system",
      special_effects: [
        {
          name: "Sonic Wave",
          description: "Deal {value} damage to all enemies",
          effect_type: "on_attack",
          effect_icon: "💥",
          value: 2,
        }
      ]
    },
    {
      id: "142e35b6",
      name: "Blade Ballet",
      description: "When it raises its sword, time itself seems to dance.",
      image_url: "https://ffooujlmsrztfxlsdsip.supabase.co/storage/v1/object/public/card-images/a0b2c7cb-bc5a-42c9-9c8a-35b1b4dda0a8/765bc8c2-5220-4ac8-8a01-8ece9303e490-blade-ballet.jpg",
      rarity: "epic",
      power: 4,
      health: 1,
      modifier: 2,
      created_at: null,
      edition: "standard",
      generated_with_purchased_tokens: false,
      is_active: true,
      keywords: [],
      user_id: "system",
      special_effects: [
        {
          name: "Time Dance",
          description: "Increase speed by {value}",
          effect_type: "on_turn_start",
          effect_icon: "✨",
          value: 3,
        }
      ]
    },
    {
      id: "202cf41c",
      name: "Robo Rainbow Brew",
      description: "It's not every day you see a robot mastering the art of the hypercolor brew. But that's what we call a pot of gold 2.0",
      image_url: "https://ffooujlmsrztfxlsdsip.supabase.co/storage/v1/object/public/card-images/a0b2c7cb-bc5a-42c9-9c8a-35b1b4dda0a8/77ae6818-3c1a-48c3-8561-796358042abc-robo-rainbow-brew.jpg",
      rarity: "epic",
      power: 8,
      health: 1,
      modifier: 2,
      created_at: null,
      edition: "standard",
      generated_with_purchased_tokens: false,
      is_active: true,
      keywords: [],
      user_id: "system",
      special_effects: [
        {
          name: "Rainbow Protocol",
          description: "Boost allies by {value}",
          effect_type: "on_battle_start",
          effect_icon: "⬆️",
          value: 2,
        }
      ]
    }
  ];

  return (
    <div className="flex flex-col gap-16 items-center">
      {/* Hero Section */}
      <div className="relative w-full min-h-[600px] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-700">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
        <div className="relative flex flex-col items-center space-y-8 px-4">
          <h1 className="text-7xl font-bold tracking-tighter text-white bg-clip-text">
            PASCEND
          </h1>
          <p className="text-xl text-white/90 text-center max-w-2xl tracking-wide">
            Welcome to the next evolution of trading card games. Create unique AI-generated cards,
            build powerful decks, and compete in strategic battles to ascend to greatness.
          </p>
          <div className="flex gap-4">
            <Link href="/protected/collection/create-cards">
              <Button
                size="lg"
                className="bg-white text-indigo-600 hover:bg-white/90 tracking-wide"
              >
                Start Playing
              </Button>
            </Link>
            <Link href="/protected/profile/rules">
              <Button 
                size="lg" 
                variant="outline" 
                className="tracking-wide border-white text-white hover:bg-white/10"
              >
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Example Cards Section */}
      <div className="w-full max-w-6xl px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Featured Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
          {exampleCards.map((card) => (
            <GameCard key={card.id} card={card} />
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <div className="w-full max-w-6xl px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Game Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="group hover:border-foreground/50 transition-colors">
            <CardContent className="p-6 space-y-3">
              <h3 className="text-xl font-semibold tracking-tight">
                AI Card Generation
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Create your own unique cards with custom artwork and abilities using advanced AI technology.
                Every card you generate becomes a permanent part of your collection.
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:border-foreground/50 transition-colors">
            <CardContent className="p-6 space-y-3">
              <h3 className="text-xl font-semibold tracking-tight">
                Trading Marketplace
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Buy, sell, and trade your generated cards with other players in our dynamic marketplace.
                Build your dream collection through strategic trading.
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:border-foreground/50 transition-colors">
            <CardContent className="p-6 space-y-3">
              <h3 className="text-xl font-semibold tracking-tight">
                Strategic Gameplay
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Engage in tactical battles with unique mechanics. Build powerful decks and outmaneuver
                your opponents in intense duels.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Call to Action */}
      <div className="w-full py-20 bg-gradient-to-r from-violet-600 to-indigo-600">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Pascend?</h2>
          <p className="text-xl text-white/90 mb-8">
            Start creating your unique cards and building your collection today.
          </p>
          <Link href="/protected/collection/create-cards">
            <Button
              size="lg"
              className="bg-white text-indigo-600 hover:bg-white/90 tracking-wide"
            >
              Create Your First Card
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
