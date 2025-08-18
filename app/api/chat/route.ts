import { createOpenAI } from "@ai-sdk/openai";
import {
  streamText,
  UIMessage,
  convertToModelMessages,
} from "ai";
import { auth } from '@clerk/nextjs/server';
import { executeQuery } from '@/lib/database';
import { UsageTracker, calculateUsageCost, SUBSCRIPTION_TIERS } from '@/lib/usage-tracking';

// Create OpenRouter client
const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || "",
  baseURL: "https://openrouter.ai/api/v1",
});

// Create regular OpenAI client for ChatGPT
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Check usage limits before processing
    const usageLimits = await UsageTracker.canMakeRequest('api_call', 1, userId);
    if (!usageLimits.allowed) {
      return new Response(JSON.stringify({
        error: 'Usage limit exceeded',
        message: usageLimits.reason,
        resetTime: usageLimits.resetTime
      }), { 
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { messages, threadId }: { messages: UIMessage[]; threadId?: string } = await req.json();
    
    // Default to ChatGPT, maar support voor OpenRouter modellen
    const model = req.headers.get("X-Model") || "gpt-4o";
    
    let selectedModel;
    
    // Bepaal of het een OpenRouter model is
    if (model.includes("openai/") || model.includes("anthropic/") || model.includes("meta-llama/")) {
      selectedModel = openrouter(model);
    } else {
      // Gebruik standaard OpenAI voor ChatGPT modellen
      selectedModel = openai(model);
    }

    // TODO: Save messages to database if threadId is provided
    // Temporarily disabled for build - will implement proper message persistence later
    if (threadId && messages.length > 0) {
      // Database message saving will be implemented here
      console.log('Message received for thread:', threadId);
    }
    
    const result = streamText({
      model: selectedModel,
      messages: convertToModelMessages(messages),
    });

    // Track API call usage (async to not block response)
    UsageTracker.track({
      type: 'api_call',
      resource: 'chat',
      quantity: 1,
      metadata: {
        model: model,
        messageCount: messages.length,
        threadId: threadId || null,
      },
      cost: calculateUsageCost('api_call', 1, SUBSCRIPTION_TIERS[0]), // Default to starter tier
    }).catch(error => {
      console.error('Failed to track usage:', error);
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Error in chat API:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
