import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function Hero() {
  return (
    <div className="flex flex-col gap-12 items-center">
      <div className="flex flex-col items-center space-y-6">
        <h1 className="text-6xl font-bold tracking-tighter">PASCEND</h1>
        <p className="text-xl text-muted-foreground text-center max-w-2xl tracking-wide">
          Enter a world of strategic card battles where every decision counts.
          Build your deck, challenge players, and ascend to greatness.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        <Card className="group hover:border-foreground/50 transition-colors">
          <CardContent className="p-6 space-y-3">
            <h3 className="text-xl font-semibold tracking-tight">
              AI-Generated Cards
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Discover unique cards with dynamic powers and abilities created by
              AI.
            </p>
          </CardContent>
        </Card>

        <Card className="group hover:border-foreground/50 transition-colors">
          <CardContent className="p-6 space-y-3">
            <h3 className="text-xl font-semibold tracking-tight">
              Real-Time Battles
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Engage in intense real-time duels with players from around the
              world.
            </p>
          </CardContent>
        </Card>

        <Card className="group hover:border-foreground/50 transition-colors">
          <CardContent className="p-6 space-y-3">
            <h3 className="text-xl font-semibold tracking-tight">
              Strategic Depth
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              Master complex game mechanics and create powerful card
              combinations.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <Link href="/sign-up">
          <Button
            size="lg"
            className="bg-foreground text-background hover:bg-foreground/90 tracking-wide"
          >
            Start Playing
          </Button>
        </Link>
        <Link href="/learn">
          <Button size="lg" variant="outline" className="tracking-wide">
            Learn More
          </Button>
        </Link>
      </div>

      <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />
    </div>
  );
}
