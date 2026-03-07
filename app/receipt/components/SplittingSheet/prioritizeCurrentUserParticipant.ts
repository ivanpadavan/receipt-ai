import type { ParticipantDTO } from "@/model/receipt/model";

export const prioritizeCurrentUserParticipant = (
  participants: ParticipantDTO[],
  currentUserId?: string,
) => {
  if (!currentUserId) {
    return participants;
  }

  const currentUserIndex = participants.findIndex(
    (participant) => participant.id === currentUserId,
  );

  if (currentUserIndex <= 0) {
    return participants;
  }

  return [
    participants[currentUserIndex],
    ...participants.slice(0, currentUserIndex),
    ...participants.slice(currentUserIndex + 1),
  ];
};
