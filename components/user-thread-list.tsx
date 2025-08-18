"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { PlusIcon, MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";

interface Thread {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export const UserThreadList = () => {
  const { user } = useUser();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  // Fetch user threads
  useEffect(() => {
    if (user) {
      fetchThreads();
    }
  }, [user]);

  const fetchThreads = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/threads');
      if (response.ok) {
        const userThreads = await response.json();
        setThreads(userThreads);
      } else {
        console.error('Failed to fetch threads');
      }
    } catch (error) {
      console.error('Error fetching threads:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewThread = async () => {
    try {
      const response = await fetch('/api/threads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Nieuwe Chat',
          description: '',
        }),
      });

      if (response.ok) {
        const newThread = await response.json();
        setThreads([newThread, ...threads]);
        setActiveThreadId(newThread.id);
        // Hier zou je normaal naar de nieuwe thread navigeren
        console.log('New thread created:', newThread);
      }
    } catch (error) {
      console.error('Error creating thread:', error);
    }
  };

  const deleteThread = async (threadId: string) => {
    try {
      const response = await fetch(`/api/threads/${threadId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setThreads(threads.filter(t => t.id !== threadId));
        if (activeThreadId === threadId) {
          setActiveThreadId(null);
        }
      } else {
        console.error('Failed to delete thread');
      }
    } catch (error) {
      console.error('Error deleting thread:', error);
    }
  };

  if (!user) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <MessageSquare className="mx-auto mb-2 h-8 w-8" />
        <p className="text-sm">Inloggen om gesprekken te zien</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-stretch gap-1.5">
      {/* New Thread Button */}
      <Button 
        onClick={createNewThread}
        className="data-active:bg-muted hover:bg-muted flex items-center justify-start gap-1 rounded-lg px-2.5 py-2 text-start" 
        variant="ghost"
      >
        <PlusIcon className="h-4 w-4" />
        Nieuw Gesprek
      </Button>

      {/* Loading State */}
      {loading && (
        <div className="p-4 text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto"></div>
          <p className="text-xs text-muted-foreground mt-2">Gesprekken laden...</p>
        </div>
      )}

      {/* Thread List */}
      {!loading && threads.length === 0 && (
        <div className="p-4 text-center text-muted-foreground">
          <MessageSquare className="mx-auto mb-2 h-6 w-6" />
          <p className="text-xs">Nog geen gesprekken</p>
          <p className="text-xs">Klik op &quot;Nieuw Gesprek&quot; om te beginnen</p>
        </div>
      )}

      {!loading && threads.map((thread) => (
        <div
          key={thread.id}
          className={`data-active:bg-muted hover:bg-muted focus-visible:bg-muted focus-visible:ring-ring flex items-center gap-2 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 ${
            activeThreadId === thread.id ? 'bg-muted' : ''
          }`}
        >
          <button
            onClick={() => setActiveThreadId(thread.id)}
            className="flex-grow px-3 py-2 text-start"
          >
            <p className="text-sm font-medium truncate">{thread.title}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(thread.updated_at).toLocaleDateString('nl-NL')}
            </p>
          </button>
          
          <TooltipIconButton
            onClick={() => deleteThread(thread.id)}
            className="hover:text-destructive p-2 text-muted-foreground mr-1 h-8 w-8"
            variant="ghost"
            tooltip="Gesprek verwijderen"
          >
            <Trash2 className="h-3 w-3" />
          </TooltipIconButton>
        </div>
      ))}

      {/* User Info */}
      <div className="mt-4 p-2 border-t border-border">
        <p className="text-xs text-muted-foreground">
          {threads.length} gesprek{threads.length !== 1 ? 'ken' : ''} voor {user.firstName || user.emailAddresses[0]?.emailAddress}
        </p>
      </div>
    </div>
  );
};
