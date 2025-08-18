import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
// import { createMistral } from "@ai-sdk/mistral";
// import { createCohere } from "@ai-sdk/cohere";

export interface ModelInfo {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'mistral' | 'cohere' | 'openrouter';
  category: 'chat' | 'vision' | 'code' | 'reasoning' | 'embedding';
  contextLength: number;
  costPer1kTokens: {
    input: number; // in cents
    output: number; // in cents
  };
  features: ('vision' | 'json' | 'function-calling' | 'streaming' | 'reasoning')[];
  description: string;
  maxOutputTokens?: number;
  deprecated?: boolean;
  tier: 'free' | 'starter' | 'professional' | 'enterprise';
}

export const AVAILABLE_MODELS: ModelInfo[] = [
  // OpenAI Models
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    category: "chat",
    contextLength: 128000,
    costPer1kTokens: { input: 2.5, output: 10 },
    features: ["vision", "json", "function-calling", "streaming"],
    description: "Nieuwste GPT-4 model met vision en multimodal capabilities",
    maxOutputTokens: 4096,
    tier: "professional"
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    category: "chat",
    contextLength: 128000,
    costPer1kTokens: { input: 0.15, output: 0.6 },
    features: ["vision", "json", "function-calling", "streaming"],
    description: "Snelle en kostenefficiënte GPT-4 variant",
    maxOutputTokens: 16384,
    tier: "starter"
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    provider: "openai",
    category: "chat",
    contextLength: 16385,
    costPer1kTokens: { input: 0.5, output: 1.5 },
    features: ["json", "function-calling", "streaming"],
    description: "Snelle en betaalbare conversationele AI",
    maxOutputTokens: 4096,
    tier: "starter"
  },
  {
    id: "o1-preview",
    name: "GPT-o1 Preview",
    provider: "openai",
    category: "reasoning",
    contextLength: 128000,
    costPer1kTokens: { input: 15, output: 60 },
    features: ["reasoning", "streaming"],
    description: "Advanced reasoning model voor complexe problemen",
    maxOutputTokens: 32768,
    tier: "enterprise"
  },

  // Anthropic Models
  {
    id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
    category: "chat",
    contextLength: 200000,
    costPer1kTokens: { input: 3, output: 15 },
    features: ["vision", "json", "function-calling", "streaming"],
    description: "Anthropic's meest capabele model voor complexe taken",
    maxOutputTokens: 8192,
    tier: "professional"
  },
  {
    id: "claude-3-haiku-20240307",
    name: "Claude 3 Haiku",
    provider: "anthropic",
    category: "chat",
    contextLength: 200000,
    costPer1kTokens: { input: 0.25, output: 1.25 },
    features: ["json", "streaming"],
    description: "Snelle en lichtgewicht Claude variant",
    maxOutputTokens: 4096,
    tier: "starter"
  },

  // Google Models
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    provider: "google",
    category: "chat",
    contextLength: 2000000,
    costPer1kTokens: { input: 1.25, output: 5 },
    features: ["vision", "json", "function-calling", "streaming"],
    description: "Google's meest krachtige multimodal model",
    maxOutputTokens: 8192,
    tier: "professional"
  },
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    provider: "google",
    category: "chat",
    contextLength: 1000000,
    costPer1kTokens: { input: 0.075, output: 0.3 },
    features: ["vision", "json", "function-calling", "streaming"],
    description: "Snelle Gemini variant voor real-time applicaties",
    maxOutputTokens: 8192,
    tier: "starter"
  },

  // Mistral Models (temporarily disabled due to version incompatibility)
  // {
  //   id: "mistral-large-2411",
  //   name: "Mistral Large",
  //   provider: "mistral",
  //   category: "chat",
  //   contextLength: 128000,
  //   costPer1kTokens: { input: 2, output: 6 },
  //   features: ["json", "function-calling", "streaming"],
  //   description: "Mistral's krachtigste model voor enterprise gebruik",
  //   maxOutputTokens: 8192,
  //   tier: "professional"
  // },

  // Cohere Models (temporarily disabled due to version incompatibility)
  // {
  //   id: "command-r-plus",
  //   name: "Command R+",
  //   provider: "cohere",
  //   category: "chat",
  //   contextLength: 128000,
  //   costPer1kTokens: { input: 3, output: 15 },
  //   features: ["json", "function-calling", "streaming"],
  //   description: "Cohere's flagship model voor business applicaties",
  //   maxOutputTokens: 4096,
  //   tier: "professional"
  // },

  // OpenRouter Models (High-quality alternatives)
  {
    id: "anthropic/claude-3-opus:beta",
    name: "Claude 3 Opus (OpenRouter)",
    provider: "openrouter",
    category: "reasoning",
    contextLength: 200000,
    costPer1kTokens: { input: 15, output: 75 },
    features: ["vision", "json", "reasoning", "streaming"],
    description: "Claude's meest krachtige model via OpenRouter",
    maxOutputTokens: 4096,
    tier: "enterprise"
  },
  {
    id: "meta-llama/llama-3.2-90b-vision-instruct",
    name: "Llama 3.2 90B Vision",
    provider: "openrouter",
    category: "vision",
    contextLength: 131072,
    costPer1kTokens: { input: 0.9, output: 0.9 },
    features: ["vision", "json", "streaming"],
    description: "Meta's open-source multimodal model",
    maxOutputTokens: 8192,
    tier: "starter"
  }
];

// Model provider clients
export const modelProviders = {
  openai: createOpenAI({
    apiKey: process.env.OPENAI_API_KEY || "",
  }),

  anthropic: createAnthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || "",
  }),

  google: createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_AI_API_KEY || "",
  }),

  // mistral: createMistral({
  //   apiKey: process.env.MISTRAL_API_KEY || "",
  // }),

  // cohere: createCohere({
  //   apiKey: process.env.COHERE_API_KEY || "",
  // }),

  openrouter: createOpenAI({
    apiKey: process.env.OPENROUTER_API_KEY || "",
    baseURL: "https://openrouter.ai/api/v1",
  })
};

/**
 * Get model instance for AI SDK
 */
export function getModel(modelId: string) {
  const modelInfo = AVAILABLE_MODELS.find(m => m.id === modelId);
  if (!modelInfo) {
    throw new Error(`Model ${modelId} not found`);
  }

  const provider = modelProviders[modelInfo.provider];
  if (!provider) {
    throw new Error(`Provider ${modelInfo.provider} not configured`);
  }

  return provider(modelId);
}

/**
 * Get models available for a specific subscription tier
 */
export function getModelsForTier(tier: 'free' | 'starter' | 'professional' | 'enterprise'): ModelInfo[] {
  const tierHierarchy = ['free', 'starter', 'professional', 'enterprise'];
  const tierIndex = tierHierarchy.indexOf(tier);
  
  return AVAILABLE_MODELS.filter(model => {
    const modelTierIndex = tierHierarchy.indexOf(model.tier);
    return modelTierIndex <= tierIndex && !model.deprecated;
  });
}

/**
 * Get models by category
 */
export function getModelsByCategory(category: ModelInfo['category']): ModelInfo[] {
  return AVAILABLE_MODELS.filter(model => model.category === category && !model.deprecated);
}

/**
 * Get models with specific features
 */
export function getModelsWithFeatures(features: ModelInfo['features'][0][]): ModelInfo[] {
  return AVAILABLE_MODELS.filter(model => 
    features.every(feature => model.features.includes(feature)) && !model.deprecated
  );
}

/**
 * Recommend best model for a specific use case
 */
export function recommendModel(
  useCase: 'general' | 'vision' | 'coding' | 'reasoning' | 'cost-effective',
  tier: 'free' | 'starter' | 'professional' | 'enterprise' = 'starter'
): ModelInfo {
  const availableModels = getModelsForTier(tier);

  switch (useCase) {
    case 'vision':
      return availableModels.find(m => m.features.includes('vision')) || availableModels[0];
    
    case 'coding':
      return availableModels.find(m => m.category === 'code') || 
             availableModels.find(m => m.name.includes('GPT-4')) ||
             availableModels[0];
    
    case 'reasoning':
      return availableModels.find(m => m.category === 'reasoning') ||
             availableModels.find(m => m.features.includes('reasoning')) ||
             availableModels.find(m => m.provider === 'anthropic') ||
             availableModels[0];
    
    case 'cost-effective':
      return availableModels.reduce((cheapest, current) => {
        const cheapestCost = cheapest.costPer1kTokens.input + cheapest.costPer1kTokens.output;
        const currentCost = current.costPer1kTokens.input + current.costPer1kTokens.output;
        return currentCost < cheapestCost ? current : cheapest;
      });
    
    case 'general':
    default:
      // Prefer GPT-4o Mini for general use (good balance of capability and cost)
      return availableModels.find(m => m.id === 'gpt-4o-mini') ||
             availableModels.find(m => m.provider === 'openai') ||
             availableModels[0];
  }
}

/**
 * Calculate estimated cost for a conversation
 */
export function estimateConversationCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const model = AVAILABLE_MODELS.find(m => m.id === modelId);
  if (!model) return 0;

  const inputCost = (inputTokens / 1000) * model.costPer1kTokens.input;
  const outputCost = (outputTokens / 1000) * model.costPer1kTokens.output;
  
  return Math.ceil(inputCost + outputCost); // Round up to nearest cent
}

/**
 * Get provider status and health
 */
export async function checkProviderHealth(): Promise<Record<string, boolean>> {
  const health: Record<string, boolean> = {};
  
  for (const [providerName, provider] of Object.entries(modelProviders)) {
    try {
      // Simple health check - try to access the provider
      health[providerName] = !!provider;
    } catch (error) {
      health[providerName] = false;
    }
  }
  
  return health;
}
