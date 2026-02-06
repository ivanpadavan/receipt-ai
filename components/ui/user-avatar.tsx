import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/utils/cn";

interface UserAvatarProps {
  name: string;
  src?: string | null;
  className?: string;
  showRing?: boolean;
  ringColor?: string;
  fallbackColor?: string;
}

export const UserAvatar = ({
  name,
  src,
  className,
  showRing = false,
  ringColor,
  fallbackColor,
}: UserAvatarProps) => {
  const initials = name.trim().substring(0, 1).toUpperCase() || "?";

  return (
    <Avatar
      className={cn("h-8 w-8", showRing && "ring-2", className)}
      style={
        showRing && ringColor
          ? ({ "--tw-ring-color": ringColor } as React.CSSProperties)
          : undefined
      }
    >
      {src && <AvatarImage src={src} />}
      <AvatarFallback
        style={
          fallbackColor
            ? {
                backgroundColor: `color-mix(in srgb, ${fallbackColor}, white 92%)`,
                color: fallbackColor,
              }
            : undefined
        }
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
};
