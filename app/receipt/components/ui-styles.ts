import { cva } from "class-variance-authority";

export const tappableSurfaceFeedback = `select-none touch-manipulation [-webkit-tap-highlight-color:transparent] transition duration-150 active:scale-95`;

// ── Tokens ──────────────────────────────────────────────
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

// ── Surface ─────────────────────────────────────────────
const iconCapsuleSurface =
  "border border-foreground/15 bg-white/48 shadow-[inset_0_1px_0_rgba(255,255,255,0.32)] backdrop-blur-md";

export const surfaceVariants = cva(
  "border border-border/70 bg-card text-foreground",
  {
    variants: {
      tone: {
        default: "",
        soft: "bg-muted/30",
        warm: "bg-amber-50/60 border-amber-200/70",
        warmStrong: "bg-amber-50/60 border-amber-500 border-2",
        success: "bg-emerald-50/60 border-emerald-300/70 text-emerald-950",
        danger: "bg-red-50 border-red-200 text-red-950",
      },
      shadow: {
        none: "shadow-none",
        sm: shadowTokens.sm,
        md: shadowTokens.md,
        lg: shadowTokens.lg,
      },
      interactive: {
        true: `cursor-pointer transition hover:shadow-[0_16px_34px_rgba(15,23,42,0.12),0_4px_10px_rgba(15,23,42,0.08)] ${tappableSurfaceFeedback}`,
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

// ── Icon ────────────────────────────────────────────────
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

export const iconButtonVariants = cva(`px-0 ${tappableSurfaceFeedback}`, {
  variants: {
    size: {
      compact: "h-10 w-10",
      liquid: "h-12 w-12",
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

// ── Text ────────────────────────────────────────────────
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
      none: "",
      normal: "font-normal",
      medium: "font-medium",
      semibold: "font-semibold",
      bold: "font-bold",
    },
    tone: {
      none: "",
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
      none: "",
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
    size: "base",
    weight: "none",
    tone: "none",
    align: "none",
    style: "default",
  },
});

// ── Layout ──────────────────────────────────────────────
export const rowVariants = cva("flex", {
  variants: {
    align: {
      center: "items-center",
      start: "items-start",
      end: "items-end",
      baseline: "items-baseline",
      stretch: "items-stretch",
    },
    justify: {
      start: "justify-start",
      end: "justify-end",
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

// ── Component Variants (multi-consumer) ─────────────────
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

export const interactiveRowVariants = cva(`${radiusTokens.sm} px-1 py-1 text-sm`, {
  variants: {
    interactive: {
      true: `cursor-pointer hover:bg-muted/45 ${tappableSurfaceFeedback}`,
      false: "cursor-default",
    },
  },
  defaultVariants: {
    interactive: false,
  },
});

export const dangerToneVariants = cva("", {
  variants: {
    base: {
      semibold: "font-semibold",
      "2xlBold": "text-2xl font-bold",
      baseSemibold: "text-base font-semibold text-foreground",
      medium: "font-medium",
      none: "",
    },
    tone: {
      danger: "text-destructive",
      default: "",
    },
  },
  defaultVariants: {
    base: "none",
    tone: "default",
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

// ── Const Styles (shared, multi-consumer) ───────────────
export const actionBar =
  `${radiusTokens.action} border border-white/70 bg-white/35 ${shadowTokens.glass}`;
export const primaryAction =
  `${radiusTokens.full} text-base font-semibold ${shadowTokens.orange} ${tappableSurfaceFeedback}`;
export const sheetShell = "h-[85vh] flex flex-col";
export const sheetBodyPadding = "px-4 py-2";
export const dialogHeaderTitle = "text-center";
export const dialogHeader = "space-y-1";
export const dialogFooter = "sm:flex-row sm:items-stretch";
export const dialogContent = "max-w-md";
export const dialogContentWide = "max-w-lg";
export const dialogBodySpacing = "mt-4";
export const previewImage = `h-full w-auto max-w-none object-contain`;
export const btnShadow = shadowTokens.md;
export const uploadPanel =
  `${radiusTokens.xl} border-2 border-dashed border-amber-200 bg-amber-50/40 hover:bg-amber-50 transition-colors`;
export const loadingSpinner =
  `animate-spin ${radiusTokens.full} border-b-2 border-amber-500`;
export const errorBox =
  `bg-red-50 border border-red-300 text-red-700 ${radiusTokens.lg} ${shadowTokens.sm} p-4`;
export const addButton =
  `h-6 w-6 p-0 ${radiusTokens.xs} bg-accent text-foreground hover:bg-accent/80`;
export const appShell = "bg-amber-50";
export const screenShell = "bg-amber-50 p-4";
export const divider = "border-t border-border/70";
export const iconButtonCompact = "h-8 w-8";
export const receiptCardPadding = "p-4 md:p-5";
export const errorList = "list-disc pl-5";
