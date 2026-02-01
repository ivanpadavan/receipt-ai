import { ReceiptParticipant } from "@/model/receipt/model";
import { useUser } from "@/context/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/utils/cn";

interface ParticipantAvatarProps {
    participant: ReceiptParticipant;
    className?: string;
    showStatus?: boolean; // For the checkmark/selection state if needed? 
    // Actually, the selector handles the checkmark overlay. This component just renders the avatar content.
}

export const ParticipantAvatar = ({ participant, className }: ParticipantAvatarProps) => {
    const { user } = useUser();

    const iscurrentUser = user?.id === participant.id;
    const avatarUrl = iscurrentUser ? user?.user_metadata?.avatar_url : undefined;

    return (
        <Avatar className={cn("h-8 w-8", className)}>
            {avatarUrl && <AvatarImage src={avatarUrl} />}
            <AvatarFallback
                style={{
                    backgroundColor: participant.color + "20",
                    color: participant.color,
                    // If we have an image, we typically don't see fallback, but just in case style it.
                }}
            >
                {participant.name.substring(0, 1).toUpperCase()}
            </AvatarFallback>
        </Avatar>
    );
};
