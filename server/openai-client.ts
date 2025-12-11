/**
 * Centralized OpenAI client with Helicone observability
 * Helicone proxies all OpenAI requests for logging and analytics
 */
import OpenAI from "openai";

const HELICONE_API_KEY = process.env.OPENAI_API_KEY;
const AI_INTEGRATION_KEY = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const USER_OPENAI_KEY = process.env.OPENAI_API_KEY;

// Use AI integration key if valid, otherwise fall back to user-provided key
const OPENAI_API_KEY = (AI_INTEGRATION_KEY && !AI_INTEGRATION_KEY.includes("DUMMY")) 
  ? AI_INTEGRATION_KEY 
  : USER_OPENAI_KEY;

const useHelicone = !!HELICONE_API_KEY && HELICONE_API_KEY.length > 10 && !HELICONE_API_KEY.includes("DUMMY");

export const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  baseURL: useHelicone 
    ? "https://oai.helicone.ai/v1" 
    : process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  defaultHeaders: useHelicone 
    ? { "Helicone-Auth": `Bearer ${HELICONE_API_KEY}` }
    : undefined,
});

export function getOpenAIWithMetadata(metadata: {
  sessionId?: string;
  userId?: string;
  sessionPath?: string;
  properties?: Record<string, string>;
}) {
  if (!useHelicone) {
    return openai;
  }

  const headers: Record<string, string> = {
    "Helicone-Auth": `Bearer ${HELICONE_API_KEY}`,
  };

  if (metadata.sessionId) {
    headers["Helicone-Session-Id"] = metadata.sessionId;
  }
  if (metadata.userId) {
    headers["Helicone-User-Id"] = metadata.userId;
  }
  if (metadata.sessionPath) {
    headers["Helicone-Session-Path"] = metadata.sessionPath;
  }
  if (metadata.properties) {
    for (const [key, value] of Object.entries(metadata.properties)) {
      headers[`Helicone-Property-${key}`] = value;
    }
  }

  return new OpenAI({
    apiKey: OPENAI_API_KEY,
    baseURL: "https://oai.helicone.ai/v1",
    defaultHeaders: headers,
  });
}

export const isHeliconeEnabled = useHelicone;

if (useHelicone) {
  console.log("🔍 Helicone observability enabled for OpenAI calls");
} else {
  console.log("ℹ️ Helicone not configured, using direct OpenAI connection");
}

// Log which API key source is being used
if (OPENAI_API_KEY?.startsWith("sk-")) {
  console.log("✅ OpenAI API key configured (user-provided key)");
} else if (OPENAI_API_KEY) {
  console.log("⚠️ OpenAI API key may be invalid - check configuration");
} else {
  console.log("❌ No OpenAI API key found");
}
