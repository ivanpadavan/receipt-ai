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
      findUnique: vi.fn(),
      delete: vi.fn(),
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

  const oldAnonymousUserId = "11111111-1111-4111-8111-111111111111";
  const newAnonymousUserId = "22222222-2222-4222-8222-222222222222";

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
      receiptMeta: { title: "Receipt", currencySymbol: "₽" },
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
              participantIds: [oldAnonymousUserId],
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
      userId: oldAnonymousUserId,
      color: "#F59E0B",
      user: {
        id: oldAnonymousUserId,
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
            userId: oldAnonymousUserId,
            color: "#F59E0B",
            user: {
              id: oldAnonymousUserId,
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
            userId: newAnonymousUserId,
            color: "#F59E0B",
          }),
      },
      receipt: { update: vi.fn().mockResolvedValue({}) },
    };

    dbMock.$transaction.mockImplementation(async (cb: any) => cb(tx));

    const result = await (joinReceiptServer as any)(
      "r-1",
      makeUser({
        id: newAnonymousUserId,
        isAnonymous: true,
      }),
      { replaceParticipantId: oldAnonymousUserId },
    );

    expect(tx.users.update).toHaveBeenCalledWith({
      where: { id: newAnonymousUserId },
      data: {
        raw_user_meta_data: {
          displayName: "Old Anonymous Name",
        },
      },
    });
    expect(tx.receiptUserParticipant.update).toHaveBeenCalledWith({
      where: { id: "rup-old-anon" },
      data: { userId: newAnonymousUserId },
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
                  participantIds: [newAnonymousUserId],
                },
              ],
            },
          ],
        },
      },
    });
    expect(result).toMatchObject({
      userId: newAnonymousUserId,
    });
  });

  it("replaces mock participant and rewrites claim owner ids", async () => {
    dbMock.receiptUserParticipant.findFirst.mockResolvedValue(null);

    const receiptData: Receipt = {
      receiptMeta: { title: "Receipt", currencySymbol: "₽" },
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
              participantIds: ["mock-1"],
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

    const tx = {
      users: { update: vi.fn().mockResolvedValue({}) },
      receiptUserParticipant: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          id: "rup-new",
          receiptId: "r-1",
          userId: "new-user-id",
          color: "#10B981",
        }),
      },
      receiptMockParticipant: {
        findUnique: vi.fn().mockResolvedValue({
          id: "mock-1",
          receiptId: "r-1",
          displayName: "Mock Person",
          color: "#10B981",
          receipt: {
            id: "r-1",
            data: receiptData,
          },
        }),
        delete: vi.fn().mockResolvedValue({}),
      },
      receipt: { update: vi.fn().mockResolvedValue({}) },
    };

    dbMock.$transaction.mockImplementation(async (cb: any) => cb(tx));

    const result = await (joinReceiptServer as any)(
      "r-1",
      makeUser({
        id: "new-user-id",
        isAnonymous: true,
      }),
      { replaceParticipantId: "mock-1" },
    );

    expect(tx.users.update).toHaveBeenCalledWith({
      where: { id: "new-user-id" },
      data: {
        raw_user_meta_data: {
          displayName: "Mock Person",
        },
      },
    });
    expect(tx.receiptUserParticipant.create).toHaveBeenCalledWith({
      data: {
        receiptId: "r-1",
        userId: "new-user-id",
        color: "#10B981",
      },
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
                  participantIds: ["new-user-id"],
                },
              ],
            },
          ],
        },
      },
    });
    expect(tx.receiptMockParticipant.delete).toHaveBeenCalledWith({
      where: { id: "mock-1" },
    });
    expect(result).toMatchObject({
      userId: "new-user-id",
      color: "#10B981",
    });
  });

  it("skips offline-anonymous lookup by mock id for non-uuid replaceParticipantId values", async () => {
    dbMock.receiptUserParticipant.findFirst.mockResolvedValue(null);

    const receiptData: Receipt = {
      receiptMeta: { title: "Receipt", currencySymbol: "₽" },
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
              participantIds: ["cmockparticipant123"],
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

    const tx = {
      users: { update: vi.fn().mockResolvedValue({}) },
      receiptUserParticipant: {
        findUnique: vi.fn(),
        create: vi.fn().mockResolvedValue({
          id: "rup-new",
          receiptId: "r-1",
          userId: "new-user-id",
          color: "#10B981",
        }),
      },
      receiptMockParticipant: {
        findUnique: vi.fn().mockResolvedValue({
          id: "cmockparticipant123",
          receiptId: "r-1",
          displayName: "Mock Person",
          color: "#10B981",
          receipt: {
            id: "r-1",
            data: receiptData,
          },
        }),
        delete: vi.fn().mockResolvedValue({}),
      },
      receipt: { update: vi.fn().mockResolvedValue({}) },
    };

    dbMock.$transaction.mockImplementation(async (cb: any) => cb(tx));

    await joinReceiptServer(
      "r-1",
      makeUser({
        id: "new-user-id",
        displayName: "Current User",
      }),
      { replaceParticipantId: "cmockparticipant123" },
    );

    expect(tx.receiptUserParticipant.findUnique).not.toHaveBeenCalledWith({
      where: {
        receiptId_userId: {
          receiptId: "r-1",
          userId: "cmockparticipant123",
        },
      },
      include: {
        user: true,
        receipt: true,
      },
    });
    expect(tx.receiptMockParticipant.delete).toHaveBeenCalledWith({
      where: { id: "cmockparticipant123" },
    });
  });

  it("prioritizes replace flow over existing participant when replaceParticipantId is provided", async () => {
    dbMock.receiptUserParticipant.findFirst.mockResolvedValue({
      id: "rup-existing",
      receiptId: "r-1",
      userId: "existing-user-id",
      color: "#F59E0B",
    });

    const receiptData: Receipt = {
      receiptMeta: { title: "Receipt", currencySymbol: "₽" },
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
              participantIds: ["mock-1"],
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

    const tx = {
      users: { update: vi.fn().mockResolvedValue({}) },
      receiptUserParticipant: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          id: "rup-created",
          receiptId: "r-1",
          userId: "existing-user-id",
          color: "#10B981",
        }),
      },
      receiptMockParticipant: {
        findUnique: vi.fn().mockResolvedValue({
          id: "mock-1",
          receiptId: "r-1",
          displayName: "Mock Person",
          color: "#10B981",
          receipt: {
            id: "r-1",
            data: receiptData,
          },
        }),
        delete: vi.fn().mockResolvedValue({}),
      },
      receipt: { update: vi.fn().mockResolvedValue({}) },
    };

    dbMock.$transaction.mockImplementation(async (cb: any) => cb(tx));

    await joinReceiptServer(
      "r-1",
      makeUser({
        id: "existing-user-id",
        displayName: "Existing User",
      }),
      { replaceParticipantId: "mock-1" },
    );

    expect(tx.receiptMockParticipant.delete).toHaveBeenCalledWith({
      where: { id: "mock-1" },
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
                  participantIds: ["existing-user-id"],
                },
              ],
            },
          ],
        },
      },
    });
  });

  it("reuses existing participant during mock replacement instead of creating duplicate", async () => {
    dbMock.receiptUserParticipant.findFirst.mockResolvedValue({
      id: "rup-existing",
      receiptId: "r-1",
      userId: "existing-user-id",
      color: "#F59E0B",
    });

    const receiptData: Receipt = {
      receiptMeta: { title: "Receipt", currencySymbol: "₽" },
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
              participantIds: ["mock-1"],
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

    const existingParticipant = {
      id: "rup-existing",
      receiptId: "r-1",
      userId: "existing-user-id",
      color: "#F59E0B",
    };

    const tx = {
      users: { update: vi.fn().mockResolvedValue({}) },
      receiptUserParticipant: {
        findUnique: vi
          .fn()
          .mockResolvedValue(existingParticipant),
        create: vi.fn(),
      },
      receiptMockParticipant: {
        findUnique: vi.fn().mockResolvedValue({
          id: "mock-1",
          receiptId: "r-1",
          displayName: "Mock Person",
          color: "#10B981",
          receipt: {
            id: "r-1",
            data: receiptData,
          },
        }),
        delete: vi.fn().mockResolvedValue({}),
      },
      receipt: { update: vi.fn().mockResolvedValue({}) },
    };

    dbMock.$transaction.mockImplementation(async (cb: any) => cb(tx));

    const result = await joinReceiptServer(
      "r-1",
      makeUser({
        id: "existing-user-id",
        displayName: "Existing User",
      }),
      { replaceParticipantId: "mock-1" },
    );

    expect(tx.receiptUserParticipant.create).not.toHaveBeenCalled();
    expect(tx.receiptMockParticipant.delete).toHaveBeenCalledWith({
      where: { id: "mock-1" },
    });
    expect(result).toBe(existingParticipant);
  });
});
