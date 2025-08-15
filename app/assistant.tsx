"use client";

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
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useAuth, type User } from "@/lib/auth";

interface AssistantProps {
  user: User;
}

export const Assistant = ({ user }: AssistantProps) => {
  const runtime = useChatRuntime();
  const { signOut } = useAuth();

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <SidebarProvider>
        <div className="flex h-dvh w-full pr-0.5">
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 justify-between">
              <div className="flex items-center gap-3">
                <SidebarTrigger />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <Image
                  src="/alqemist-logo.png"
                  alt="Alqemist"
                  width={36}
                  height={36}
                  className="rounded-lg"
                />
                <span className="text-xl font-bold text-purple-700">
                  Alqemist
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 hidden md:block">
                  Welcome, {user.name || user.email}
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-purple-300 text-purple-700 hover:bg-purple-50"
                  onClick={() => {
                    signOut();
                    window.location.href = "/";
                  }}
                >
                  Sign Out
                </Button>
              </div>
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
