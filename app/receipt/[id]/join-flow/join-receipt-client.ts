type JoinReceiptClientReplacePayload = {
  replaceParticipantId: string;
};

type JoinReceiptClientProfilePayload = {
  profile: {
    displayName: string;
    avatarUrl?: string;
    avatarFile?: File;
  };
};

type JoinReceiptClientPayload =
  | JoinReceiptClientReplacePayload
  | JoinReceiptClientProfilePayload;

export function joinReceiptClient(
  receiptId: string,
  payload?: JoinReceiptClientPayload,
): Promise<unknown> {
  if (!payload) {
    return fetch(`/api/receipt/${receiptId}/participants/join`, {
      method: "POST",
    });
  }

  if ("replaceParticipantId" in payload) {
    return fetch(`/api/receipt/${receiptId}/participants/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ replaceParticipantId: payload.replaceParticipantId }),
    });
  }

  const { avatarFile, ...profile } = payload.profile;

  if (avatarFile) {
    const formData = new FormData();
    formData.set("profile", JSON.stringify(profile));
    formData.set("avatarFile", avatarFile);

    return fetch(`/api/receipt/${receiptId}/participants/join`, {
      method: "POST",
      body: formData,
    });
  }

  return fetch(`/api/receipt/${receiptId}/participants/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile }),
  });
}
