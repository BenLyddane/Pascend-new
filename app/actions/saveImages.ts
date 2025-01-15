"use server";

import { createClient } from "@/utils/supabase/server";
import { randomUUID } from "crypto";

interface ImageSaveRequest {
  imageUrl: string;
  userId: string;
  cardName: string;
}

async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download image: ${response.statusText}`);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function saveImageToStorage({
  imageUrl,
  userId,
  cardName
}: ImageSaveRequest): Promise<string> {
  const supabase = await createClient();
  
  try {
    // Skip if it's already a Supabase Storage URL
    if (imageUrl.includes(process.env.NEXT_PUBLIC_SUPABASE_URL || '')) {
      return imageUrl;
    }

    // Download the image
    const imageData = await downloadImage(imageUrl);
    
    // Generate a unique filename
    const fileExt = 'jpg'; // DALL-E images are always JPG
    const fileName = `${randomUUID()}-${cardName.toLowerCase().replace(/\s+/g, '-')}.${fileExt}`;
    // Create a more organized path structure
    const filePath = `${userId}/${randomUUID()}/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('card-images')
      .upload(filePath, imageData, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert: true // Change to true to handle potential conflicts
      });

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      throw uploadError;
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('card-images')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Error saving image:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
    // Return original URL as fallback
    return imageUrl;
  }
}

// Function to ensure a bucket exists
async function ensureCardImagesBucket() {
  const supabase = await createClient();
  
  try {
    // Try to get the bucket first
    const { data: bucket } = await supabase.storage.getBucket('card-images');
    
    // If bucket doesn't exist, create it
    if (!bucket) {
      await supabase.storage.createBucket('card-images', {
        public: true,
        fileSizeLimit: 1024 * 1024, // 1MB
        allowedMimeTypes: ['image/jpeg', 'image/png']
      });
    }
  } catch (error) {
    console.error('Error ensuring bucket exists:', error);
  }
}

export async function saveMultipleImages(
  images: ImageSaveRequest[]
): Promise<string[]> {
  // Process all images in parallel for better performance
  // Ensure the bucket exists before processing
  await ensureCardImagesBucket();
  
  const savedUrls = await Promise.all(
    images.map(img => saveImageToStorage(img))
  );
  
  return savedUrls;
}
