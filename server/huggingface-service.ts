import { HfInference } from "@huggingface/inference";
import { log } from "./index";

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || "";
const EMBEDDING_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2";

let hfClient: HfInference | null = null;

function getClient(): HfInference {
  if (!hfClient) {
    if (!HUGGINGFACE_API_KEY) {
      log("[HuggingFace] API key not found, using public inference");
    }
    hfClient = new HfInference(HUGGINGFACE_API_KEY || undefined);
  }
  return hfClient;
}

export function isHuggingFaceInitialized(): boolean {
  return true;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const client = getClient();
    
    const response = await client.featureExtraction({
      model: EMBEDDING_MODEL,
      inputs: text,
    });

    if (Array.isArray(response) && typeof response[0] === 'number') {
      return response as number[];
    }

    if (Array.isArray(response) && Array.isArray(response[0])) {
      return response[0] as number[];
    }

    log(`[HuggingFace] Unexpected embedding response format`);
    return [];
  } catch (error) {
    log(`[HuggingFace] Embedding error: ${error}`);
    return [];
  }
}

export async function generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const embeddings = await Promise.all(
      texts.map(text => generateEmbedding(text))
    );
    return embeddings;
  } catch (error) {
    log(`[HuggingFace] Batch embedding error: ${error}`);
    return texts.map(() => []);
  }
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA?.length || !vecB?.length || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function findTopMatches(
  targetEmbedding: number[],
  candidates: { id: string; embedding: number[] }[],
  topN: number = 5,
  minScore: number = 0.3
): { id: string; score: number }[] {
  const scores = candidates
    .filter(c => c.embedding?.length > 0)
    .map(candidate => ({
      id: candidate.id,
      score: cosineSimilarity(targetEmbedding, candidate.embedding),
    }))
    .filter(result => result.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  return scores;
}

export function composeDreamText(dream: {
  title: string;
  description: string;
  location: string;
  emotion: string;
  themes?: string[];
  objects?: string[];
}): string {
  const parts = [
    `Başlık: ${dream.title}`,
    `Açıklama: ${dream.description}`,
    `Mekan: ${dream.location}`,
    `Duygu: ${dream.emotion}`,
  ];

  if (dream.themes?.length) {
    parts.push(`Temalar: ${dream.themes.join(", ")}`);
  }

  if (dream.objects?.length) {
    parts.push(`Nesneler: ${dream.objects.join(", ")}`);
  }

  return parts.join(". ");
}

export function composeDejavuText(dejavu: {
  description: string;
  location: string;
  emotion: string;
  triggerContext?: string;
}): string {
  const parts = [
    `Açıklama: ${dejavu.description}`,
    `Mekan: ${dejavu.location}`,
    `Duygu: ${dejavu.emotion}`,
  ];

  if (dejavu.triggerContext) {
    parts.push(`Tetikleyici: ${dejavu.triggerContext}`);
  }

  return parts.join(". ");
}

export const huggingfaceService = {
  isInitialized: isHuggingFaceInitialized,
  generateEmbedding,
  generateBatchEmbeddings,
  cosineSimilarity,
  findTopMatches,
  composeDreamText,
  composeDejavuText,
};
