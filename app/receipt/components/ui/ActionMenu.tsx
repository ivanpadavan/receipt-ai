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
  iconButtonVariants,
  iconButtonCompact,
} from "@/app/receipt/components/ui-styles";
import { cva } from "class-variance-authority";

// ── ActionMenu-scoped styles ──────────────────────
const menuTriggerVariants = cva("", {
  variants: {
    kind: {
      row: cn(iconButtonVariants({ size: "compact", tone: "muted" }), iconButtonCompact),
      actionBar: iconButtonVariants({ size: "liquid", tone: "muted" }),
    },
  },
  defaultVariants: {
    kind: "row",
  },
});
const menuItemVariants = cva("", {
  variants: {
    tone: {
      default: "",
      danger: "text-red-500 hover:text-red-600 focus:text-red-600 focus:bg-red-50",
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

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
  triggerClassName?: string;
  contentAlign?: "start" | "center" | "end";
  contentSide?: "top" | "right" | "bottom" | "left";
  contentSideOffset?: number;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({
  triggerLabel,
  triggerIcon,
  items,
  triggerKind = "row",
  triggerClassName,
  contentAlign = "end",
  contentSide,
  contentSideOffset,
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({
            variant: "ghost",
            size: triggerKind === "row" ? "icon" : "sm",
          }),
          menuTriggerVariants({ kind: triggerKind }),
          triggerClassName,
        )}
        aria-label={triggerLabel}
        title={triggerLabel}
      >
        {triggerIcon}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={contentAlign}
        side={contentSide}
        sideOffset={contentSideOffset}
        onCloseAutoFocus={(ev) => ev.preventDefault()}
      >
        {items.map((item) => (
          <DropdownMenuItem
            key={item.id}
            onClick={item.onSelect}
            className={menuItemVariants({ tone: item.tone ?? "default" })}
          >
            {item.icon}
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
