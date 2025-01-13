"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUserTokens } from "@/app/actions/tokenActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { generateCards } from "@/app/actions/generateCards";
import { keepCard } from "@/app/actions/keepCard";
import { ClientTempCardCarousel } from "./temp-card-carousel";
import { TempCard, CardStyle } from "@/types/game.types";
import type { Database } from "@/types/database.types";
import { GameCard } from "@/components/game-card";

type Card = Database["public"]["Tables"]["cards"]["Row"];
type SpecialEffect = Database["public"]["Tables"]["special_properties"]["Row"];
import { Loader2, Wand2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const CARD_STYLES: CardStyle[] = [
  "Pixel Art",
  "Sci Fi",
  "Fantasy",
  "Cyberpunk",
  "Steampunk",
  "Anime",
  "Realistic",
  "Watercolor",
  "Art Nouveau",
  "Gothic",
  "Minimalist",
  "Pop Art",
  "Chibi",
  "Vaporwave",
  "Dark Fantasy",
  "Retrofuturism",
  "Comic Book",
  "Stained Glass",
  "Classical Oil",
  "Synthwave",
  "Low Poly",
  "Art Deco",
  "Studio Ghibli",
  "Cosmic Horror",
  "Tribal",
  "Street Art",
  "Biomechanical",
  "Impressionist",
  "Ethereal",
  "Abstract",
];

interface CreateCardFormProps {
  userId: string;
  initialTempCards: TempCard[];
}

export default function CreateCardForm({
  userId,
  initialTempCards,
}: CreateCardFormProps) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [tokens, setTokens] = useState<number | null>(null);
  const [style, setStyle] = useState<CardStyle>(CARD_STYLES[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [generatedCards, setGeneratedCards] = useState<TempCard[]>(initialTempCards);
  const [currentNewCards, setCurrentNewCards] = useState<TempCard[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [generatingCount, setGeneratingCount] = useState(0);
  const TOTAL_CARDS = 3; // Number of cards to generate

  // Estimated time for DALL-E 3 to generate 3 images is around 30-45 seconds
  const updateProgress = () => {
    const interval = setInterval(() => {
      setProgress(prev => {
        // Progress phases:
        // 0-10%: Initial setup
        // 10-30%: Generating first card
        // 30-60%: Generating second card
        // 60-90%: Generating third card
        // 90-95%: Processing and saving
        if (prev < 10) return prev + 2;
        if (prev < 30) return prev + 0.5;
        if (prev < 60) return prev + 0.5;
        if (prev < 90) return prev + 0.5;
        if (prev < 95) return prev + 0.1;
        return prev;
      });
    }, 500);

    return () => clearInterval(interval);
  };

  useEffect(() => {
    const loadTokens = async () => {
      try {
        const tokenCount = await getUserTokens(userId);
        setTokens(tokenCount);
      } catch (error) {
        console.error("Failed to load tokens:", error);
        setError("Failed to load token balance");
      }
    };
    loadTokens();
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) {
      setError("Please enter a description for your card");
      return;
    }

    if (!tokens || tokens < 1) {
      setError("You need at least 1 token to generate cards");
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratingCount(TOTAL_CARDS);
    setProgress(0);

    try {
      // Optimistically update token count to prevent race conditions
      setTokens((prev) => (prev !== null ? prev - 1 : null));

      const progressCleanup = updateProgress();
      const newCards = await generateCards({ prompt, style, userId });
      
      // Move current new cards to the main list
      setGeneratedCards(prevCards => {
        if (currentNewCards.length > 0) {
          return [...newCards, ...currentNewCards, ...prevCards.filter(card => 
            !currentNewCards.some(newCard => newCard.id === card.id)
          )];
        }
        return [...newCards, ...prevCards];
      });
      
      // Set the new cards as current
      setCurrentNewCards(newCards);
      
      setProgress(100);
      progressCleanup();
    } catch (error) {
      // Revert token count on error
      const currentTokens = await getUserTokens(userId);
      setTokens(currentTokens);
      setError(
        error instanceof Error ? error.message : "Failed to generate cards"
      );
    } finally {
      setIsLoading(false);
      setGeneratingCount(0);
      setTimeout(() => setProgress(0), 500);
    }
  };

  const handleKeepCard = async (cardId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await keepCard({ keptCardId: cardId, userId });
      setSavedCount((prev) => prev + 1);

      // Find the kept card to get its gen_id
      const keptCard = generatedCards.find((card) => card.id === cardId);
      if (!keptCard) return;

      // Remove all cards with the same gen_id from both current new cards and generated cards
      setCurrentNewCards(prev => 
        prev.filter(card => card.gen_id !== keptCard.gen_id)
      );
      
      setGeneratedCards((prevCards) =>
        prevCards.filter((card) => card.gen_id !== keptCard.gen_id)
      );

      // Refresh the router to update the collection
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to save the card"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleStyleChange = (newStyle: string) => {
    setStyle(newStyle as CardStyle);
  };

  const PROMPT_EXAMPLES = [
    "A wise old tree spirit that grants wisdom to travelers",
    "A mischievous robot companion with a heart of gold",
    "A powerful storm elemental brewing chaos",
    "A gentle healer with mystical healing powers",
  ];

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Card</CardTitle>
        <CardDescription>
          Design your own unique card by describing it and choosing an art
          style.
        </CardDescription>
        <div className="mt-2 text-sm">
          {tokens !== null && (
            <div className="flex items-center justify-between">
              <span>Available Tokens: {tokens}</span>
              {tokens === 0 && (
                <Link
                  href="/protected/profile"
                  className="text-blue-500 hover:text-blue-700 underline"
                >
                  Buy More Tokens
                </Link>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="prompt">Card Description</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                PROMPT_EXAMPLES[
                  Math.floor(Math.random() * PROMPT_EXAMPLES.length)
                ]
              }
              disabled={isLoading}
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="style">Art Style</Label>
            <Select
              value={style}
              onValueChange={handleStyleChange}
              disabled={isLoading}
            >
              <SelectTrigger id="style">
                <SelectValue placeholder="Select a style" />
              </SelectTrigger>
              <SelectContent>
                {CARD_STYLES.map((styleOption) => (
                  <SelectItem key={styleOption} value={styleOption}>
                    {styleOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Generate Cards
              </>
            )}
          </Button>

          {isLoading && (
            <div className="space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-center text-muted-foreground">
                {progress < 10 && "Initializing..."}
                {progress >= 10 && progress < 30 && "Generating first card..."}
                {progress >= 30 && progress < 60 && "Generating second card..."}
                {progress >= 60 && progress < 90 && "Generating third card..."}
                {progress >= 90 && "Processing and saving..."}
                {" " + Math.round(progress)}%
              </p>
            </div>
          )}
        </form>

        {/* Show loading placeholders while generating */}
        {generatingCount > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: generatingCount }).map((_, index) => (
              <div key={`loading-${index}`} className="flex flex-col space-y-4">
                <div className="w-full aspect-[3/4] bg-muted animate-pulse rounded-lg flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Show newly generated cards section */}
        {currentNewCards.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Recently Generated Cards</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentNewCards.map((card) => (
                <div key={card.id} className="flex flex-col space-y-4">
                  <div className="relative">
                    <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs">
                      New
                    </div>
                    <GameCard 
                      card={{
                        ...card,
                        edition: "standard",
                        is_active: true,
                        keywords: [],
                        user_id: userId,
                        special_effects: card.special_effects
                      }}
                    />
                  </div>
                  <Button
                    onClick={() => handleKeepCard(card.id)}
                    disabled={isLoading}
                    className="w-full"
                  >
                    Keep Card
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Show carousel for older cards */}
        {generatedCards.length > currentNewCards.length && (
          <>
            <div className="my-8 flex items-center">
              <div className="flex-grow h-px bg-border"></div>
              <span className="px-4 text-sm text-muted-foreground">Previously Generated Cards</span>
              <div className="flex-grow h-px bg-border"></div>
            </div>
            <ClientTempCardCarousel 
              cards={generatedCards.filter(card => 
                !currentNewCards.some(newCard => newCard.id === card.id)
              )} 
              userId={userId} 
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
