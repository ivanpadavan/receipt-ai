import { ReceiptParticipant } from "@/model/receipt/model";
import { useUser } from "@/context/AuthContext";
import { cn } from "@/utils/cn";
import { UserAvatar } from "@/components/ui/user-avatar";

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
    const avatarUrl = iscurrentUser ? user?.user_metadata?.avatarUrl : undefined;

    const effectiveRingColor = ringColor ?? participant.color;

    return (
        <UserAvatar
            name={participant.name}
            src={avatarUrl}
            className={cn("h-8 w-8", className)}
            showRing={showRing}
            ringColor={effectiveRingColor}
        />
    );
};
