import { beforeEach, describe, expect, it, vi } from "vitest";
import { Receipt } from "@/model/receipt/model";
import { joinReceiptServer } from "@/app/receipt/[id]/join-flow/join-receipt-server";
import type { User } from "@supabase/supabase-js";

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    receiptUserParticipant: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    receiptMockParticipant: {
      findMany: vi.fn(),
    },
    receipt: {
      update: vi.fn(),
    },
    users: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/app/db", () => ({ db: dbMock }));

const makeUser = ({
  id,
  displayName,
  isAnonymous = false,
}: {
  id: string;
  displayName?: string;
  isAnonymous?: boolean;
}) =>
  ({
    id,
    is_anonymous: isAnonymous,
    user_metadata: {
      ...(displayName ? { displayName } : {}),
    },
  }) as User;

describe("joinReceiptServer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns existing participant when already joined", async () => {
    const existing = {
      id: "rup-1",
      receiptId: "r-1",
      userId: "u-1",
      color: "#F59E0B",
    };
    dbMock.receiptUserParticipant.findFirst.mockResolvedValue(existing);

    const result = await joinReceiptServer("r-1", makeUser({
      id: "u-1",
      displayName: "Anton",
    }));

    expect(result).toBe(existing);
    expect(dbMock.receiptUserParticipant.create).not.toHaveBeenCalled();
  });

  it("creates participant when user has display name", async () => {
    dbMock.receiptUserParticipant.findFirst.mockResolvedValue(null);
    dbMock.receiptUserParticipant.findMany.mockResolvedValue([]);
    dbMock.receiptMockParticipant.findMany.mockResolvedValue([]);
    dbMock.receiptUserParticipant.create.mockResolvedValue({
      id: "rup-new",
      receiptId: "r-1",
      userId: "u-2",
      color: "#F59E0B",
    });

    await joinReceiptServer("r-1", makeUser({
      id: "u-2",
      displayName: "Polina",
    }));

    expect(dbMock.receiptUserParticipant.create).toHaveBeenCalledTimes(1);
  });

  it("throws when creating new participant without display name", async () => {
    dbMock.receiptUserParticipant.findFirst.mockResolvedValue(null);

    await expect(
      joinReceiptServer("r-1", makeUser({ id: "u-3" })),
    ).rejects.toThrow("Display name required");
  });

  it("replaces offline anonymous participant and rewrites claim owner ids", async () => {
    dbMock.receiptUserParticipant.findFirst.mockResolvedValue(null);

    const receiptData: Receipt = {
      positions: [
        {
          id: "pos-1",
          name: "Item",
          quantity: 1,
          price: 100,
          overall: 100,
          claims: [
            {
              id: "claim-1",
              type: "amount",
              value: 100,
              participantIds: ["old-anon-user-id"],
            },
          ],
        },
      ],
      fees: [],
      discounts: [],
      totals: {
        total: 100,
        grandTotal: 100,
      },
    };

    dbMock.receiptUserParticipant.findUnique.mockResolvedValue({
      id: "rup-old-anon",
      receiptId: "r-1",
      userId: "old-anon-user-id",
      color: "#F59E0B",
      user: {
        id: "old-anon-user-id",
        is_anonymous: true,
        raw_user_meta_data: {
          displayName: "Old Anonymous Name",
        },
      },
      receipt: {
        id: "r-1",
        data: receiptData,
      },
    });

    const tx = {
      users: { update: vi.fn().mockResolvedValue({}) },
      receiptUserParticipant: {
        update: vi.fn().mockResolvedValue({}),
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({
            id: "rup-old-anon",
            receiptId: "r-1",
            userId: "old-anon-user-id",
            color: "#F59E0B",
            user: {
              id: "old-anon-user-id",
              is_anonymous: true,
              raw_user_meta_data: {
                displayName: "Old Anonymous Name",
              },
            },
            receipt: {
              id: "r-1",
              data: receiptData,
            },
          })
          .mockResolvedValueOnce({
            id: "rup-old-anon",
            receiptId: "r-1",
            userId: "new-anon-user-id",
            color: "#F59E0B",
          }),
      },
      receipt: { update: vi.fn().mockResolvedValue({}) },
    };

    dbMock.$transaction.mockImplementation(async (cb: any) => cb(tx));

    const result = await (joinReceiptServer as any)(
      "r-1",
      makeUser({
        id: "new-anon-user-id",
        isAnonymous: true,
      }),
      { replaceParticipantId: "old-anon-user-id" },
    );

    expect(tx.users.update).toHaveBeenCalledWith({
      where: { id: "new-anon-user-id" },
      data: {
        raw_user_meta_data: {
          displayName: "Old Anonymous Name",
        },
      },
    });
    expect(tx.receiptUserParticipant.update).toHaveBeenCalledWith({
      where: { id: "rup-old-anon" },
      data: { userId: "new-anon-user-id" },
    });
    expect(tx.receipt.update).toHaveBeenCalledWith({
      where: { id: "r-1" },
      data: {
        data: {
          ...receiptData,
          positions: [
            {
              ...receiptData.positions[0],
              claims: [
                {
                  ...receiptData.positions[0].claims[0],
                  participantIds: ["new-anon-user-id"],
                },
              ],
            },
          ],
        },
      },
    });
    expect(result).toMatchObject({
      userId: "new-anon-user-id",
    });
  });
});
