"use client";

import React from "react";

import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/utils/cn";
import {
  actionMenuItemVariants,
  actionMenuTriggerVariants,
} from "@/app/receipt/components/ui-styles";

export interface ActionMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  tone?: "default" | "danger";
  onSelect: () => void;
}

interface ActionMenuProps {
  triggerLabel: string;
  triggerIcon: React.ReactNode;
  items: ActionMenuItem[];
  triggerKind?: "row" | "actionBar";
  contentAlign?: "start" | "center" | "end";
  contentSide?: "top" | "right" | "bottom" | "left";
  contentSideOffset?: number;
  stopPropagation?: boolean;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({
  triggerLabel,
  triggerIcon,
  items,
  triggerKind = "row",
  contentAlign = "end",
  contentSide,
  contentSideOffset,
  stopPropagation = false,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({
            variant: "ghost",
            size: triggerKind === "row" ? "icon" : "sm",
          }),
          actionMenuTriggerVariants({ kind: triggerKind }),
        )}
        onClick={
          stopPropagation
            ? (event) => {
                event.stopPropagation();
              }
            : undefined
        }
        onPointerDown={
          stopPropagation
            ? (event) => {
                event.stopPropagation();
              }
            : undefined
        }
        aria-label={triggerLabel}
        title={triggerLabel}
      >
        {triggerIcon}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={contentAlign}
        side={contentSide}
        sideOffset={contentSideOffset}
      >
        {items.map((item) => (
          <DropdownMenuItem
            key={item.id}
            onClick={(event) => {
              if (stopPropagation) {
                event.stopPropagation();
              }
              item.onSelect();
            }}
            className={actionMenuItemVariants({ tone: item.tone ?? "default" })}
          >
            {item.icon}
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

