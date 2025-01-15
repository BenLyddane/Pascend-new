import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Wand2 } from "lucide-react";
import { CardStyle } from "@/types/game.types";

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

const PROMPT_EXAMPLES = [
  "A wise old tree spirit that grants wisdom to travelers",
  "A mischievous robot companion with a heart of gold",
  "A powerful storm elemental brewing chaos",
  "A gentle healer with mystical healing powers",
];

interface CardGenerationFormProps {
  prompt: string;
  style: CardStyle;
  isLoading: boolean;
  error: string | null;
  onPromptChange: (value: string) => void;
  onStyleChange: (value: CardStyle) => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export function CardGenerationForm({
  prompt,
  style,
  isLoading,
  error,
  onPromptChange,
  onStyleChange,
  onSubmit,
}: CardGenerationFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="prompt">Card Description</Label>
        <Textarea
          id="prompt"
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder={
            PROMPT_EXAMPLES[Math.floor(Math.random() * PROMPT_EXAMPLES.length)]
          }
          disabled={isLoading}
          className="min-h-[100px]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="style">Art Style</Label>
        <Select
          value={style}
          onValueChange={(value) => onStyleChange(value as CardStyle)}
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
    </form>
  );
}
