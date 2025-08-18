"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import { SignInButton, SignUpButton, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { isSignedIn } = useUser();
  const router = useRouter();

  // Redirect authenticated users to assistant
  useEffect(() => {
    if (isSignedIn) {
      router.push("/assistant");
    }
  }, [isSignedIn, router]);

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
          <SignInButton mode="modal">
            <Button 
              variant="outline" 
              className="border-purple-300 text-purple-700 hover:bg-purple-50"
            >
              Inloggen
            </Button>
          </SignInButton>
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
              <SignUpButton mode="modal">
                <Button 
                  size="lg" 
                  className="px-8 py-3 text-white shadow-lg hover:shadow-xl transition-all"
                  style={{ backgroundColor: "#852ab5" }}
                >
                  Gratis Beginnen
                </Button>
              </SignUpButton>
              <Button 
                variant="outline" 
                size="lg" 
                className="px-8 py-3 border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                Meer Informatie
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


    </div>
  );
}