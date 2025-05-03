"use client";

import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Link from "next/link";
import PracticeMode from "../components/practice-mode";

export default function PracticeModePage() {
  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Play Mode</h1>
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-green-500 to-teal-500
                     hover:from-green-600 hover:to-teal-600
                     text-white shadow-lg transition-all hover:scale-105"
          >
            <a href="/protected/collection/deck-building">
              <PlusCircle className="mr-2 h-5 w-5" />
              My Decks
            </a>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <Link href="/protected/play/practice">
            <div className="p-6 rounded-lg border-2 border-primary bg-primary/10 cursor-pointer">
              <div className="font-semibold text-xl mb-2">Practice Mode</div>
              <p className="text-muted-foreground">
                Play against yourself to test deck combinations. Ban cards, reorder your deck, and watch the auto-battle unfold!
              </p>
            </div>
          </Link>

          <Link href="/protected/play/multiplayer">
            <div className="p-6 rounded-lg border-2 border-muted cursor-pointer">
              <div className="font-semibold text-xl mb-2">Ranked Multiplayer</div>
              <p className="text-muted-foreground">
                Battle against other players online. Ban cards, reorder your deck, and climb the ranks!
              </p>
            </div>
          </Link>
        </div>

        {/* Practice mode component */}
        <div className="mt-8">
          <PracticeMode />
        </div>
      </div>
    </div>
  );
}
