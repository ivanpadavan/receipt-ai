import { cva } from "class-variance-authority";

const iconCapsuleSurface =
  "border border-foreground/15 bg-white/48 shadow-[inset_0_1px_0_rgba(255,255,255,0.32)] backdrop-blur-md";

export const iconGroupVariants = cva(
  `rounded-full ${iconCapsuleSurface} [&>*]:border-0`,
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
  `rounded-full ${iconCapsuleSurface}`,
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
        sm: "shadow-sm",
        md: "shadow-[0_10px_22px_rgba(15,23,42,0.08),0_2px_6px_rgba(15,23,42,0.05)]",
        lg: "shadow-[0_16px_34px_rgba(15,23,42,0.12),0_4px_10px_rgba(15,23,42,0.08)]",
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
        xl: "rounded-xl",
        "2xl": "rounded-2xl",
        "3xl": "rounded-3xl",
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
      full: "rounded-full",
      lg: "rounded-lg",
      xl: "rounded-xl",
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
    interaction: "none",
  },
});

export const actionBarVariants = cva(
  "rounded-[32px] border border-white/70 bg-white/35 shadow-[0_24px_48px_rgba(15,23,42,0.20)] backdrop-blur-2xl",
);

export const primaryActionVariants = cva(
  "rounded-full text-base font-semibold shadow-[0_14px_30px_rgba(249,115,22,0.36)]",
);

export const noticeVariants = cva(
  "rounded-md border px-3 py-3 text-sm",
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
      full: "rounded-full",
      md: "rounded-md",
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
