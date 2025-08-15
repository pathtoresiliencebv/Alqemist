"use client";

import { useAuth, type User } from "@/lib/auth";
import { Assistant } from "../assistant";
import { useEffect, useState } from "react";

export default function AssistantPage() {
  const { getUser } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setIsClient(true);
    setUser(getUser());
  }, []);

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Redirect to landing page if not authenticated
  if (!user) {
    window.location.href = "/";
    return null;
  }

  return <Assistant user={user} />;
}
