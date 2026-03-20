import { Receipt, ReceiptWithParticipants } from "@/model/receipt/model";
import type { ReceiptChatResponse } from "@/model/receipt/schema-chat";

export const validReceipt: Receipt = {
  meta: {
    title: "Receipt",
    currencySymbol: "$",
  },
  positions: [
    {
      id: "pos-milk",
      name: "Milk",
      quantity: 1,
      price: 801,
      overall: 801,
      claims: [],
    },
    {
      id: "pos-bread",
      name: "Bread",
      quantity: 2,
      price: 150,
      overall: 300,
      claims: [],
    },
    {
      id: "pos-butter",
      name: "Butter",
      quantity: 1,
      price: 220,
      overall: 220,
      claims: [],
    },
  ],
  totals: {
    total: 1321,
    grandTotal: 1321,
  },
  fees: [],
  discounts: [],
};

export const joinedParticipants: ReceiptWithParticipants["participants"] = [
  {
    id: "user-1",
    displayName: "Ivan",
    color: "#111111",
    kind: "REAL",
    isAnonymous: false,
    isOnline: true,
  },
];

export const invalidReceipt: Receipt = {
  ...validReceipt,
  totals: {
    total: 9999,
    grandTotal: 9999,
  },
};

export const invalidNameReceipt: Receipt = {
  ...validReceipt,
  positions: [
    {
      ...validReceipt.positions[0],
      name: "",
    },
    ...validReceipt.positions.slice(1),
  ],
};

export const invalidPositionAndTotalsReceipt: Receipt = {
  ...invalidReceipt,
  positions: [
    {
      ...validReceipt.positions[0],
      name: "",
      price: -801,
      quantity: -1,
      overall: -1,
    },
    ...validReceipt.positions.slice(1),
  ],
};

export const invalidOverallMismatchReceipt: Receipt = {
  ...validReceipt,
  positions: [
    {
      ...validReceipt.positions[0],
      overall: 999,
    },
    ...validReceipt.positions.slice(1),
  ],
};

export const invalidZeroPositionReceipt: Receipt = {
  ...validReceipt,
  positions: [
    {
      id: "pos-zero",
      name: "",
      quantity: 0,
      price: 0,
      overall: 0,
      claims: [],
    },
    ...validReceipt.positions,
  ],
};

export const overClaimedReceipt: Receipt = {
  ...validReceipt,
  positions: [
    {
      ...validReceipt.positions[1],
      claims: [
        {
          id: "claim-1",
          participantIds: ["user-1"],
          type: "quantity",
          value: 2,
        },
      ],
    },
    validReceipt.positions[0],
    validReceipt.positions[2],
  ],
};

export const splittingParticipants: ReceiptWithParticipants["participants"] = [
  {
    id: "user-2",
    displayName: "Anton",
    color: "#f59e0b",
    kind: "REAL",
    isAnonymous: false,
    isOnline: true,
  },
  {
    id: "user-1",
    displayName: "Ivan",
    color: "#111111",
    kind: "REAL",
    isAnonymous: false,
    isOnline: true,
  },
  {
    id: "user-3",
    displayName: "Polina",
    color: "#22c55e",
    kind: "REAL",
    isAnonymous: false,
    isOnline: true,
  },
];

export const partiallyDistributedReceipt: Receipt = {
  ...validReceipt,
  positions: [
    validReceipt.positions[0],
    {
      ...validReceipt.positions[1],
      claims: [
        {
          id: "claim-existing",
          type: "amount",
          value: 150,
          participantIds: ["user-2"],
        },
      ],
    },
    validReceipt.positions[2],
  ],
};

export const fullyDistributedReceipt: Receipt = {
  ...validReceipt,
  positions: [
    validReceipt.positions[0],
    {
      ...validReceipt.positions[1],
      claims: [
        {
          id: "claim-fully-distributed",
          type: "amount",
          value: 300,
          participantIds: ["user-2"],
        },
      ],
    },
    validReceipt.positions[2],
  ],
};

export const quantityMaxSwitchReceipt: Receipt = {
  ...validReceipt,
  positions: [
    validReceipt.positions[0],
    {
      ...validReceipt.positions[1],
      claims: [
        {
          id: "claim-edit-quantity",
          type: "quantity",
          value: 1,
          participantIds: ["user-1"],
        },
        {
          id: "claim-other-amount",
          type: "amount",
          value: 150,
          participantIds: ["user-2"],
        },
      ],
    },
    validReceipt.positions[2],
  ],
};

export const amountMaxSwitchReceipt: Receipt = {
  ...validReceipt,
  positions: [
    validReceipt.positions[0],
    {
      ...validReceipt.positions[1],
      claims: [
        {
          id: "claim-edit-amount",
          type: "amount",
          value: 150,
          participantIds: ["user-1"],
        },
        {
          id: "claim-other-amount",
          type: "amount",
          value: 150,
          participantIds: ["user-2"],
        },
      ],
    },
    validReceipt.positions[2],
  ],
};

export const summaryBalancedReceipt: Receipt = {
  ...validReceipt,
  positions: [
    {
      ...validReceipt.positions[0],
      claims: [
        {
          id: "summary-claim-milk",
          type: "quantity",
          value: 1,
          participantIds: ["user-1"],
        },
      ],
    },
    {
      ...validReceipt.positions[1],
      claims: [
        {
          id: "summary-claim-bread-anton",
          type: "quantity",
          value: 1,
          participantIds: ["user-2"],
        },
        {
          id: "summary-claim-bread-polina",
          type: "quantity",
          value: 1,
          participantIds: ["user-3"],
        },
      ],
    },
    {
      ...validReceipt.positions[2],
      claims: [
        {
          id: "summary-claim-butter",
          type: "quantity",
          value: 1,
          participantIds: ["user-1"],
        },
      ],
    },
  ],
};

export const aiChatStructuralPreviewResponse: ReceiptChatResponse = {
  type: "structural_preview",
  receipt: {
    meta: {
      title: "AI draft",
      currencySymbol: "$",
    },
    positions: [
      {
        name: "Burger",
        price: 100,
        quantity: 1,
        overall: 100,
      },
      {
        name: "Fries",
        price: 50,
        quantity: 2,
        overall: 100,
      },
    ],
    fees: [
      {
        name: "Service",
        value: 15,
      },
    ],
    discounts: [
      {
        name: "Promo",
        value: 10,
      },
    ],
    totals: {
      total: 200,
      grandTotal: 205,
    },
  },
};

export const aiChatClaimsPreviewResponse: ReceiptChatResponse = {
  type: "claims_preview",
  receipt: summaryBalancedReceipt,
  positionClaims: {
    "position-1": summaryBalancedReceipt.positions[0].claims,
    "position-2": summaryBalancedReceipt.positions[1].claims,
    "position-3": summaryBalancedReceipt.positions[2].claims,
  },
};

export const summaryRemainingReceipt: Receipt = {
  ...validReceipt,
  positions: [
    {
      ...validReceipt.positions[0],
      claims: [
        {
          id: "summary-claim-milk",
          type: "quantity",
          value: 1,
          participantIds: ["user-1"],
        },
      ],
    },
    {
      ...validReceipt.positions[1],
      claims: [
        {
          id: "summary-claim-bread-anton",
          type: "quantity",
          value: 1,
          participantIds: ["user-2"],
        },
      ],
    },
    {
      ...validReceipt.positions[2],
      claims: [],
    },
  ],
};

export const receiptWithModifiers: Receipt = {
  ...validReceipt,
  fees: [
    {
      id: "fee-delivery",
      name: "Delivery",
      value: 100,
    },
  ],
  discounts: [
    {
      id: "discount-loyalty",
      name: "Loyalty",
      value: 50,
    },
  ],
  totals: {
    total: 1321,
    grandTotal: 1371,
  },
};

export const invalidReviewReceipt: Receipt = {
  ...receiptWithModifiers,
  positions: [
    {
      ...validReceipt.positions[0],
      overall: 999,
    },
    ...validReceipt.positions.slice(1),
  ],
  totals: {
    total: 9999,
    grandTotal: 9999,
  },
};

export const serverUpdatedMilkReceipt: Receipt = {
  ...invalidPositionAndTotalsReceipt,
  positions: [
    {
      ...invalidPositionAndTotalsReceipt.positions[0],
      name: "Milk",
      price: 777,
      quantity: 1,
      overall: 777,
    },
    ...invalidPositionAndTotalsReceipt.positions.slice(1),
  ],
};

export const receiptWithoutButterPosition: Receipt = {
  ...invalidPositionAndTotalsReceipt,
  positions: [
    invalidPositionAndTotalsReceipt.positions[0],
    invalidPositionAndTotalsReceipt.positions[1],
  ],
};
