import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { useAppStore } from './store';

export interface ClerkUser {
  id: string;
  emailAddresses: Array<{
    emailAddress: string;
    id: string;
  }>;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  imageUrl?: string;
  primaryEmailAddress?: {
    emailAddress: string;
    id: string;
  };
  publicMetadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Server-side functions
export const getCurrentUser = async () => {
  const { userId } = await auth();
  
  if (!userId) {
    return null;
  }

  return {
    id: userId,
    email: '',
    name: '',
    avatarUrl: '',
    preferences: {},
  };
};

export const requireAuth = async () => {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }
  
  return userId;
};

// Client-side hook
export const useAuth = () => {
  const { user, setUser, isAuthenticated, setAuthenticated } = useAppStore();

  const signOut = async () => {
    try {
      setUser(null);
      setAuthenticated(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return {
    user,
    isAuthenticated,
    signOut,
  };
};
