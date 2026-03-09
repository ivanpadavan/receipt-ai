import { ParticipantDTO } from "@/model/receipt/model";
import { User } from "@supabase/supabase-js";
import { FormScenario } from "@/app/receipt/[id]/useReceiptFormState";

function joined(participants: ParticipantDTO[], user: User) {
  return participants.find((p) => p.id === user.id);
}
function mustJoin(
  participants: ParticipantDTO[],
  user: User,
) {
  if (joined(participants, user)) return false;
  return true;
}
function canJoin(user: User) {
  return !!user.user_metadata.displayName;
}

export function shouldAutoJoinReceipt(
  participants: ParticipantDTO[],
  user: User,
) {
  return !joined(participants, user) && canJoin(user);
}

export function getOfflineAnonymousCandidates(
  participants: ParticipantDTO[],
  user: User,
) {
  return participants.filter(
    (participant) =>
      participant.kind === "REAL" &&
      participant.id !== user.id &&
      participant.isAnonymous &&
      !participant.isOnline,
  );
}

export function getJoinFlowState(
  participants: ParticipantDTO[],
  user: User,
) {
  if (mustJoin(participants, user)) {
    if (canJoin(user)) {
      return "join";
    } else {
      return "settings";
    }
  }
  return "nothing";
}
