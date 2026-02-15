"use client";

import React, { Fragment } from "react";
import { VariantProps } from "class-variance-authority";

import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group";
import { cn } from "@/utils/cn";
import {
  iconButtonVariants,
  iconGroupVariants,
} from "@/app/receipt/components/ui-styles";

type IconButtonTone = VariantProps<typeof iconButtonVariants>["tone"];
type IconButtonSize = VariantProps<typeof iconButtonVariants>["size"];

export interface IconActionItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  tone?: IconButtonTone;
  disabled?: boolean;
  className?: string;
}

interface IconActionGroupProps {
  actions: IconActionItem[];
  size?: IconButtonSize;
  className?: string;
  buttonClassName?: string;
  separatorClassName?: string;
}

export const IconActionGroup: React.FC<IconActionGroupProps> = ({
  actions,
  size = "compact",
  className,
  buttonClassName,
  separatorClassName,
}) => {
  if (!actions.length) {
    return null;
  }

  return (
    <ButtonGroup className={cn(iconGroupVariants({ density: "compact" }), className)}>
      {actions.map((action, index) => (
        <Fragment key={action.id}>
          {index > 0 && (
            <ButtonGroupSeparator
              className={cn("mx-0.5 h-5 opacity-30", separatorClassName)}
            />
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              iconButtonVariants({ size, tone: action.tone ?? "muted" }),
              "rounded-none first:rounded-l-full last:rounded-r-full",
              buttonClassName,
              action.className,
            )}
            onClick={action.onClick}
            disabled={action.disabled}
            aria-label={action.label}
            title={action.label}
          >
            {action.icon}
          </Button>
        </Fragment>
      ))}
    </ButtonGroup>
  );
};

