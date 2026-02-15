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
import {
  iconSizeVariants,
  buttonContentVariants,
  inlineGapVariants,
  radiusTokens,
} from "@/app/receipt/components/ui-styles";
import { cva } from "class-variance-authority";

// ── Navbar-scoped styles ──────────────────────────
const navLinkVariants = cva(
  `px-4 py-2 ${radiusTokens.nav} whitespace-nowrap flex items-center gap-2 text-sm transition-all`,
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
const navContainer = "bg-background border-b shadow-sm";
const mobileMenuButton =
  "text-foreground hover:bg-accent hover:text-accent-foreground";
const menuPanel =
  "flex flex-col md:flex-row items-start md:items-center md:space-x-4 bg-background";
const menuPanelFrame =
  "absolute md:static left-0 right-0 top-16 md:top-auto border-t md:border-t-0";
const userName = "text-foreground font-medium";
const mobileUserContainer = "text-center";
const navOuterPadding = "px-4 sm:px-6 lg:px-8";
const menuListPadding = "px-2 pt-2 pb-3 sm:px-3 md:p-0";
const menuItemPadding = "py-2 px-3 md:p-0";
const mobileActionPadding = "py-2 px-3";

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
    <nav className={navContainer}>
      <div className={cn("max-w-7xl mx-auto", navOuterPadding)}>
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
              className={mobileMenuButton}
              onClick={toggleMenu}
            >
              {isMenuOpen ? (
                <X className={iconSizeVariants({ size: "lg" })} />
              ) : (
                <Menu className={iconSizeVariants({ size: "lg" })} />
              )}
            </Button>
          </div>

          {/* Unified navigation menu - styled differently for mobile/desktop */}
          <div
            className={cn(
              menuPanel,
              menuPanelFrame,
              "md:flex",
              isMenuOpen ? "flex" : "hidden",
            )}
          >
            <div
              className={cn(
                "w-full md:w-auto space-y-1 md:space-y-0",
                menuListPadding,
              )}
            >
              <div
                className={cn(
                  "block md:inline-block md:mr-4",
                  menuItemPadding,
                )}
              >
                <NavLink href="/" onClick={closeMenu}>
                  {t("scanNew")}
                </NavLink>
              </div>
              <div
                className={cn(
                  "block md:inline-block md:mr-4",
                  menuItemPadding,
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
                    menuItemPadding,
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
                      mobileUserContainer,
                      mobileActionPadding,
                    )}
                  >
                    <span className={userName}>
                      {user.user_metadata.displayName}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "block md:hidden",
                      mobileActionPadding,
                    )}
                  >
                    <Button
                      onClick={() => {
                        closeMenu();
                        isAuthenticated
                          ? handleSignOut()
                          : (window.location.href = "/auth/sign-in");
                      }}
                      className={cn(
                        "w-full justify-center",
                        buttonContentVariants({ layout: "inline" }),
                      )}
                      variant={isAuthenticated ? "outline" : "default"}
                    >
                      <LogOut className={iconSizeVariants({ size: "sm" })} />
                      {t("signOut")}
                    </Button>
                  </div>
                </>
              )}
            </div>

            {/* User info and auth buttons - only visible on desktop */}
            {isAuthenticated ? (
              <div
                className={cn(
                  "hidden md:flex items-center ml-2",
                  inlineGapVariants({ size: "sm" }),
                )}
              >
                <span className={userName}>
                  {user.user_metadata.displayName}
                </span>
                <Button
                  onClick={handleSignOut}
                  variant="ghost"
                  className={buttonContentVariants({ layout: "inline" })}
                >
                  <LogOut className={iconSizeVariants({ size: "sm" })} />
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
