"use client";

import { SignIn } from "@/utils/sign-in";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleProviderSignIn = async (provider: string) => {
    setIsLoading(true);
    setLoadingProvider(provider);
    try {
      await SignIn(provider, { callbackUrl: "/", redirectTo: '/' });
    } catch (error) {
      setIsLoading(false);
      setLoadingProvider(null);
      console.error(`Error signing in with ${provider}:`, error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-4 bg-amber-50">
      <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-md p-6 border border-amber-200">
        <h1 className="text-2xl font-bold mb-6 text-center text-amber-800">
          Sign In to Receipt Scanner
        </h1>

        <div className="flex flex-col gap-4">
          {/* Google Sign In */}
          <Button
            onClick={() => handleProviderSignIn("google")}
            disabled={isLoading}
            className="bg-white hover:bg-gray-100 text-gray-800 font-bold py-2 px-4 rounded-full shadow-md border border-gray-300 w-full flex items-center justify-center gap-2"
          >
            {loadingProvider === "google" ? (
              "Signing in..."
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="24"
                  height="24"
                >
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                  <path fill="none" d="M1 1h22v22H1z" />
                </svg>
                Sign in with Google
              </>
            )}
          </Button>

          {/* Facebook Sign In */}
          <Button
            onClick={() => handleProviderSignIn("facebook")}
            disabled={isLoading}
            className="bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold py-2 px-4 rounded-full shadow-md w-full flex items-center justify-center gap-2"
          >
            {loadingProvider === "facebook" ? (
              "Signing in..."
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="white"
                >
                  <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
                </svg>
                Sign in with Facebook
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
