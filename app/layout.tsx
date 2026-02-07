// app/layout.tsx
import "./globals.css";

import { Public_Sans } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { Providers } from "./providers";
import { AuthProvider } from "@/context/AuthContext";
import { getUser } from "@/utils/supabase/server";
import { AppNavbar } from "@/app/layout/AppNavbar";

const publicSans = Public_Sans({ subsets: ["latin"] });

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  return (
    <html lang="en">
      <head>
        <title>Receipt Scanner App</title>
        <link rel="shortcut icon" href="/images/favicon.ico" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
        {/* amber-50 color */}
        <meta name="theme-color" content="#fffbeb" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta
          name="description"
          content="Mobile-friendly receipt scanner app that extracts and validates data from your receipts using AI."
        />
        <meta property="og:title" content="Receipt Scanner App" />
        <meta
          property="og:description"
          content="Mobile-friendly receipt scanner app that extracts and validates data from your receipts using AI."
        />
        <meta property="og:image" content="/images/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Receipt Scanner App" />
        <meta
          name="twitter:description"
          content="Mobile-friendly receipt scanner app that extracts and validates data from your receipts using AI."
        />
        <meta name="twitter:image" content="/images/og-image.png" />
      </head>
      <body className={publicSans.className}>
        <NuqsAdapter>
          <Providers>
            <AuthProvider initialUser={user}>
              <div className="bg-amber-50 min-h-[100dvh] flex flex-col">
                <AppNavbar />
                <main className="flex-1 flex flex-col">{children}</main>
              </div>
            </AuthProvider>
          </Providers>
        </NuqsAdapter>
      </body>
    </html>
  );
}
