"use client";

import { SignIn } from "@/utils/sign-in";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils/cn";
import Logo from "@/components/Logo";
import { Button } from "./ui/button";
import { Menu, X, User, LogOut } from "lucide-react";
import { useSession } from "next-auth/react";
import { signOut } from "@/app/auth";

// Custom NavLink component with amber color scheme
const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "px-4 py-2 rounded-[18px] whitespace-nowrap flex items-center gap-2 text-sm transition-all",
        isActive
          ? "bg-amber-500 text-white"
          : "text-amber-800 hover:bg-amber-100"
      )}
    >
      {children}
    </Link>
  );
};

export const AppNavbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: session, status } = useSession();
  const isAuthenticated = !session?.user?.isAnonymous || false;
  const userName = session?.user?.name || "User";

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleAuthAction = () => {
    isAuthenticated ? signOut({ redirectTo: "/" }) : SignIn();
  };

  return (
    <nav className="bg-white border-b border-amber-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <Logo />
            </Link>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center space-x-4">
            <NavLink href="/">Scan new</NavLink>
            <NavLink href="/history">History</NavLink>
            {isAuthenticated && <NavLink href="/settings">Settings</NavLink>}
            {isAuthenticated ? (
              <>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-amber-800 font-medium">{userName}</span>
                    <Button
                      onClick={handleAuthAction}
                      variant="ghost"
                      className="text-amber-800 hover:bg-amber-100 flex items-center gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </Button>
                  </div>
              </>
            ) : (
              <Button
                onClick={handleAuthAction}
                className="bg-amber-500 hover:bg-amber-600 text-white ml-4 flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                Sign In
              </Button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <Button
              variant="ghost"
              className="text-amber-800 hover:bg-amber-100"
              onClick={toggleMenu}
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-amber-200">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <div className="block py-2 px-3 rounded-md hover:bg-amber-100">
              <Link href="/" className="text-amber-800 block" onClick={toggleMenu}>
                Scan new
              </Link>
            </div>

            <div className="block py-2 px-3 rounded-md hover:bg-amber-100">
              <Link href="/history" className="text-amber-800 block" onClick={toggleMenu}>
                History
              </Link>
            </div>

            <div className="block py-2 px-3 rounded-md hover:bg-amber-100">
              <Link href="/settings" className="text-amber-800 block" onClick={toggleMenu}>
                Settings
              </Link>
            </div>

            {isAuthenticated && (
              <div className="block py-2 px-3 text-center">
                <span className="text-amber-800 font-medium">{userName}</span>
              </div>
            )}

            <div className="block py-2 px-3">
              <Button
                onClick={() => {
                  handleAuthAction();
                  toggleMenu();
                }}
                className={
                  isAuthenticated
                    ? "border border-amber-300 text-amber-800 hover:bg-amber-100 w-full flex items-center justify-center gap-2"
                    : "bg-amber-500 hover:bg-amber-600 text-white w-full flex items-center justify-center gap-2"
                }
                variant={isAuthenticated ? "outline" : "default"}
              >
                {isAuthenticated ? (
                  <>
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </>
                ) : (
                  <>
                    <User className="h-4 w-4" />
                    Sign In
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
