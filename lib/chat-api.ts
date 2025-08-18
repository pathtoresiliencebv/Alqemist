// Global state for selected model - used by the chat runtime
let selectedModelId = "gpt-4o-mini";

export function setSelectedModel(modelId: string) {
  selectedModelId = modelId;
}

export function getSelectedModel(): string {
  return selectedModelId;
}

// Custom fetch function that adds the selected model to headers
export const customChatFetch = (url: string, init?: RequestInit): Promise<Response> => {
  const headers = new Headers(init?.headers);
  headers.set("X-Model", selectedModelId);
  
  return fetch(url, {
    ...init,
    headers,
  });
};

// Override the global fetch for assistant-ui chat requests
if (typeof window !== "undefined") {
  const originalFetch = window.fetch;
  
  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    // Only intercept requests to our chat API
    const url = typeof input === 'string' ? input : input.toString();
    if (url.includes('/api/chat')) {
      return customChatFetch(url, init);
    }
    
    return originalFetch(input, init);
  };
}
