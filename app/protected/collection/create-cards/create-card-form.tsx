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
import { Loader2, Wand2 } from "lucide-react";
import { CardWithEffects } from "@/app/actions/fetchDecks";
import { Textarea } from "@/components/ui/textarea";
import { convertToBaseCardEffects } from "@/app/utils/card-helpers";
import { createClient } from "@/utils/supabase/client";
import { Switch } from "@/components/ui/switch";

type TokenTransaction = {
  amount: number;
  is_purchased: boolean;
};

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
  const [tokens, setTokens] = useState<{
    total: number;
    purchased: number;
    free: number;
  } | null>(null);
  const [usePurchasedToken, setUsePurchasedToken] = useState(false);

  // Set initial token type based on availability
  useEffect(() => {
    if (tokens) {
      // Default to free tokens if available
      if (tokens.free > 0) {
        setUsePurchasedToken(false);
      } else if (tokens.purchased > 0) {
        setUsePurchasedToken(true);
      }
    }
  }, [tokens]);
  const [style, setStyle] = useState<CardStyle>(CARD_STYLES[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [generatedCards, setGeneratedCards] =
    useState<TempCard[]>(initialTempCards);
  const [currentNewCards, setCurrentNewCards] = useState<TempCard[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [generatingCount, setGeneratingCount] = useState(0);
  const TOTAL_CARDS = 3; // Number of cards to generate

  // Estimated time for DALL-E 3 to generate 3 images is around 30-45 seconds
  const updateProgress = () => {
    const interval = setInterval(() => {
      setProgress((prev) => {
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
        const supabase = createClient();
        const { data: profile } = await supabase
          .from("player_profiles")
          .select("tokens, purchased_tokens")
          .eq("user_id", userId)
          .single();

        if (profile) {
          const totalTokens = (profile.tokens || 0) + (profile.purchased_tokens || 0);
          setTokens({
            total: totalTokens,
            purchased: profile.purchased_tokens || 0,
            free: profile.tokens || 0,
          });
        }
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

    if (
      !tokens ||
      (usePurchasedToken ? tokens.purchased < 1 : tokens.free < 1)
    ) {
      setError("You need at least 1 token to generate cards");
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratingCount(TOTAL_CARDS);
    setProgress(0);

    try {
      const progressCleanup = updateProgress();
      const newCards = await generateCards({ prompt, style, userId, usePurchasedToken });
      
      // Refresh token count after generation
      const tokenData = await getUserTokens(userId);
      setTokens({
        total: tokenData.tokens + tokenData.purchasedTokens,
        purchased: tokenData.purchasedTokens,
        free: tokenData.tokens,
      });

      // Move current new cards to the main list
      setGeneratedCards((prevCards) => {
        if (currentNewCards.length > 0) {
          return [
            ...newCards,
            ...currentNewCards,
            ...prevCards.filter(
              (card) =>
                !currentNewCards.some((newCard) => newCard.id === card.id)
            ),
          ];
        }
        return [...newCards, ...prevCards];
      });

      // Set the new cards as current
      setCurrentNewCards(newCards);

      setProgress(100);
      progressCleanup();
    } catch (error) {
      // Revert token count on error
      const tokenData = await getUserTokens(userId);
      setTokens({
        total: tokenData.tokens + tokenData.purchasedTokens,
        purchased: tokenData.purchasedTokens,
        free: tokenData.tokens,
      });
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
      setCurrentNewCards((prev) =>
        prev.filter((card) => card.gen_id !== keptCard.gen_id)
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
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div>
                    <div>Total Tokens: {tokens.total}</div>
                    <div className="flex items-center space-x-4 mt-2">
                      <div className="text-sm">
                        <div>Purchased: {tokens.purchased}</div>
                        <div>Free: {tokens.free}</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          id="token-type"
                          checked={!usePurchasedToken}
                          onCheckedChange={(checked) => {
                            // Only allow switching if tokens are available
                            if (checked && tokens?.free === 0) return;
                            if (!checked && tokens?.purchased === 0) return;
                            setUsePurchasedToken(!checked);
                          }}
                          disabled={(usePurchasedToken && tokens?.purchased === 0) || (!usePurchasedToken && tokens?.free === 0)}
                        />
                        <Label htmlFor="token-type" className="text-sm">
                          Use Free Tokens
                        </Label>
                      </div>
                    </div>
                    <div className="text-sm mt-1">
                      {usePurchasedToken ? (
                        <span className="text-green-500">
                          Next card will be tradeable (using purchased token)
                        </span>
                      ) : (
                        <span className="text-yellow-500">
                          Next card will not be tradeable (using free token)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {(tokens.total === 0 || (usePurchasedToken && tokens.purchased === 0) || (!usePurchasedToken && tokens.free === 0)) && (
                  <Link
                    href="/protected/tokens"
                    className="text-blue-500 hover:text-blue-700 underline"
                  >
                    Buy More Tokens
                  </Link>
                )}
              </div>
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
                    <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs z-10">
                      New
                    </div>
                    <GameCard
                      card={
                        {
                          ...card,
                          edition: "standard",
                          is_active: true,
                          keywords: [],
                          user_id: userId,
                          generated_with_purchased_tokens: usePurchasedToken,
                          image_url: card.image_url || null,
                          created_at: card.created_at || null,
                          special_effects: convertToBaseCardEffects(
                            card.special_effects
                          ),
                          special_properties: [],
                        } satisfies CardWithEffects
                      }
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
              <span className="px-4 text-sm text-muted-foreground">
                Previously Generated Cards
              </span>
              <div className="flex-grow h-px bg-border"></div>
            </div>
            <ClientTempCardCarousel
              cards={generatedCards.filter(
                (card) =>
                  !currentNewCards.some((newCard) => newCard.id === card.id)
              )}
              userId={userId}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
