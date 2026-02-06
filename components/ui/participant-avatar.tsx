import { ParticipantDTO } from "@/model/receipt/model";
import { UserAvatar } from "@/components/ui/user-avatar";

interface ParticipantAvatarProps {
    participant: ParticipantDTO;
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
    const avatarUrl =
        participant.kind === "REAL"
            ? participant.avatarUrl ?? undefined
            : undefined;

    const effectiveRingColor = ringColor ?? participant.color;

    return (
        <UserAvatar
            name={participant.displayName}
            src={avatarUrl}
            className={className}
            showRing={showRing}
            ringColor={effectiveRingColor}
            fallbackColor={participant.color}
        />
    );
};
