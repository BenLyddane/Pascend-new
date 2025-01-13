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

    // 3. Insert the permanent card
    const { data: insertedCard, error: insertError } = await supabase
      .from("cards")
      .insert(cardData)
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error(`Failed to save kept card: ${insertError.message}`);
    }

    // 4. Update collection stats
    const { error: statsError } = await supabase.rpc("update_collection_stats", {
      p_user_id: userId,
      p_card_rarity: cardData.rarity,
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
