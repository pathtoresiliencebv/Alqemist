import { createOpenAI } from "@ai-sdk/openai";
import {
  streamText,
  UIMessage,
  convertToModelMessages,
} from "ai";
import { auth } from '@clerk/nextjs/server';
import { executeQuery } from '@/lib/database';

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

    // Save messages to database if threadId is provided
    if (threadId && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'user') {
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await executeQuery(`
          INSERT INTO messages (id, thread_id, user_id, role, content, created_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
        `, [messageId, threadId, userId, lastMessage.role, lastMessage.content]);
      }
    }
    
    const result = streamText({
      model: selectedModel,
      messages: convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Error in chat API:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
