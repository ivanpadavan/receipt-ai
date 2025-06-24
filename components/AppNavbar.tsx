"use client";

import { ANONYMOUS_NAME } from "@/utils/auth-consts";
import { SignIn } from "@/utils/sign-in";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils/cn";
import Logo from "@/components/Logo";
import { Button } from "./ui/button";
import { Menu, X, User, LogOut } from "lucide-react";
import { useSession, signOut } from "next-auth/react";

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
  const { data: session } = useSession();
  let isAuthenticated = false;
  if (session) {
    isAuthenticated = session.user?.name !== ANONYMOUS_NAME;
  }
  const userName = session?.user?.name || "User";

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
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

          {/* Menu button - only visible on mobile */}
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

          {/* Unified navigation menu - styled differently for mobile/desktop */}
          <div
            className={cn(
              "flex flex-col md:flex-row items-start md:items-center md:space-x-4 bg-white",
              "absolute md:static left-0 right-0 top-16 md:top-auto border-t md:border-t-0 border-amber-200",
              "md:flex",
              isMenuOpen ? "flex" : "hidden"
            )}
          >
            <div className="w-full md:w-auto px-2 pt-2 pb-3 md:p-0 space-y-1 md:space-y-0 sm:px-3">
              <div className="block md:inline-block py-2 px-3 md:p-0 md:mr-4">
                <NavLink href="/" onClick={closeMenu}>Scan new</NavLink>
              </div>

              <div className="block md:inline-block py-2 px-3 md:p-0 md:mr-4">
                <NavLink href="/history" onClick={closeMenu}>History</NavLink>
              </div>

              {isAuthenticated && (
                <div className="block md:inline-block py-2 px-3 md:p-0 md:mr-4">
                  <NavLink href="/settings" onClick={closeMenu}>Settings</NavLink>
                </div>
              )}

              {isAuthenticated && (
                <div className="block md:hidden py-2 px-3 text-center">
                  <span className="text-amber-800 font-medium">{userName}</span>
                </div>
              )}

              <div className="block md:hidden py-2 px-3">
                <Button
                  onClick={() => {
                    closeMenu();
                    isAuthenticated ? signOut({ redirectTo: "/" }) : SignIn();
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

            {/* User info and auth buttons - only visible on desktop */}
            {isAuthenticated ? (
              <div className="hidden md:flex items-center gap-2 ml-2">
                <span className="text-amber-800 font-medium">{userName}</span>
                <Button
                  onClick={() => signOut({ redirectTo: "/" })}
                  variant="ghost"
                  className="text-amber-800 hover:bg-amber-100 flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => SignIn()}
                className="hidden md:flex bg-amber-500 hover:bg-amber-600 text-white ml-4 items-center gap-2"
              >
                <User className="h-4 w-4" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
