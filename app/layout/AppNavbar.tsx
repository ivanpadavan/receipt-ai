"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils/cn";
import { Menu, X, LogOut } from "lucide-react";
import { useUser } from "@/context/AuthContext";
import { GoogleLogin } from "@react-oauth/google";
import Logo from "@/app/layout/Logo";
import { Button } from "@/components/ui/button";
import { handleSignIn, handleSignOut } from "@/app/receipt/utils/auth";
import { t } from "@/app/i18n/translations";
import { cva } from "class-variance-authority";

const navLinkVariants = cva(
  "px-4 py-2 rounded-[18px] whitespace-nowrap flex items-center gap-2 text-sm transition-all",
  {
    variants: {
      active: {
        true: "bg-primary text-primary-foreground",
        false: "text-foreground hover:bg-accent hover:text-accent-foreground",
      },
    },
    defaultVariants: {
      active: false,
    },
  },
);

const navContainerVariants = cva("bg-background border-b shadow-sm");

const mobileMenuButtonVariants = cva(
  "text-foreground hover:bg-accent hover:text-accent-foreground",
);

const menuPanelVariants = cva(
  "flex flex-col md:flex-row items-start md:items-center md:space-x-4 bg-background",
);

const menuPanelFrameVariants = cva(
  "absolute md:static left-0 right-0 top-16 md:top-auto border-t md:border-t-0",
);

const userNameVariants = cva("text-foreground font-medium");
const mobileUserContainerVariants = cva("text-center");
const navOuterPaddingVariants = cva("px-4 sm:px-6 lg:px-8");
const menuListPaddingVariants = cva("px-2 pt-2 pb-3 sm:px-3 md:p-0");
const menuItemPaddingVariants = cva("py-2 px-3 md:p-0");
const mobileActionPaddingVariants = cva("py-2 px-3");

// Custom NavLink component with amber color scheme
const NavLink = ({
  href,
  children,
  onClick,
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
        navLinkVariants({ active: isActive }),
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
    <nav className={navContainerVariants()}>
      <div className={cn("max-w-7xl mx-auto", navOuterPaddingVariants())}>
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <Logo />
            </Link>
          </div>

          {/* Menu button - only visible on mobile */}
          <div className="flex items-center md:hidden">
            {!isAuthenticated && (
              <GoogleLogin
                shape="circle"
                containerProps={{ className: "mr-3" }}
                type="icon"
                onSuccess={handleSignIn}
              />
            )}
            <Button
              variant="ghost"
              className={mobileMenuButtonVariants()}
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
              menuPanelVariants(),
              menuPanelFrameVariants(),
              "md:flex",
              isMenuOpen ? "flex" : "hidden",
            )}
          >
            <div
              className={cn(
                "w-full md:w-auto space-y-1 md:space-y-0",
                menuListPaddingVariants(),
              )}
            >
              <div
                className={cn(
                  "block md:inline-block md:mr-4",
                  menuItemPaddingVariants(),
                )}
              >
                <NavLink href="/" onClick={closeMenu}>
                  {t("scanNew")}
                </NavLink>
              </div>
              <div
                className={cn(
                  "block md:inline-block md:mr-4",
                  menuItemPaddingVariants(),
                )}
              >
                <NavLink href="/history" onClick={closeMenu}>
                  {t("history")}
                </NavLink>
              </div>
              {isAuthenticated && (
                <div
                  className={cn(
                    "block md:inline-block md:mr-4",
                    menuItemPaddingVariants(),
                  )}
                >
                  <NavLink href="/settings" onClick={closeMenu}>
                    {t("settings")}
                  </NavLink>
                </div>
              )}
              {isAuthenticated && (
                <>
                  <div
                    className={cn(
                      "block md:hidden",
                      mobileUserContainerVariants(),
                      mobileActionPaddingVariants(),
                    )}
                  >
                    <span className={userNameVariants()}>
                      {user.user_metadata.displayName}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "block md:hidden",
                      mobileActionPaddingVariants(),
                    )}
                  >
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
                      {t("signOut")}
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* User info and auth buttons - only visible on desktop */}
            {isAuthenticated ? (
              <div className="hidden md:flex items-center gap-2 ml-2">
                <span className={userNameVariants()}>
                  {user.user_metadata.displayName}
                </span>
                <Button
                  onClick={handleSignOut}
                  variant="ghost"
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  {t("signOut")}
                </Button>
              </div>
            ) : (
              <GoogleLogin
                containerProps={{ className: "hidden md:flex" }}
                shape="pill"
                onSuccess={handleSignIn}
              />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
