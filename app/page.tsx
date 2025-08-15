"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { useAuth, type User } from "@/lib/auth";

export default function Home() {
  const { getUser, signIn } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [showSignIn, setShowSignIn] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setUser(getUser());
  }, []);

  const handleSignIn = () => {
    if (email) {
      const newUser = signIn(email, name);
      setUser(newUser);
      window.location.href = "/assistant";
    }
  };

  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // If user is authenticated, redirect to assistant
  if (user) {
    window.location.href = "/assistant";
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 p-6">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <Image
              src="/alqemist-logo.png"
              alt="Alqemist Logo"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <span className="text-2xl font-bold text-gray-800">Alqemist</span>
          </div>
          <Button 
            variant="outline" 
            className="border-purple-300 text-purple-700 hover:bg-purple-50"
            onClick={() => setShowSignIn(true)}
          >
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            {/* Main Logo */}
            <div className="mb-8 flex justify-center">
              <Image
                src="/alqemist-logo.png"
                alt="Alqemist Logo"
                width={120}
                height={120}
                className="rounded-2xl shadow-lg"
              />
            </div>

            {/* Hero Text */}
            <h1 className="text-6xl font-bold text-gray-900 mb-6">
              Welcome to{" "}
              <span 
                className="text-transparent bg-clip-text bg-gradient-to-r" 
                style={{ backgroundImage: "linear-gradient(135deg, #852ab5, #be6be1)" }}
              >
                Alqemist
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Your advanced AI assistant powered by cutting-edge technology. 
              Chat with multiple AI models, from ChatGPT to Claude, all in one beautiful interface.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Button 
                size="lg" 
                className="px-8 py-3 text-white shadow-lg hover:shadow-xl transition-all"
                style={{ backgroundColor: "#852ab5" }}
                onClick={() => setShowSignIn(true)}
              >
                Get Started Free
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="px-8 py-3 border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                Learn More
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mt-20">
            <div className="text-center p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Lightning Fast</h3>
              <p className="text-gray-600">Get instant responses from multiple AI models with optimized performance.</p>
            </div>

            <div className="text-center p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Multiple Models</h3>
              <p className="text-gray-600">Access ChatGPT, Claude, Llama, and more AI models in one interface.</p>
            </div>

            <div className="text-center p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure & Private</h3>
              <p className="text-gray-600">Your conversations are encrypted and stored securely with enterprise-grade protection.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-purple-200 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-600">
          <p>&copy; 2024 Alqemist. Powered by advanced AI technology.</p>
        </div>
      </footer>

      {/* Sign In Modal */}
      {showSignIn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-md w-full">
            <div className="text-center mb-6">
              <Image
                src="/alqemist-logo.png"
                alt="Alqemist"
                width={60}
                height={60}
                className="rounded-lg mx-auto mb-4"
              />
              <h2 className="text-2xl font-bold text-gray-900">Welcome to Alqemist</h2>
              <p className="text-gray-600 mt-2">Sign in to start your AI journey</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name (optional)
                </label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowSignIn(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSignIn}
                  disabled={!email}
                  className="flex-1 text-white"
                  style={{ backgroundColor: "#852ab5" }}
                >
                  Sign In
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}