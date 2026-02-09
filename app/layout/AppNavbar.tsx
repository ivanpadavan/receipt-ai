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
  menuItemPaddingVariants,
  menuListPaddingVariants,
  menuPanelFrameVariants,
  menuPanelVariants,
  mobileActionPaddingVariants,
  mobileMenuButtonVariants,
  mobileUserContainerVariants,
  navContainerVariants,
  navLinkVariants,
  navOuterPaddingVariants,
  userNameVariants,
} from "@/app/receipt/components/ui-styles";

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
                <X className={iconSizeVariants({ size: "lg" })} />
              ) : (
                <Menu className={iconSizeVariants({ size: "lg" })} />
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
              <div className="hidden md:flex items-center gap-2 ml-2">
                <span className={userNameVariants()}>
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
