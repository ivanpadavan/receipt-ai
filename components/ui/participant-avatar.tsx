import { ReceiptParticipant } from "@/model/receipt/model";
import { useUser } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/utils/cn";

interface ParticipantAvatarProps {
    participant: ReceiptParticipant;
    className?: string;
    showRing?: boolean; // Show colored ring around avatar (default: true)
    ringColor?: string; // Override ring color (default: participant.color)
}

export const ParticipantAvatar = ({
    participant,
    className,
    showRing = true,
    ringColor,
}: ParticipantAvatarProps) => {
    const { user } = useUser();

    const iscurrentUser = user?.id === participant.id;
    const avatarUrl = iscurrentUser ? user?.user_metadata?.avatar_url : undefined;

    const effectiveRingColor = ringColor ?? participant.color;

    return (
        <Avatar
            className={cn(
                "h-8 w-8",
                showRing && "ring-2",
                className
            )}
            style={showRing ? { "--tw-ring-color": effectiveRingColor } as React.CSSProperties : undefined}
        >
            {avatarUrl && <AvatarImage src={avatarUrl} />}
            <AvatarFallback
                style={{
                    backgroundColor: `color-mix(in srgb, ${participant.color}, white 95%)`,
                    color: participant.color,
                }}
            >
                {participant.name.substring(0, 1).toUpperCase()}
            </AvatarFallback>
        </Avatar>
    );
};
