import { createOpenAI } from "@ai-sdk/openai";
import {
  streamText,
  UIMessage,
  convertToModelMessages,
} from "ai";
import { auth } from '@clerk/nextjs/server';
import { executeQuery } from '@/lib/database';
import { UsageTracker, calculateUsageCost, SUBSCRIPTION_TIERS } from '@/lib/usage-tracking';
import { getModel } from '@/lib/model-providers';
import { memorySystem } from '@/lib/memory-system';
import { taskScheduler } from '@/lib/task-scheduler';

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

    const { messages, threadId, model }: { 
      messages: UIMessage[]; 
      threadId?: string; 
      model?: string; 
    } = await req.json();
    
    // Use model from request body or fallback to header or default
    const modelId = model || req.headers.get("X-Model") || "gpt-4o-mini";
    
    let selectedModel;
    try {
      // Use the new multi-provider model system
      selectedModel = getModel(modelId);
    } catch (error) {
      console.warn(`Model ${modelId} not found, falling back to gpt-4o-mini`);
      selectedModel = getModel("gpt-4o-mini");
    }

    // Get user input for memory and context analysis
    const userMessage = messages[messages.length - 1];
    const userInput = userMessage?.role === 'user' ? String(userMessage.content) : '';

    // Generate personalized context using memory system
    let contextPrompt = '';
    if (userInput) {
      try {
        const memoryContext = await memorySystem.generateResponseContext(userId, userInput);
        contextPrompt = memoryContext.contextPrompt;
        
        // Check for task-related requests and create reminders
        await handleTaskRequests(userId, userInput, threadId);
      } catch (error) {
        console.warn('Failed to generate memory context:', error);
      }
    }

    // Enhance messages with personalized context
    const enhancedMessages = contextPrompt 
      ? [
          { role: 'system' as const, content: contextPrompt },
          ...convertToModelMessages(messages)
        ]
      : convertToModelMessages(messages);

    // TODO: Save messages to database if threadId is provided
    // Temporarily disabled for build - will implement proper message persistence later
    if (threadId && messages.length > 0) {
      // Database message saving will be implemented here
      console.log('Message received for thread:', threadId);
    }
    
    const result = streamText({
      model: selectedModel,
      messages: enhancedMessages,
    });

    // Track API call usage (async to not block response)
    UsageTracker.track({
      type: 'api_call',
      resource: 'chat',
      quantity: 1,
      metadata: {
        model: modelId,
        messageCount: messages.length,
        threadId: threadId || null,
      },
      cost: calculateUsageCost('api_call', 1, SUBSCRIPTION_TIERS[0]), // Default to starter tier
    }).catch(error => {
      console.error('Failed to track usage:', error);
    });

    // Learn from conversation asynchronously
    if (userInput) {
      learnFromConversation(userId, messages, threadId).catch(error => {
        console.error('Failed to learn from conversation:', error);
      });
    }

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Error in chat API:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

/**
 * Handle task-related requests and create reminders
 */
async function handleTaskRequests(userId: string, userInput: string, threadId?: string): Promise<void> {
  const lowerInput = userInput.toLowerCase();
  
  // Detect reminder requests
  if (lowerInput.includes('remind me') || lowerInput.includes('herinner me') || lowerInput.includes('reminder')) {
    const reminderText = extractReminderText(userInput);
    const reminderTime = extractReminderTime(userInput);
    
    if (reminderText && reminderTime) {
      await taskScheduler.scheduleTask({
        userId,
        title: reminderText,
        description: `Reminder gebaseerd op chat: "${userInput}"`,
        taskType: 'reminder',
        scheduledFor: reminderTime,
        status: 'pending',
        metadata: {
          priority: 'medium',
          category: 'user-requested',
          relatedThreadId: threadId,
          reminderType: 'custom',
          notificationChannels: ['push']
        }
      });
    }
  }
  
  // Detect meeting scheduling
  if (lowerInput.includes('meeting') || lowerInput.includes('vergadering') || lowerInput.includes('afspraak')) {
    const meetingTime = extractMeetingTime(userInput);
    const meetingTitle = extractMeetingTitle(userInput);
    
    if (meetingTime && meetingTitle) {
      await taskScheduler.scheduleTask({
        userId,
        title: meetingTitle,
        description: `Meeting reminder: ${userInput}`,
        taskType: 'reminder',
        scheduledFor: new Date(meetingTime.getTime() - 15 * 60 * 1000), // 15 min before
        status: 'pending',
        metadata: {
          priority: 'high',
          category: 'meeting',
          relatedThreadId: threadId,
          reminderType: 'meeting',
          notificationChannels: ['push', 'email']
        }
      });
    }
  }
  
  // Detect follow-up requests
  if (lowerInput.includes('follow up') || lowerInput.includes('opvolging') || lowerInput.includes('later')) {
    const followUpTime = extractFollowUpTime(userInput) || new Date(Date.now() + 24 * 60 * 60 * 1000); // Default: tomorrow
    
    await taskScheduler.scheduleTask({
      userId,
      title: `Follow-up: ${userInput.substring(0, 50)}...`,
      description: `Follow-up reminder voor: "${userInput}"`,
      taskType: 'followup',
      scheduledFor: followUpTime,
      status: 'pending',
      metadata: {
        priority: 'medium',
        category: 'followup',
        relatedThreadId: threadId,
        reminderType: 'task',
        notificationChannels: ['push']
      }
    });
  }
}

/**
 * Learn from conversation and update memory
 */
async function learnFromConversation(
  userId: string, 
  messages: UIMessage[], 
  threadId?: string
): Promise<void> {
  try {
    // Convert messages to the format expected by memory system
    const conversationMessages = messages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: String(msg.content),
      timestamp: new Date()
    }));
    
    // Let the memory system learn from this conversation
    await memorySystem.learnFromConversation(userId, conversationMessages, threadId);
  } catch (error) {
    console.error('Failed to learn from conversation:', error);
  }
}

// Helper functions for parsing user input
function extractReminderText(input: string): string | null {
  const patterns = [
    /remind me (?:to |about )?(.*?)(?:\s+(?:at|on|in|tomorrow|next week)|\s*$)/i,
    /herinner me (?:aan |om )?(.*?)(?:\s+(?:om|op|over|morgen|volgende week)|\s*$)/i
  ];
  
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}

function extractReminderTime(input: string): Date | null {
  const now = new Date();
  const lowerInput = input.toLowerCase();
  
  // Simple time parsing - in production, use a proper NLP library
  if (lowerInput.includes('tomorrow') || lowerInput.includes('morgen')) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0); // Default: 9 AM
    return tomorrow;
  }
  
  if (lowerInput.includes('next week') || lowerInput.includes('volgende week')) {
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(9, 0, 0, 0);
    return nextWeek;
  }
  
  if (lowerInput.includes('in 1 hour') || lowerInput.includes('over 1 uur')) {
    return new Date(now.getTime() + 60 * 60 * 1000);
  }
  
  // Try to extract specific times like "at 3pm" or "om 15:00"
  const timeMatch = input.match(/(?:at|om)\s+(\d{1,2})(?::(\d{2}))?\s*(?:(am|pm))?/i);
  if (timeMatch) {
    const hour = parseInt(timeMatch[1]);
    const minute = parseInt(timeMatch[2] || '0');
    const ampm = timeMatch[3]?.toLowerCase();
    
    const reminderTime = new Date(now);
    let finalHour = hour;
    
    if (ampm === 'pm' && hour !== 12) {
      finalHour += 12;
    } else if (ampm === 'am' && hour === 12) {
      finalHour = 0;
    }
    
    reminderTime.setHours(finalHour, minute, 0, 0);
    
    // If the time has passed today, schedule for tomorrow
    if (reminderTime < now) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }
    
    return reminderTime;
  }
  
  // Default: 1 hour from now
  return new Date(now.getTime() + 60 * 60 * 1000);
}

function extractMeetingTime(input: string): Date | null {
  // Similar to extractReminderTime but for meetings
  return extractReminderTime(input);
}

function extractMeetingTitle(input: string): string | null {
  const patterns = [
    /meeting (?:about |with |for )?(.*?)(?:\s+(?:at|on|tomorrow)|\s*$)/i,
    /vergadering (?:over |met |voor )?(.*?)(?:\s+(?:om|op|morgen)|\s*$)/i
  ];
  
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match && match[1]) {
      return `Meeting: ${match[1].trim()}`;
    }
  }
  
  return 'Meeting';
}

function extractFollowUpTime(input: string): Date | null {
  // Similar logic to extractReminderTime for follow-ups
  return extractReminderTime(input);
}
