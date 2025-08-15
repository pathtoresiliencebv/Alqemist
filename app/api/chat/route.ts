import { createOpenAI } from "@ai-sdk/openai";
import {
  streamText,
  UIMessage,
  convertToModelMessages,
} from "ai";

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
  const { messages }: { messages: UIMessage[] } = await req.json();
  
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
  
  const result = streamText({
    model: selectedModel,
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
