import { cva } from "class-variance-authority";

export const iconGroupVariants = cva(
  "rounded-full border border-white/95 bg-white/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] [&>*]:border-0",
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
  "rounded-full border border-white/90 bg-white/82 shadow-inner",
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
