import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/utils/cn";
import { UserMetadata } from "@supabase/supabase-js";

interface UserAvatarProps {
  userMetadata: UserMetadata;
  className?: string;
  showRing?: boolean;
  ringColor?: string;
  fallbackColor?: string;
}

export const UserAvatar = ({
  userMetadata: { displayName, avatarUrl },
  className,
  showRing = false,
  ringColor,
  fallbackColor,
}: UserAvatarProps) => {
  const initials = displayName.trim().substring(0, 1).toUpperCase() || "?";

  return (
    <Avatar
      className={cn("h-8 w-8", showRing && "ring-2", className)}
      style={
        showRing && ringColor
          ? ({ "--tw-ring-color": ringColor } as React.CSSProperties)
          : undefined
      }
    >
      {avatarUrl && <AvatarImage src={avatarUrl} />}
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
