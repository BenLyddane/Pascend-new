"use client";

import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { BombIcon, SwordIcon, ShieldIcon, FlameIcon, HeartIcon, RefreshCwIcon, CheckSquareIcon } from "lucide-react";

export default function RulesPage() {
  return (
    <ScrollArea className="h-[calc(100vh-12rem)] pr-6">
      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Game Overview</h2>
          <p className="text-muted-foreground mb-4">
            Battle with unique cards in turn-based combat. Each card has power and health stats, along with special abilities that can turn the tide of battle.
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Game Setup</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Deck Submission</h3>
              <p className="text-muted-foreground">
                1. Each player submits a deck of five cards<br />
                2. Players can see their opponent&apos;s submitted cards<br />
                3. Each player bans two cards from their opponent&apos;s deck<br />
                4. Players arrange their remaining three cards in their preferred battle order
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Turn Order</h3>
              <p className="text-muted-foreground">
                The game randomly determines which player goes first. Once both players have set their card order, the battle will automatically process through each turn until completion.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Card Order</h3>
              <p className="text-muted-foreground">
                The order you arrange your cards is crucial as they will battle in that sequence. Consider card synergies and potential matchups when deciding your order. Once the order is set, it cannot be changed during the battle.
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Basic Rules</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Turn Structure</h3>
              <p className="text-muted-foreground">
                Each turn is automatically processed in this order:<br />
                1. Start of turn effects trigger<br />
                2. Combat phase occurs<br />
                3. End of turn effects trigger
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Combat</h3>
              <p className="text-muted-foreground">
                - Cards deal damage equal to their power<br />
                - Damage reduces the opponent&apos;s health<br />
                - Cards are defeated when health reaches 0<br />
                - Combat effects can modify damage dealt/received
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Special Effects</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <SwordIcon className="w-5 h-5 mt-1 text-red-500" />
              <div>
                <h3 className="font-semibold">Attack Effects</h3>
                <p className="text-muted-foreground">Increases attack power during combat. Applied before damage calculation.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <ShieldIcon className="w-5 h-5 mt-1 text-blue-500" />
              <div>
                <h3 className="font-semibold">Defense Effects</h3>
                <p className="text-muted-foreground">Reduces incoming damage. Can protect against powerful attacks.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <BombIcon className="w-5 h-5 mt-1 text-yellow-500" />
              <div>
                <h3 className="font-semibold">Explosive Effects</h3>
                <p className="text-muted-foreground">Deals additional damage or has powerful combat impacts.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <HeartIcon className="w-5 h-5 mt-1 text-pink-500" />
              <div>
                <h3 className="font-semibold">Life Drain</h3>
                <p className="text-muted-foreground">Gains power from dealing damage. Stacks with each successful hit.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FlameIcon className="w-5 h-5 mt-1 text-orange-500" />
              <div>
                <h3 className="font-semibold">Damage Over Time</h3>
                <p className="text-muted-foreground">Applies continuous damage effects that trigger each turn.</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Effect Timing</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <RefreshCwIcon className="w-5 h-5 mt-1" />
              <div>
                <h3 className="font-semibold">Turn Start Effects</h3>
                <p className="text-muted-foreground">Trigger at the beginning of your turn, before any actions.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <SwordIcon className="w-5 h-5 mt-1" />
              <div>
                <h3 className="font-semibold">Combat Effects</h3>
                <p className="text-muted-foreground">Activate during combat in this order:<br />
                1. Pre-combat effects (power boosts, reductions)<br />
                2. Combat damage calculation<br />
                3. Post-combat effects (life drain, etc.)</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckSquareIcon className="w-5 h-5 mt-1" />
              <div>
                <h3 className="font-semibold">Turn End Effects</h3>
                <p className="text-muted-foreground">Resolve at the end of your turn, after all actions are complete.</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Victory Conditions</h2>
          <p className="text-muted-foreground mb-4">
            Win the game by defeating all of your opponent&apos;s cards. A card is defeated when its health reaches 0.
            Some special effects may trigger when a card is defeated, potentially turning a near-defeat into victory.
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Advanced Mechanics</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Effect Stacking</h3>
              <p className="text-muted-foreground">
                - Multiple effects of the same type can stack<br />
                - Life Drain effects accumulate with each hit<br />
                - Power modifiers are calculated before combat
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Card Modifiers</h3>
              <p className="text-muted-foreground">
                Cards can have positive modifiers that increase their effect values, making their special abilities more powerful in battle.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Counter Attacks</h3>
              <p className="text-muted-foreground">
                When a card is attacked, it will counter-attack the opposing card, potentially defeating it in return.
                All combat effects apply during counter-attacks as well.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </ScrollArea>
  );
}
