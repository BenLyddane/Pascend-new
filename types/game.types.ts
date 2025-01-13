import { Database } from "./database.types";

// Extract base types from database schema
type DbTempCard = Database["public"]["Tables"]["temp_cards"]["Row"];
type DbSpecialProperty = Database["public"]["Tables"]["special_properties"]["Row"];

// Card rarity type based on the database schema
export type CardRarity = "common" | "rare" | "epic" | "legendary";

// Card style for generation based on ai.json stylePrompts
export type CardStyle = 
  | "Pixel Art" 
  | "Sci Fi" 
  | "Fantasy" 
  | "Cyberpunk" 
  | "Steampunk" 
  | "Anime" 
  | "Realistic" 
  | "Watercolor" 
  | "Art Nouveau" 
  | "Gothic" 
  | "Minimalist" 
  | "Pop Art" 
  | "Chibi" 
  | "Vaporwave" 
  | "Dark Fantasy" 
  | "Retrofuturism" 
  | "Comic Book" 
  | "Stained Glass" 
  | "Classical Oil" 
  | "Synthwave" 
  | "Low Poly" 
  | "Art Deco" 
  | "Studio Ghibli" 
  | "Cosmic Horror" 
  | "Tribal" 
  | "Street Art" 
  | "Biomechanical" 
  | "Impressionist" 
  | "Ethereal" 
  | "Abstract";

// Special property type based on database schema
export type SpecialProperty = DbSpecialProperty;

// Card generation request type
export type CardGenerationRequest = {
  prompt: string;
  style: CardStyle;
  userId: string;
};

// Temp card type based on database schema
export type TempCard = DbTempCard;
