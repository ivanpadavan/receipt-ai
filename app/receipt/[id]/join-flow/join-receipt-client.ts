type JoinReceiptClientOptions = {
  replaceParticipantId?: string;
};

export function joinReceiptClient(
  receiptId: string,
  options: JoinReceiptClientOptions = {},
): Promise<unknown> {
  const body = options.replaceParticipantId
    ? JSON.stringify({ replaceParticipantId: options.replaceParticipantId })
    : undefined;

  return fetch(`/api/receipt/${receiptId}/participants/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}
