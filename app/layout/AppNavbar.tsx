"use client";

import { useEffect, useRef, useState } from "react";
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
const navContainer = "relative sticky top-0 z-40 px-3 pt-3";
const navFrame =
  "mx-auto max-w-7xl rounded-[28px] border border-white/70 bg-background/80 shadow-[0_18px_40px_rgba(15,23,42,0.16)] backdrop-blur-xl";
const mobileMenuButton =
  "text-foreground hover:bg-accent hover:text-accent-foreground";
const desktopMenuPanel =
  "hidden md:flex flex-1 items-center justify-center";
const desktopAuthPanel =
  "hidden md:flex min-w-0 flex-1 items-center justify-end";
const mobileMenuOverlay =
  "fixed inset-0 z-30 bg-background/88 backdrop-blur-2xl md:hidden";
const mobileMenuShell =
  "mx-3 mt-24 flex min-h-[calc(100dvh-7rem)] flex-col rounded-[32px] border border-white/70 bg-background/92 p-4 shadow-[0_24px_48px_rgba(15,23,42,0.2)]";
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
  const [isVisible, setIsVisible] = useState(true);
  const { user } = useUser();
  const previousScrollRef = useRef(0);

  const isAuthenticated = !!user && !user.is_anonymous;

  useEffect(() => {
    const onScroll = () => {
      const currentScroll = window.scrollY;

      if (isMenuOpen || currentScroll <= 8) {
        setIsVisible(true);
        previousScrollRef.current = currentScroll;
        return;
      }

      if (currentScroll < previousScrollRef.current) {
        setIsVisible(true);
      } else if (currentScroll > previousScrollRef.current) {
        setIsVisible(false);
      }

      previousScrollRef.current = currentScroll;
    };

    previousScrollRef.current = window.scrollY;
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isMenuOpen]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <>
      <nav
        className={cn(
          navContainer,
          "transition-transform duration-300 ease-out",
          isVisible ? "translate-y-0" : "-translate-y-[calc(100%+1rem)]",
        )}
      >
        <div className={cn(navFrame, navOuterPadding)}>
          <div className="grid h-16 grid-cols-[auto_1fr_auto] items-center md:grid-cols-[1fr_auto_1fr]">
          <div className="flex items-center md:justify-start">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <Logo />
            </Link>
          </div>

          {/* Menu button - only visible on mobile */}
          <div className="flex items-center justify-self-end md:hidden">
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
              aria-label={isMenuOpen ? t("close") : t("menu")}
              title={isMenuOpen ? t("close") : t("menu")}
            >
              {isMenuOpen ? (
                <X className={iconSizeVariants({ size: "lg" })} />
              ) : (
                <Menu className={iconSizeVariants({ size: "lg" })} />
              )}
            </Button>
          </div>

          <div className={desktopMenuPanel}>
            <div
              className={cn(
                "w-full md:w-auto space-y-1 md:flex md:items-center md:justify-center md:space-y-0",
                menuListPadding,
              )}
            >
              <div
                className={cn(
                  "block md:inline-block md:mr-2",
                  menuItemPadding,
                )}
              >
                <NavLink href="/" onClick={closeMenu}>
                  {t("scanNew")}
                </NavLink>
              </div>
              <div
                className={cn(
                  "block md:inline-block md:mr-2",
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
                    "block md:inline-block md:mr-2",
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
          </div>
          {isAuthenticated ? (
            <div
              className={cn(
                desktopAuthPanel,
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
            <div className={desktopAuthPanel}>
              <GoogleLogin
                containerProps={{ className: "hidden md:flex" }}
                shape="pill"
                onSuccess={handleSignIn}
              />
            </div>
          )}
          </div>
        </div>
      </nav>

      {isMenuOpen ? (
        <div className={mobileMenuOverlay}>
          <div className={mobileMenuShell}>
            <div
              className={cn(
                "space-y-2",
                menuListPadding,
              )}
            >
              <div className={menuItemPadding}>
                <NavLink href="/" onClick={closeMenu}>
                  {t("scanNew")}
                </NavLink>
              </div>
              <div className={menuItemPadding}>
                <NavLink href="/history" onClick={closeMenu}>
                  {t("history")}
                </NavLink>
              </div>
              {isAuthenticated ? (
                <div className={menuItemPadding}>
                  <NavLink href="/settings" onClick={closeMenu}>
                    {t("settings")}
                  </NavLink>
                </div>
              ) : null}
            </div>

            <div className="mt-auto space-y-3">
              {isAuthenticated ? (
                <>
                  <div
                    className={cn(
                      mobileUserContainer,
                      mobileActionPadding,
                    )}
                  >
                    <span className={userName}>
                      {user.user_metadata.displayName}
                    </span>
                  </div>
                  <div className={mobileActionPadding}>
                    <Button
                      onClick={() => {
                        closeMenu();
                        handleSignOut();
                      }}
                      className={cn(
                        "w-full justify-center",
                        buttonContentVariants({ layout: "inline" }),
                      )}
                      variant="outline"
                    >
                      <LogOut className={iconSizeVariants({ size: "sm" })} />
                      {t("signOut")}
                    </Button>
                  </div>
                </>
              ) : (
                <div className={cn("flex justify-center", mobileActionPadding)}>
                  <GoogleLogin
                    shape="pill"
                    onSuccess={handleSignIn}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
