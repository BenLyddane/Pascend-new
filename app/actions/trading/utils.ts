import { TradingCardData } from "@/app/protected/trading/types";
import { CardWithProperties } from "./types";

export function transformCardData(card: CardWithProperties): TradingCardData {
  return {
    ...card,
    special_effects: card.card_properties?.map((cp) => ({
      name: cp.special_properties.name,
      description: cp.special_properties.description,
      effect_type: cp.special_properties.effect_type,
      effect_icon: cp.special_properties.effect_icon,
      value: cp.value ?? cp.special_properties.value ?? 0,
    })) ?? []
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
      value
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
  cards!trade_listings_card_id_fkey (
    ${CARD_PROPERTIES_QUERY}
  )
`;
