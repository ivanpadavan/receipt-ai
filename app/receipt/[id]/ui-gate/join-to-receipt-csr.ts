export function joinToReciept(receiptId: string): Promise<unknown> {
  return fetch(`/api/receipt/${receiptId}/participants/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
}
