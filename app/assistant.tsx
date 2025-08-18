"use client";

import { useEffect } from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { useAppStore } from "@/lib/store";
import { useUser } from "@clerk/nextjs";

export const Assistant = () => {
  const { isSignedIn, user } = useUser();
  const { setUser, setAuthenticated } = useAppStore();

  const runtime = useChatRuntime();

  // Sync user data when authentication state changes
  useEffect(() => {
    if (isSignedIn && user) {
      const userData = {
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress || '',
        name: user.fullName || user.firstName || '',
        avatarUrl: user.imageUrl,
        preferences: user.publicMetadata || {},
      };
      setUser(userData);
      setAuthenticated(true);
    } else {
      setUser(null);
      setAuthenticated(false);
    }
  }, [isSignedIn, user, setUser, setAuthenticated]);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <SidebarProvider>
        <div className="flex h-dvh w-full pr-0.5">
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger />
              <Separator orientation="vertical" className="mr-2 h-4" />
            </header>
            <div className="flex-1 overflow-hidden">
              <Thread />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </AssistantRuntimeProvider>
  );
};
