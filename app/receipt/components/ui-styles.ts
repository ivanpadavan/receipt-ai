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
  "rounded-2xl border border-border/70 bg-card text-foreground",
  {
    variants: {
      tone: {
        default: "",
        soft: "bg-muted/30",
        warm: "bg-amber-50/60 border-amber-200/70",
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
    },
    defaultVariants: {
      tone: "default",
      shadow: "sm",
      interactive: false,
    },
  },
);

export const pillVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold",
  {
    variants: {
      tone: {
        neutral: "border-border/70 bg-muted/30 text-muted-foreground",
        accent: "border-amber-200 bg-amber-50 text-amber-700",
        success: "border-emerald-200 bg-emerald-50 text-emerald-700",
        danger: "border-red-200 bg-red-50 text-red-700",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);
