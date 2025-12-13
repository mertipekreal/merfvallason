/**
 * Image Generator Tool - DALL-E 3
 */

import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function generateImage(prompt: string): Promise<{
  success: boolean;
  imageUrl?: string;
  error?: string;
}> {
  if (!openai) {
    return {
      success: false,
      error: "OPENAI_API_KEY bulunamadı! Railway Variables'a ekleyin."
    };
  }

  try {
    console.log(`🎨 DALL-E 3 görsel oluşturuyor: ${prompt}`);
    
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    });

    const imageUrl = response.data[0]?.url;

    if (imageUrl) {
      console.log(`✅ Görsel oluşturuldu!`);
      return {
        success: true,
        imageUrl
      };
    }

    return {
      success: false,
      error: "Görsel URL alınamadı"
    };

  } catch (error: any) {
    console.error(`❌ DALL-E error:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}


