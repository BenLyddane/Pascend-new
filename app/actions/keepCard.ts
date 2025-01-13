"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { TempCard } from "@/types/game.types";

// Helper function to extract filename from Supabase Storage URL
function getFilenameFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    // Get the last segment of the path (filename)
    const segments = pathname.split('/');
    return segments[segments.length - 1];
  } catch (error) {
    console.error("Error parsing URL:", error);
    return null;
  }
}

// Helper function to delete image from storage
async function deleteImageFromStorage(
  supabase: any,
  imageUrl: string,
  userId: string
): Promise<void> {
  try {
    const filename = getFilenameFromUrl(imageUrl);
    if (!filename) return;

    const filePath = `${userId}/${filename}`;
    const { error } = await supabase
      .storage
      .from('card-images')
      .remove([filePath]);

    if (error) {
      console.error("Error deleting image from storage:", error);
    }
  } catch (error) {
    console.error("Error in deleteImageFromStorage:", error);
  }
}

export async function keepCard({
  keptCardId,
  userId,
}: {
  keptCardId: string;
  userId: string;
}) {
  const cookieStore = cookies();
  const supabase = await createClient();

  try {
    // 1. Fetch all temp cards from this generation to get their image URLs
    const { data: tempCards, error: fetchError } = await supabase
      .from("temp_cards")
      .select("*")
      .eq("user_id", userId)
      .eq("id", keptCardId)
      .single();

    if (fetchError || !tempCards) {
      console.error("Fetch error:", fetchError);
      throw new Error("Failed to retrieve kept card");
    }

    // Get all other cards from the same generation
    const { data: otherCards, error: otherCardsError } = await supabase
      .from("temp_cards")
      .select("*")
      .eq("user_id", userId)
      .eq("gen_id", tempCards.gen_id)
      .neq("id", keptCardId);

    // 2. Prepare the card data for insertion
    const cardData = {
      name: tempCards.name,
      description: tempCards.description,
      image_url: tempCards.image_url,
      power: tempCards.power,
      health: tempCards.health,
      mana_cost: tempCards.mana_cost,
      rarity: tempCards.rarity,
      keywords: tempCards.keywords || [],
      special_effects: tempCards.special_effects || [],
      modifier: tempCards.modifier,
      user_id: userId,
      created_at: new Date().toISOString(),
      is_active: true,
      edition: tempCards.edition || "standard",
    };

    // 3. Insert the permanent card and handle special properties
    const { data: insertedCard, error: insertError } = await supabase
      .from("cards")
      .insert(cardData)
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error(`Failed to save kept card: ${insertError.message}`);
    }

    // 3a. Handle special properties
    if (tempCards.special_effects && Array.isArray(tempCards.special_effects)) {
      for (const effect of tempCards.special_effects) {
        // First, get or create the special property
        const { data: specialProperty, error: specialPropertyError } = await supabase
          .from("special_properties")
          .select("*")
          .eq("name", effect.name)
          .single();

        if (specialPropertyError && specialPropertyError.code !== 'PGRST116') { // PGRST116 is "not found"
          console.error("Error fetching special property:", specialPropertyError);
          continue;
        }

        let propertyId;
        if (!specialProperty) {
          // Create new special property
          const { data: newProperty, error: createPropertyError } = await supabase
            .from("special_properties")
            .insert({
              name: effect.name,
              description: effect.description,
              effect_type: effect.effect_type,
              effect_icon: effect.effect_icon,
              value: effect.value,
              power_level: 1, // Default value
              allowed_rarities: ['common', 'rare', 'epic', 'legendary']
            })
            .select()
            .single();

          if (createPropertyError) {
            console.error("Error creating special property:", createPropertyError);
            continue;
          }
          propertyId = newProperty.id;
        } else {
          propertyId = specialProperty.id;
        }

        // Create card_properties entry
        const { error: cardPropertyError } = await supabase
          .from("card_properties")
          .insert({
            card_id: insertedCard.id,
            property_id: propertyId,
            value: effect.value
          });

        if (cardPropertyError) {
          console.error("Error creating card property:", cardPropertyError);
        }
      }
    }

    // 4. Update collection stats
    const { error: statsError } = await supabase.rpc("update_collection_stats", {
      user_id: userId,
      card_rarity: cardData.rarity,
    });

    if (statsError) {
      console.error("Stats update error:", statsError);
      // Don't throw as the card was successfully inserted
    }

    // 5. Delete unused images from storage
    if (otherCards) {
      for (const card of otherCards) {
        await deleteImageFromStorage(supabase, card.image_url, userId);
      }
    }

    // 6. Delete the temp cards
    const { error: deleteError } = await supabase
      .from("temp_cards")
      .delete()
      .eq("user_id", userId)
      .eq("gen_id", tempCards.gen_id);

    if (deleteError) {
      console.error("Delete error:", deleteError);
      // Don't throw as the card is already saved
    }

    return { success: true, card: insertedCard };
  } catch (error) {
    console.error("Error in keepCard action:", error);
    throw error;
  }
}
