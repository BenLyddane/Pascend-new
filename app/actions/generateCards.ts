"use server";

import { createClient } from "@/utils/supabase/server";
import {
  CardGenerationRequest,
  CardRarity,
  TempCard,
  CardStyle,
  SpecialProperty,
} from "@/types/game.types";
import aiConfig from "@/utils/ai/ai.json";
import { randomUUID } from "crypto";
import { saveImageToStorage } from "./saveImages";

// Helper to log debugging information
function debugLog(message: string, data?: any) {
  console.log(`[DEBUG]: ${message}`, data || "");
}

// Determine card rarity based on probabilities
function determineRarity(): CardRarity {
  const random = Math.random();
  if (random < 0.01) return "legendary"; // 1%
  if (random < 0.06) return "epic"; // 5%
  if (random < 0.26) return "rare"; // 20%
  return "common"; // 74%
}

// Generate card stats based on rarity
function generateRandomStats(rarity: CardRarity) {
  const rarityMultipliers = {
    common: 1,
    rare: 1.5,
    epic: 2,
    legendary: 2.5,
  };

  const modifierValues = {
    common: 1,
    rare: Math.random() < 0.5 ? 1 : 2,
    epic: Math.random() < 0.5 ? 2 : 3,
    legendary: 3,
  };

  const multiplier = rarityMultipliers[rarity];
  const modifier = modifierValues[rarity];

  return {
    power: Math.floor(Math.random() * 5 * multiplier) + 1,
    health: Math.floor(Math.random() * 5 * multiplier) + 1,
    modifier,
  };
}

// Fetch special properties based on rarity
async function getRandomPropertiesForRarity(
  rarity: CardRarity,
  supabase: any
): Promise<SpecialProperty[]> {
  const propertyCount = {
    common: 1,
    rare: 2,
    epic: 3,
    legendary: 4,
  };

  // Fetch all special properties
  const { data: properties, error } = await supabase
    .from("special_properties")
    .select("*");

  if (error) {
    console.error("Error fetching special properties:", error);
    return [];
  }

  debugLog("Fetched special properties", properties);

  // Filter properties by allowed rarities
  const filteredProperties = properties.filter((prop: SpecialProperty) =>
    prop.allowed_rarities?.includes(rarity) ?? false
  );

  if (filteredProperties.length === 0) {
    debugLog(`No special properties available for rarity: ${rarity}`);
  } else {
    debugLog(
      `Filtered special properties for rarity: ${rarity}`,
      filteredProperties
    );
  }

  // Shuffle and select a number of properties based on the card's rarity
  const shuffled = [...filteredProperties].sort(() => Math.random() - 0.5);
  const selectedProperties = shuffled.slice(0, propertyCount[rarity]);

  debugLog(`Selected special properties for rarity: ${rarity}`, selectedProperties);

  return selectedProperties;
}

// Generate card content using AI
async function generateCardContent(
  prompt: string,
  rarity: CardRarity,
  style: CardStyle
) {
  const stylePrompt = aiConfig.cardGeneration.stylePrompts[style];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: aiConfig.cardGeneration.model,
      messages: [
        {
          role: "system",
          content: aiConfig.cardGeneration.systemPrompt,
        },
        {
          role: "user",
          content: `
            Step 1: Generate a short, witty card name (1-4 words) based on the following concept: "${prompt}". 
            Include the rarity "${rarity}" and the style hint "${stylePrompt}" in your thinking, but keep the name short and fun.

            Step 2: Using that exact name, generate a concise, playful flavor text that references the name.

            Return only valid JSON in the format:
            {
              "name": "...",
              "description": "..."
            }
          `,
        },
      ],
      temperature: aiConfig.cardGeneration.temperature,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate card content");
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  debugLog("Generated card content", content);

  return JSON.parse(content);
}

// Generate card image using AI
async function generateImage(stylePrompt: string, description: string) {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      prompt: `${stylePrompt}. ${description}`,
      n: 1,
      size: aiConfig.cardGeneration.imageSize,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate image");
  }

  const data = await response.json();
  const imageUrl = data.data[0]?.url || "/api/placeholder/400/320";

  debugLog("Generated card image URL", imageUrl);

  return imageUrl;
}

// Main function to generate cards
import { deductTokenForCardGeneration, refundToken } from "./tokenActions";

export async function generateCards({
  prompt,
  style,
  userId,
  usePurchasedToken,
}: CardGenerationRequest): Promise<TempCard[]> {
  if (!prompt || !style || !userId) {
    throw new Error("Missing required parameters");
  }

  const supabase = await createClient();

  const cardsToGenerate = 3;
  let deductionResult;

  try {
    // Deduct token with specified type
    deductionResult = await deductTokenForCardGeneration(userId, usePurchasedToken);
    const generationId = randomUUID(); // Batch ID for the cards
    const generatedCards: TempCard[] = [];

    for (let i = 0; i < cardsToGenerate; i++) {
      const rarity = determineRarity();
      const stats = generateRandomStats(rarity);

      // Fetch special properties
      const specialEffects = await getRandomPropertiesForRarity(
        rarity,
        supabase
      );

      if (specialEffects.length === 0) {
        debugLog(`No special properties assigned for rarity: ${rarity}`);
      }

      // Generate card content and image
      const cardData = await generateCardContent(prompt, rarity, style);
      const stylePrompt = aiConfig.cardGeneration.stylePrompts[style];
      const dalleImageUrl = await generateImage(stylePrompt, cardData.description);

      // Save the DALL-E image to Supabase Storage
      const permanentImageUrl = await saveImageToStorage({
        imageUrl: dalleImageUrl,
        userId,
        cardName: cardData.name
      });

      debugLog("Final card data before insert", {
        name: cardData.name,
        description: cardData.description,
        image_url: permanentImageUrl,
        rarity,
        stats,
        specialEffects,
      });

      // Insert card into the database with the permanent image URL and purchased token flag
      const { data: insertedCard, error: insertError } = await supabase
        .from("temp_cards")
        .insert([
          {
            name: cardData.name,
            description: cardData.description,
            image_url: permanentImageUrl,
            rarity,
            power: stats.power,
            health: stats.health,
            modifier: stats.modifier || 1, // Ensure modifier is never null
            special_effects: specialEffects,
            user_id: userId,
            gen_id: generationId,
            generated_with_purchased_tokens: deductionResult.usedPurchasedToken
          },
        ])
        .select()
        .single();

      if (insertError) {
        console.error("Card insertion error:", insertError);
        throw new Error(`Failed to save generated card: ${insertError.message}`);
      }

      generatedCards.push(insertedCard);
    }

    return generatedCards;
  } catch (error) {
    console.error("Error generating cards:", error);
    // Attempt to refund the token if we had successfully deducted one
    if (deductionResult) {
      await refundToken(userId, deductionResult.usedPurchasedToken);
    }
    throw error;
  }
}
