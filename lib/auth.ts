"use client";

// Simple auth system using localStorage for demo
// In production, this would be replaced with real authentication

export interface User {
  id: string;
  email: string;
  name: string;
}

export const useAuth = () => {
  const getUser = (): User | null => {
    if (typeof window === 'undefined') return null;
    
    const userData = localStorage.getItem('alqemist_user');
    return userData ? JSON.parse(userData) : null;
  };

  const setUser = (user: User | null) => {
    if (typeof window === 'undefined') return;
    
    if (user) {
      localStorage.setItem('alqemist_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('alqemist_user');
    }
  };

  const signIn = (email: string, name?: string) => {
    const user: User = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      name: name || email.split('@')[0],
    };
    setUser(user);
    return user;
  };

  const signOut = () => {
    setUser(null);
  };

  return {
    getUser,
    setUser,
    signIn,
    signOut,
  };
};
