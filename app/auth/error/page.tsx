"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function AuthError() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-4 bg-amber-50">
      <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-md p-6 border border-amber-200">
        <h1 className="text-2xl font-bold mb-6 text-center text-amber-800">
          Authentication Error
        </h1>

        <div className="mb-6 p-4 bg-red-50 border border-red-300 text-red-700 rounded-lg">
          <p className="font-bold mb-2">Error:</p>
          <p>{"An unknown error occurred during authentication."}</p>
        </div>

        <div className="flex flex-col gap-4">
          <Button
            onClick={() => router.push("/auth/signin")}
            className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-4 rounded-full shadow-md w-full"
          >
            Return to Sign In
          </Button>
          <Button
            onClick={() => router.push("/")}
            variant="outline"
            className="border-amber-300 text-amber-800 hover:bg-amber-100 font-bold py-2 px-4 rounded-full shadow-md w-full"
          >
            Go to Home Page
          </Button>
        </div>
      </div>
    </div>
  );
}
