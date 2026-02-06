"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils/cn";
import { Menu, X, LogOut } from "lucide-react";
import { supabase } from "@/utils/supabase/client";
import { useUser } from "@/context/AuthContext";
import { CredentialResponse, GoogleLogin, useGoogleOneTapLogin } from "@react-oauth/google";
import Logo from "@/app/layout/Logo";
import { Button } from "@/components/ui/button";

const handleSignIn = async (response: CredentialResponse) => {
  const res = await fetch("/api/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: response.credential }),
  });
  const { access_token, refresh_token } = await res.json();
  await supabase.auth.setSession({ access_token, refresh_token });
};

const handleSignOut = async () => {
  await supabase.auth.signInAnonymously();
};

// Custom NavLink component with amber color scheme
const NavLink = ({
  href,
  children,
  onClick
}: {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
}) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-[18px] whitespace-nowrap flex items-center gap-2 text-sm transition-all",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {children}
    </Link>
  );
};

export const AppNavbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user } = useUser();

  const isAuthenticated = !!user && !user.is_anonymous;

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="bg-background border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <Logo />
            </Link>
          </div>

          {/* Menu button - only visible on mobile */}
          <div className="flex items-center md:hidden">
            {!isAuthenticated && <GoogleLogin onSuccess={handleSignIn} />}
            <Button
              variant="ghost"
              className="text-foreground hover:bg-accent hover:text-accent-foreground"
              onClick={toggleMenu}
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>

          {/* Unified navigation menu - styled differently for mobile/desktop */}
          <div
            className={cn(
              "flex flex-col md:flex-row items-start md:items-center md:space-x-4 bg-background",
              "absolute md:static left-0 right-0 top-16 md:top-auto border-t md:border-t-0",
              "md:flex",
              isMenuOpen ? "flex" : "hidden",
            )}
          >
            <div className="w-full md:w-auto px-2 pt-2 pb-3 md:p-0 space-y-1 md:space-y-0 sm:px-3">
              <div className="block md:inline-block py-2 px-3 md:p-0 md:mr-4">
                <NavLink href="/" onClick={closeMenu}>
                  Scan new
                </NavLink>
              </div>
              <div className="block md:inline-block py-2 px-3 md:p-0 md:mr-4">
                <NavLink href="/history" onClick={closeMenu}>
                  History
                </NavLink>
              </div>
              {isAuthenticated && (
                <div className="block md:inline-block py-2 px-3 md:p-0 md:mr-4">
                  <NavLink href="/settings" onClick={closeMenu}>
                    Settings
                  </NavLink>
                </div>
              )}
              {isAuthenticated && (
                <>
                  <div className="block md:hidden py-2 px-3 text-center">
                    <span className="text-foreground font-medium">
                      {user.user_metadata.displayName}
                    </span>
                  </div>
                  <div className="block md:hidden py-2 px-3">
                    <Button
                      onClick={() => {
                        closeMenu();
                        isAuthenticated
                          ? handleSignOut()
                          : (window.location.href = "/auth/sign-in");
                      }}
                      className="w-full flex items-center justify-center gap-2"
                      variant={isAuthenticated ? "outline" : "default"}
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* User info and auth buttons - only visible on desktop */}
            {isAuthenticated ? (
              <div className="hidden md:flex items-center gap-2 ml-2">
                <span className="text-foreground font-medium">
                  {user.user_metadata.displayName}
                </span>
                <Button
                  onClick={handleSignOut}
                  variant="ghost"
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <GoogleLogin
                containerProps={{ className: "hidden md:flex" }}
                onSuccess={handleSignIn}
              />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
