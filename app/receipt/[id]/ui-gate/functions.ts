import { ParticipantDTO } from "@/model/receipt/model";
import { User } from "@supabase/supabase-js";
import { FormScenario } from "@/app/receipt/[id]/useReceiptFormState";

function joined(participants: ParticipantDTO[], user: User) {
  return participants.find((p) => p.id === user.id);
}
function mustJoin(
  participants: ParticipantDTO[],
  user: User,
  formType: FormScenario["type"],
) {
  if (formType !== "splitting") return false;
  if (joined(participants, user)) return false;
  return true;
}
function canJoin(user: User) {
  return !!user.user_metadata.displayName;
}

export function joinAutomatically(participants: ParticipantDTO[], user: User) {
  return !joined(participants, user) && canJoin(user);
}

export function checkUiGate(
  participants: ParticipantDTO[],
  user: User,
  formType: FormScenario["type"],
) {
  if (mustJoin(participants, user, formType)) {
    if (canJoin(user)) {
      return "join";
    } else {
      return "settings";
    }
  }
  return "nothing";
}
