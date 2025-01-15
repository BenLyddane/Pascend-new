import { TradingCardData } from "@/app/protected/trading/types";
import { CardWithProperties } from "./types";
import { Database } from "@/types/database.types";

type EffectType = Database["public"]["Enums"]["effect_type"];

function normalizeEffectType(type: string): EffectType {
  switch (type) {
    case "on_turn_start":
    case "on_battle_start":
    case "on_attack":
    case "on_successful_attack":
    case "on_damage_received":
    case "on_damage_dealt":
    case "on_death":
      return type as EffectType;
    default:
      return "on_turn_start"; // Default fallback
  }
}

export function transformCardData(card: CardWithProperties): TradingCardData {
  const cardProperties = card.card_properties || [];
  
  return {
    ...card,
    special_effects: cardProperties.map((cp) => ({
      name: cp.special_properties.name,
      description: cp.special_properties.description,
      effect_type: normalizeEffectType(cp.special_properties.effect_type),
      effect_icon: cp.special_properties.effect_icon,
      value: cp.value ?? cp.special_properties.value ?? 0,
    })),
    special_properties: cardProperties.map(cp => ({
      allowed_rarities: cp.special_properties.allowed_rarities,
      combo_tags: cp.special_properties.combo_tags,
      created_at: cp.special_properties.created_at,
      description: cp.special_properties.description,
      effect_icon: cp.special_properties.effect_icon,
      effect_type: normalizeEffectType(cp.special_properties.effect_type),
      id: cp.special_properties.id,
      name: cp.special_properties.name,
      power_level: cp.special_properties.power_level,
      rarity_modifier: cp.special_properties.rarity_modifier,
      value: cp.value ?? cp.special_properties.value
    }))
  };
}

export const CARD_PROPERTIES_QUERY = `
  id,
  name,
  description,
  image_url,
  rarity,
  power,
  health,
  modifier,
  special_effects,
  created_at,
  edition,
  generated_with_purchased_tokens,
  is_active,
  user_id,
  keywords,
  card_properties:card_properties (
    value,
    special_properties:special_properties (
      name,
      description,
      effect_type,
      effect_icon,
      value,
      id,
      created_at,
      allowed_rarities,
      combo_tags,
      power_level,
      rarity_modifier
    )
  )
`;

export const LISTING_WITH_CARD_QUERY = `
  id,
  token_price,
  listed_at,
  seller_id,
  status,
  card_id,
  cards:cards (
    ${CARD_PROPERTIES_QUERY}
  )
`;
