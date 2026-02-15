"use client";

import React from "react";
import { Check, X } from "lucide-react";
import { t } from "@/app/i18n/translations";
import {
  iconSizeVariants,
} from "@/app/receipt/components/ui-styles";
import { IconActionGroup } from "@/app/receipt/components/ui/IconActionGroup";

interface ConfirmCancelGroupProps {
  onCancel: () => void;
  onConfirm: () => void;
  confirmDisabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export const ConfirmCancelGroup: React.FC<ConfirmCancelGroupProps> = ({
  onCancel,
  onConfirm,
  confirmDisabled,
  size = "sm",
  className,
}) => {
  const iconSize = size === "md" ? "md" : "sm";
  const buttonSize = size === "md" ? "liquid" : "compact";

  return (
    <IconActionGroup
      className={className}
      size={buttonSize}
      actions={[
        {
          id: "cancel",
          label: t("cancel"),
          tone: "muted",
          onClick: () => onCancel(),
          icon: <X className={iconSizeVariants({ size: iconSize })} />,
        },
        {
          id: "confirm",
          label: t("save"),
          tone: "success",
          onClick: () => onConfirm(),
          disabled: confirmDisabled,
          icon: <Check className={iconSizeVariants({ size: iconSize })} />,
        },
      ]}
    />
  );
};
