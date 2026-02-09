import { cva } from "class-variance-authority";

export const radiusTokens = {
  xs: "rounded-sm",
  sm: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  "3xl": "rounded-3xl",
  full: "rounded-full",
  action: "rounded-[32px]",
  nav: "rounded-[18px]",
};

export const shadowTokens = {
  sm: "shadow-sm",
  md: "shadow-[0_10px_22px_rgba(15,23,42,0.08),0_2px_6px_rgba(15,23,42,0.05)]",
  lg: "shadow-[0_16px_34px_rgba(15,23,42,0.12),0_4px_10px_rgba(15,23,42,0.08)]",
  glass: "shadow-[0_24px_48px_rgba(15,23,42,0.20)]",
  orange: "shadow-[0_14px_30px_rgba(249,115,22,0.36)]",
};

const iconCapsuleSurface =
  "border border-foreground/15 bg-white/48 shadow-[inset_0_1px_0_rgba(255,255,255,0.32)] backdrop-blur-md";

export const iconGroupVariants = cva(
  `${radiusTokens.full} ${iconCapsuleSurface} [&>*]:border-0`,
  {
    variants: {
      density: {
        compact: "p-0",
        roomy: "p-1",
      },
    },
    defaultVariants: {
      density: "compact",
    },
  },
);

export const iconSoloVariants = cva(
  `${radiusTokens.full} ${iconCapsuleSurface}`,
  {
    variants: {
      size: {
        compact: "h-10 w-10",
        liquid: "h-12 w-14",
      },
    },
    defaultVariants: {
      size: "compact",
    },
  },
);

export const iconButtonVariants = cva("px-0", {
  variants: {
    size: {
      compact: "h-10 w-10",
      liquid: "h-12 w-14",
    },
    tone: {
      muted:
        "text-foreground/80 hover:bg-foreground/5 hover:text-foreground data-[state=open]:bg-foreground/5 data-[state=open]:text-foreground",
      danger: "text-destructive hover:text-destructive hover:bg-destructive/10",
      success: "text-green-600 hover:text-green-700 hover:bg-green-50",
      neutral: "text-gray-400 hover:text-gray-500",
      successSoft: "text-green-500 hover:bg-green-500/10",
    },
  },
  defaultVariants: {
    size: "compact",
    tone: "muted",
  },
});

export const surfaceVariants = cva(
  "border border-border/70 bg-card text-foreground",
  {
    variants: {
      tone: {
        default: "",
        soft: "bg-muted/30",
        warm: "bg-amber-50/60 border-amber-200/70",
        warmStrong: "bg-amber-50/60 border-amber-500 border-2",
        danger: "bg-red-50 border-red-200 text-red-950",
      },
      shadow: {
        none: "shadow-none",
        sm: shadowTokens.sm,
        md: shadowTokens.md,
        lg: shadowTokens.lg,
      },
      interactive: {
        true: "cursor-pointer transition hover:shadow-[0_16px_34px_rgba(15,23,42,0.12),0_4px_10px_rgba(15,23,42,0.08)]",
        false: "",
      },
      state: {
        default: "",
        active:
          "bg-amber-50/70 border-amber-300 shadow-[inset_0_0_0_2px_rgba(251,146,60,0.55)] hover:shadow-[inset_0_0_0_2px_rgba(251,146,60,0.55)]",
      },
      radius: {
        xl: radiusTokens.xl,
        "2xl": radiusTokens["2xl"],
        "3xl": radiusTokens["3xl"],
      },
    },
    defaultVariants: {
      tone: "default",
      shadow: "sm",
      interactive: false,
      state: "default",
      radius: "2xl",
    },
  },
);

export const pillVariants = cva("inline-flex items-center gap-1.5 border", {
  variants: {
    tone: {
      neutral: "border-border/70 bg-card text-muted-foreground",
      ghost: "border-transparent bg-transparent text-muted-foreground",
      accent: "border-amber-200 bg-amber-50 text-amber-700",
      success: "border-emerald-200 bg-emerald-50 text-emerald-700",
      danger: "border-red-200 bg-red-50 text-destructive",
      warning: "border-amber-200 bg-amber-50 text-amber-600",
    },
    radius: {
      full: radiusTokens.full,
      lg: radiusTokens.lg,
      xl: radiusTokens.xl,
    },
    size: {
      xs: "px-2 py-1 text-xs font-medium",
      sm: "px-2 py-0.5 text-xs font-medium",
      md: "px-3 py-2 text-sm font-semibold",
    },
    interaction: {
      none: "",
      subtle: "transition-colors hover:text-foreground",
      accent:
        "transition-all duration-200 hover:border-amber-500 hover:text-amber-500 hover:bg-amber-500/5 hover:shadow-md",
    },
  },
  defaultVariants: {
    tone: "neutral",
    radius: "full",
    size: "sm",
    interaction: "none",
  },
});

export const actionBarVariants = cva(
  `${radiusTokens.action} border border-white/70 bg-white/35 ${shadowTokens.glass} backdrop-blur-2xl`,
);

export const primaryActionVariants = cva(
  `${radiusTokens.full} text-base font-semibold ${shadowTokens.orange}`,
);

export const noticeVariants = cva(
  `${radiusTokens.sm} border px-3 py-3 text-sm`,
  {
    variants: {
      tone: {
        warning: "border-amber-200 bg-amber-50 text-amber-800",
        danger: "border-red-200 bg-red-50 text-red-700",
      },
    },
    defaultVariants: {
      tone: "warning",
    },
  },
);

export const barVariants = cva("w-full overflow-hidden flex relative", {
  variants: {
    tone: {
      muted: "bg-secondary",
      glass: "border border-white/70 bg-white/55 backdrop-blur-xl",
      none: "",
    },
    radius: {
      full: radiusTokens.full,
      md: radiusTokens.sm,
    },
  },
  defaultVariants: {
    tone: "muted",
    radius: "full",
  },
});

export const fieldLabelVariants = cva("text-sm font-medium text-foreground");

export const inputStateVariants = cva("", {
  variants: {
    state: {
      default: "",
      error: "border-destructive focus-visible:ring-destructive",
      disabled: "bg-muted text-muted-foreground",
    },
  },
  defaultVariants: {
    state: "default",
  },
});

export const centeredTitleVariants = cva("text-center");

export const sheetHeaderTitleVariants = cva("text-center px-4 pt-4");
export const dialogHeaderTitleVariants = cva("text-center");

export const dialogHeaderVariants = cva("space-y-1");
export const dialogFooterVariants = cva("sm:flex-row sm:items-stretch");
export const dialogContentVariants = cva("max-w-md");
export const dialogContentWideVariants = cva("max-w-lg");

export const textVariants = cva("", {
  variants: {
    size: {
      none: "",
      xs: "text-xs",
      sm: "text-sm",
      base: "text-base",
      lg: "text-lg",
      xl: "text-xl",
      "2xl": "text-2xl",
      "3xl": "text-3xl",
      "4xl": "text-4xl",
    },
    weight: {
      normal: "font-normal",
      medium: "font-medium",
      semibold: "font-semibold",
      bold: "font-bold",
    },
    tone: {
      default: "text-foreground",
      muted: "text-muted-foreground",
      subtle: "text-foreground/80",
      brandStrong: "text-amber-800",
      brand: "text-amber-600",
      danger: "text-destructive",
      warning: "text-amber-600",
      success: "text-emerald-600",
      inverse: "text-background",
    },
    align: {
      left: "text-left",
      center: "text-center",
      right: "text-right",
    },
    style: {
      default: "",
      caps: "uppercase tracking-wide",
    },
  },
  defaultVariants: {
    size: "none",
    weight: "normal",
    tone: "default",
    align: "left",
    style: "default",
  },
});

export const textRoleVariants = cva("", {
  variants: {
    role: {
      pageTitle: "text-3xl font-bold text-amber-800",
      pageTitleCenter: "text-3xl font-bold text-amber-800 text-center",
      sectionTitle: "text-2xl font-bold text-foreground",
      sectionTitleCenter: "text-2xl font-bold text-foreground text-center",
      sheetTitle: "text-xl font-semibold text-foreground",
      sectionSubtitle: "text-lg font-medium text-muted-foreground",
      headingLg: "text-lg font-medium text-foreground",
      headingLgCenter: "text-lg font-medium text-foreground text-center",
      labelSm: "text-sm font-medium text-foreground",
      labelSmMuted: "text-sm text-muted-foreground",
      labelSmMutedCenter: "text-sm text-muted-foreground text-center",
      labelMuted: "text-muted-foreground",
      bodyDefault: "text-foreground",
      captionXsMuted: "text-xs text-muted-foreground",
      captionXsWarning: "text-xs text-amber-600",
      overlineMuted: "text-sm font-semibold uppercase tracking-wide text-muted-foreground",
      statusBrandSm: "text-sm font-medium text-amber-800",
      logoMark: "text-amber-600",
      logoType: "text-xl font-bold text-amber-800",
      labelBaseStrong: "text-base font-semibold text-foreground",
      itemTitle: "text-base font-bold text-foreground",
      amountHero: "text-4xl font-bold text-foreground",
      amountCurrencyMuted: "text-2xl text-muted-foreground",
      amountXl: "text-xl font-bold text-foreground",
      amountBase: "text-base font-semibold text-foreground",
      amountSemibold: "font-semibold text-foreground",
      badgeCount: "text-sm font-semibold text-center",
      metaSmBrand: "text-sm text-amber-600",
      metaSmBrandStrong: "text-sm text-amber-800",
      metaSmBrandStrongEm: "text-sm font-medium text-amber-800",
      titleLgBrandStrong: "text-lg font-semibold text-amber-800",
      bodyMutedCenter: "text-muted-foreground text-center",
    },
  },
  defaultVariants: {
    role: "labelMuted",
  },
});

export const iconSizeVariants = cva("", {
  variants: {
    size: {
      xs: "h-3.5 w-3.5",
      sm: "h-4 w-4",
      lgPlus: "h-8 w-8",
      mdTight: "h-[1.125rem] w-[1.125rem]",
      md: "h-5 w-5",
      lg: "h-6 w-6",
      xl: "h-12 w-12",
    },
  },
  defaultVariants: {
    size: "sm",
  },
});

export const avatarSizeVariants = cva("", {
  variants: {
    size: {
      sm: "h-8 w-8",
      md: "h-12 w-12",
      lg: "h-16 w-16",
    },
  },
  defaultVariants: {
    size: "sm",
  },
});

export const iconButtonCompactVariants = cva("h-8 w-8");

export const iconLeadSpacingVariants = cva("", {
  variants: {
    size: {
      sm: "mr-1",
      md: "mr-2",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export const buttonContentVariants = cva("", {
  variants: {
    layout: {
      inline: "inline-flex items-center gap-2",
      inlineTight: "inline-flex items-center gap-1.5",
      stacked: "flex flex-col items-center gap-1 leading-none",
    },
  },
  defaultVariants: {
    layout: "inline",
  },
});

export const statusPillVariants = cva(
  "inline-flex items-center gap-1.5 border px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        success: "border-emerald-200 bg-emerald-50 text-emerald-700",
        danger: "border-red-200 bg-red-50 text-destructive",
        warning: "border-amber-200 bg-amber-50 text-amber-600",
      },
      radius: {
        full: radiusTokens.full,
        lg: radiusTokens.lg,
      },
    },
    defaultVariants: {
      tone: "warning",
      radius: "full",
    },
  },
);

export const quantityPillVariants = cva(
  "inline-flex items-center gap-1.5 border px-2 py-1 text-xs font-medium",
  {
    variants: {
      tone: {
        neutral: "border-border/70 bg-card text-muted-foreground",
        danger: "border-red-200 bg-red-50 text-destructive",
      },
      radius: {
        lg: radiusTokens.lg,
      },
    },
    defaultVariants: {
      tone: "neutral",
      radius: "lg",
    },
  },
);

export const inlineGapVariants = cva("", {
  variants: {
    size: {
      xs: "gap-1",
      sm: "gap-2",
      md: "gap-3",
      lg: "gap-4",
      xl: "gap-6",
    },
  },
  defaultVariants: {
    size: "sm",
  },
});

export const stackGapVariants = cva("", {
  variants: {
    size: {
      xs: "space-y-1",
      sm: "space-y-1.5",
      md: "space-y-3",
      lg: "space-y-4",
      xl: "space-y-6",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export const rowVariants = cva("flex", {
  variants: {
    align: {
      center: "items-center",
      start: "items-start",
      baseline: "items-baseline",
      stretch: "items-stretch",
    },
    justify: {
      start: "justify-start",
      between: "justify-between",
      center: "justify-center",
    },
    wrap: {
      true: "flex-wrap",
      false: "",
    },
    width: {
      full: "w-full",
      auto: "",
    },
  },
  defaultVariants: {
    align: "center",
    justify: "start",
    wrap: false,
    width: "auto",
  },
});

export const columnVariants = cva("flex flex-col", {
  variants: {
    align: {
      start: "items-start",
      center: "items-center",
      stretch: "items-stretch",
    },
    justify: {
      start: "justify-start",
      center: "justify-center",
      between: "justify-between",
    },
    width: {
      full: "w-full",
      auto: "",
    },
  },
  defaultVariants: {
    align: "start",
    justify: "start",
    width: "auto",
  },
});

export const screenShellVariants = cva("bg-amber-50 p-4");

export const cardPaddingVariants = cva("", {
  variants: {
    size: {
      sm: "p-3",
      md: "p-4",
      lg: "p-6",
      xl: "p-8",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export const rowContentPaddingVariants = cva("", {
  variants: {
    density: {
      tight: "px-4 py-1.5",
      regular: "px-4 py-3",
    },
  },
  defaultVariants: {
    density: "regular",
  },
});

export const sectionPaddingVariants = cva("", {
  variants: {
    size: {
      sm: "px-4 py-2",
      md: "px-4 py-3",
      lg: "px-5 py-4",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export const sheetTitlePaddingVariants = cva("px-4 pt-4");

export const previewImageVariants = cva(`object-contain ${radiusTokens.sm}`);
export const actionButtonVariants = cva(shadowTokens.md);
export const captureButtonVariants = cva(shadowTokens.md);
export const dropzoneVariants = cva(
  `border-2 border-dashed border-input ${radiusTokens.lg} cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors`,
);
export const loadingSpinnerVariants = cva(
  `animate-spin ${radiusTokens.full} border-b-2 border-amber-500`,
);
export const errorBoxVariants = cva(
  `bg-red-50 border border-red-300 text-red-700 ${radiusTokens.lg} ${shadowTokens.sm} p-4`,
);

export const navLinkVariants = cva(
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
export const navContainerVariants = cva("bg-background border-b shadow-sm");
export const mobileMenuButtonVariants = cva(
  "text-foreground hover:bg-accent hover:text-accent-foreground",
);
export const menuPanelVariants = cva(
  "flex flex-col md:flex-row items-start md:items-center md:space-x-4 bg-background",
);
export const menuPanelFrameVariants = cva(
  "absolute md:static left-0 right-0 top-16 md:top-auto border-t md:border-t-0",
);
export const userNameVariants = cva("text-foreground font-medium");
export const mobileUserContainerVariants = cva("text-center");
export const navOuterPaddingVariants = cva("px-4 sm:px-6 lg:px-8");
export const menuListPaddingVariants = cva("px-2 pt-2 pb-3 sm:px-3 md:p-0");
export const menuItemPaddingVariants = cva("py-2 px-3 md:p-0");
export const mobileActionPaddingVariants = cva("py-2 px-3");

export const addButtonVariants = cva(
  `h-6 w-6 p-0 ${radiusTokens.xs} bg-accent text-foreground hover:bg-accent/80`,
);

export const participantsSheetBackgroundVariants = cva(
  "bg-gradient-to-b from-white to-gray-50",
);
export const participantsSheetHeaderVariants = cva(
  "border-b border-gray-100 px-5 py-4",
);
export const participantsEmptyStateIconVariants = cva("text-gray-300");
export const participantsEmptyStateContainerVariants = cva(
  "text-center py-12",
);
export const participantsRowMenuButtonVariants = cva("text-gray-500");
export const participantsDangerMenuItemVariants = cva(
  "text-red-500 hover:text-red-600 focus:text-red-600 focus:bg-red-50",
);
export const participantsAvatarPlaceholderVariants = cva(
  `${radiusTokens.full} flex items-center justify-center font-semibold text-lg`,
);
export const participantsAddInputVariants = cva(
  "border-none bg-transparent p-0 text-base focus:ring-0 focus-visible:ring-0",
);
export const participantsDoneButtonVariants = cva(
  `bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold ${radiusTokens.xl} active:scale-[0.98] transition-transform py-3`,
);
export const participantsFooterVariants = cva(
  "border-t border-gray-100 bg-white p-4",
);
export const participantsDialogContentVariants = cva(radiusTokens.xl);
export const participantsDeleteActionVariants = cva(
  "bg-red-500 hover:bg-red-600 text-white",
);
export const participantsListPaddingVariants = cva("px-4 py-3");
export const participantsAddButtonContainerVariants = cva("px-4 pb-4 pt-2");

export const shareReceiptQrContainerVariants = cva(
  `${radiusTokens.xl} border bg-white p-3`,
);
export const shareReceiptTriggerLabelVariants = cva("text-[11px] font-medium");
export const shareReceiptContentPaddingVariants = cva("py-2");

export const confirmCancelGroupVariants = cva(
  `inline-flex items-center ${radiusTokens.full} border border-border/60 bg-white/70 ${shadowTokens.sm}`,
  {
    variants: {
      size: {
        sm: "h-10 px-1",
        md: "h-12 px-1.5",
      },
    },
    defaultVariants: {
      size: "sm",
    },
  },
);
export const confirmCancelButtonVariants = cva(
  `${radiusTokens.full} transition`,
  {
    variants: {
      size: {
        sm: "h-8 w-10",
        md: "h-9 w-12",
      },
      tone: {
        cancel: "text-muted-foreground hover:text-foreground",
        confirm: "text-emerald-600 hover:text-emerald-700",
      },
    },
    defaultVariants: {
      size: "sm",
      tone: "cancel",
    },
  },
);
export const confirmCancelDividerVariants = cva("bg-border/60");

export const settingsUploadCardVariants = cva(
  `${radiusTokens.xl} border-2 border-dashed border-amber-200 bg-amber-50/40 hover:bg-amber-50 transition-colors`,
);
export const settingsUploadCardPaddingVariants = cva("p-4");
export const settingsCropFrameVariants = cva(
  `bg-black/80 ${radiusTokens.lg} overflow-hidden`,
);

export const splittingEditingHeaderVariants = cva("border-b bg-muted/20 p-3");
export const splittingEditingInputVariants = cva("bg-background");
export const splittingTypeSwitchWrapperVariants = cva(
  "border border-border/60 bg-muted/30 p-1 shadow-sm",
);
export const splittingTypeSwitchButtonVariants = cva(
  "h-8 w-16 text-xs font-semibold transition",
  {
    variants: {
      active: {
        true: "bg-white text-foreground shadow",
        false: "text-muted-foreground",
      },
    },
  },
);
export const splittingMenuButtonVariants = cva("text-gray-500");
export const splittingMenuDangerItemVariants = cva(
  "text-red-500 hover:text-red-600 focus:text-red-600 focus:bg-red-50",
);
export const splittingAvatarRingVariants = cva("ring-2 ring-background");
export const splittingAvatarFallbackVariants = cva(
  "bg-muted flex items-center justify-center text-xs text-muted-foreground",
);
export const splittingAvatarOverflowVariants = cva(
  "bg-muted flex items-center justify-center text-xs font-medium ring-2 ring-muted-foreground/30",
);
export const splittingClaimHeaderVariants = cva(
  "hover:bg-muted/30 transition-colors bg-background",
);
export const splittingAddShareButtonVariants = cva(
  `${radiusTokens.full} border`,
);
export const splittingClaimsErrorRingVariants = cva(
  `ring-1 ring-destructive/40 ${radiusTokens.xl}`,
);
export const splittingClaimInfoVariants = cva("text-foreground");
export const splittingParticipantButtonVariants = cva(
  `relative ${radiusTokens.full} transition-all`,
  {
    variants: {
      selected: {
        true: "",
        false: "opacity-50 hover:opacity-80",
      },
    },
    defaultVariants: {
      selected: true,
    },
  },
);
export const splittingAccordionContentVariants = cva(
  "border-t bg-background px-3 py-2",
);
export const splittingSheetSubtitleVariants = cva("px-4 py-2");
export const splittingFooterVariants = cva("border-t bg-background pt-2");
export const splittingAccordionTriggerPaddingVariants = cva("px-3 py-3");
export const splittingHeaderActionPaddingVariants = cva("px-1");
export const splittingAddSharePaddingVariants = cva("px-4 pb-3");
export const splittingClaimsListPaddingVariants = cva("px-4");
export const splittingFooterContentPaddingVariants = cva("px-4 py-3");
export const splittingAccordionContentPaddingVariants = cva("p-0");

export const appShellVariants = cva("bg-amber-50");

export const historyEmptyCardTextVariants = cva("text-center");
export const historyCtaButtonVariants = cva(
  `${radiusTokens.full} bg-amber-500 px-4 py-2 font-bold text-white shadow-md hover:bg-amber-600`,
);
export const historyReceiptCardVariants = cva(
  "border-amber-200 hover:border-amber-400",
);
export const settingsCardContentVariants = cva("p-0");

export const notFoundShellVariants = cva("p-4");
export const notFoundCardPaddingVariants = cva("p-6");
export const notFoundButtonVariants = cva(
  `font-bold py-2 px-4 ${radiusTokens.full} shadow-md`,
);

export const receiptRowVariants = cva(`${radiusTokens.sm} px-1 py-1 text-sm`, {
  variants: {
    interactive: {
      true: "cursor-pointer hover:bg-muted/45",
      false: "cursor-default",
    },
  },
  defaultVariants: {
    interactive: false,
  },
});

export const totalValueVariants = cva("font-semibold", {
  variants: {
    tone: {
      danger: "text-destructive",
      default: "",
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

export const grandTotalValueVariants = cva("text-2xl font-bold", {
  variants: {
    tone: {
      danger: "text-destructive",
      default: "",
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

export const overallValueVariants = cva("text-base font-semibold", {
  variants: {
    tone: {
      danger: "text-destructive",
      default: "text-foreground",
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

export const positionHeaderVariants = cva("", {
  variants: {
    tone: {
      default: "",
      danger: "text-destructive",
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

export const positionMetaValueVariants = cva("", {
  variants: {
    tone: {
      default: "",
      danger: "text-destructive",
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

export const claimsErrorVariants = cva("text-xs text-destructive");

export const dividerVariants = cva("border-t border-border/70");

export const positionRowButtonVariants = cva("", {
  variants: {
    interactive: {
      true: "cursor-pointer",
      false: "cursor-default",
    },
  },
  defaultVariants: {
    interactive: false,
  },
});

export const receiptCardPaddingVariants = cva("p-4 md:p-5");
export const stickyBarPaddingVariants = cva("px-2");

export const summaryHeaderVariants = cva("border-b bg-card text-center");
export const summaryItemListVariants = cva("border-t pt-2 border-border/40");
export const summaryBalanceAmountWrapperVariants = cva("text-right");
export const summaryItemIndentVariants = cva("pl-12");
export const summaryItemContainerPaddingVariants = cva("pr-2");
export const summaryItemRowPaddingVariants = cva("py-1");
export const summaryAmountVariants = cva("whitespace-nowrap font-medium");
export const summaryEmptyStateVariants = cva("py-8");

export const modifierRowVariants = cva(`${radiusTokens.sm} px-1 py-1 text-sm`, {
  variants: {
    interactive: {
      true: "cursor-pointer hover:bg-muted/45",
      false: "cursor-default",
    },
  },
  defaultVariants: {
    interactive: false,
  },
});

export const modifierValueVariants = cva("font-medium", {
  variants: {
    tone: {
      danger: "text-destructive",
      success: "text-emerald-600",
      default: "",
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

export const sheetBodyPaddingVariants = cva("p-4");
export const errorListVariants = cva("list-disc pl-5");

export const receiptActionBarParticipantBadgeVariants = cva(
  `${radiusTokens.full} pointer-events-none absolute right-1.5 top-1.5 flex h-5 min-w-5 items-center justify-center bg-foreground px-1 text-[10px] font-semibold leading-none opacity-80 text-background`,
);

export const receiptActionBarMenuIconVariants = cva("", {
  variants: {
    tone: {
      position: "text-sky-600",
      discount: "text-emerald-600",
      fee: "text-amber-600",
    },
  },
});
export const receiptActionBarContainerPaddingVariants = cva("px-5");
export const receiptActionBarPaddingVariants = cva("p-2");
export const receiptActionPrimaryPaddingVariants = cva("px-7");

export const participantsBadgeButtonVariants = cva("", {
  variants: {
    size: {
      compact: "h-10",
      full: "",
    },
  },
  defaultVariants: {
    size: "full",
  },
});

export const cellVariants = cva("", {
  variants: {
    tone: {
      default: "",
      danger: "text-red-500",
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

export const cellGroupVariants = cva("", {
  variants: {
    tone: {
      default: "",
      danger: "bg-red-50",
    },
    interactive: {
      true: "cursor-pointer bg-gray-100",
      false: "",
    },
  },
  defaultVariants: {
    tone: "default",
    interactive: false,
  },
});

export const joinFlowOverlayVariants = cva("bg-black/40");
