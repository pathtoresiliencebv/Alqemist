import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  preferences: Record<string, unknown>;
}

export interface AppState {
  // Authentication
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setAuthenticated: (authenticated: boolean) => void;

  // Current model selection
  currentModel: string;
  setCurrentModel: (model: string) => void;

  // UI State
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Authentication
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user }),
  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),

  // Current model
  currentModel: 'gpt-4o',
  setCurrentModel: (currentModel) => set({ currentModel }),

  // UI State
  sidebarOpen: true,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}));
