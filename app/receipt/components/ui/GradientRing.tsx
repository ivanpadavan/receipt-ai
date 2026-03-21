import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/utils/cn";
import { radiusTokens } from "@/app/receipt/components/ui-styles";

const aiChatRainbowGradientClass =
  "bg-[conic-gradient(from_180deg_at_50%_50%,#f97316,#facc15,#4ade80,#22d3ee,#818cf8,#f472b6,#f97316)]";
const aiChatAnimatedRainbowGradientClass = `${aiChatRainbowGradientClass} animate-[ai-gradient-spin_3s_linear_infinite]`;

interface GradientRingProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
  animate?: boolean;
  radius?: keyof typeof radiusTokens;
  innerClassName?: string;
}

export const GradientRing = React.forwardRef<HTMLDivElement, GradientRingProps>(
  (
    {
      asChild = false,
      animate = false,
      radius = "2xl",
      className,
      innerClassName,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "div";
    const radiusClass = radiusTokens[radius];

    return (
      <div
        ref={ref}
        className={cn(
          "relative isolate overflow-hidden p-px",
          radiusClass,
          className,
        )}
        {...props}
      >
        <div
          aria-hidden
          className={cn(
            "absolute inset-0",
            radiusClass,
            animate ? aiChatAnimatedRainbowGradientClass : aiChatRainbowGradientClass,
          )}
        />
        <Comp className={cn("relative", innerClassName)}>{children}</Comp>
      </div>
    );
  },
);

GradientRing.displayName = "GradientRing";
