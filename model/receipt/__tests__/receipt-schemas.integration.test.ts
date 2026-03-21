import { describe, expect, it } from "vitest";
import { withLanguage } from "@/app/i18n/translations";
import { receiptMathSchema } from "@/model/receipt/schema-math";
import {
  modifierSchema,
  positionAiSchema,
  receiptAiSchema,
  receiptTotalsSchema,
} from "@/model/receipt/schema-structural";
import {
  createEditableTotalsSchema,
  editableModifierSchema,
  editablePositionValidationSchema,
  receiptSchema,
  receiptValidationSchema,
} from "@/model/receipt/schema-form";
import { receiptWithParticipantsSchema } from "@/model/receipt/schema-participants";
import type { SafeParseReturnType } from "zod";
import type { Receipt } from "@/model/receipt/model";
import {
  calculateGrandTotal,
  calculateTotal,
  getExpectedReceiptTotals,
  sumModifiers,
  validatePosition,
} from "@/model/receipt/math";

const structurallyValidButMathInvalid = {
  meta: {},
  positions: [
    {
      name: "Beer",
      price: 969,
      quantity: 0.5,
      overall: 500,
    },
  ],
  fees: [],
  discounts: [],
  totals: {
    total: 500,
    grandTotal: 500,
  },
};

const businessValidReceipt = {
  meta: {},
  positions: [
    {
      name: "Beer",
      price: 969,
      quantity: 0.5,
      overall: 484.5,
    },
  ],
  fees: [],
  discounts: [],
  totals: {
    total: 484.5,
    grandTotal: 484.5,
  },
};

const appValidReceipt: Receipt = {
  ...businessValidReceipt,
  meta: {
    title: "Receipt",
    currencySymbol: "₽",
  },
  positions: [
    {
      id: "pos-1",
      claims: [
        {
          id: "claim-1",
          participantIds: ["user-1"],
          type: "quantity" as const,
          value: 0.5,
        },
      ],
      ...businessValidReceipt.positions[0],
    },
  ],
  fees: [],
  discounts: [],
};

const summarizeIssues = (
  result: SafeParseReturnType<unknown, unknown>,
) => {
  if (result.success) {
    return "success";
  }

  return result.error.issues.map((issue) => ({
    path: issue.path,
    message: issue.message,
  }));
};

describe("receipt schemas integration", () => {
  it("distinguishes structural and business validation", () => {
    expect(
      summarizeIssues(receiptAiSchema.safeParse(structurallyValidButMathInvalid)),
    ).toMatchInlineSnapshot(`
      [
        {
          "message": "Required",
          "path": [
            "meta",
            "title",
          ],
        },
        {
          "message": "Required",
          "path": [
            "meta",
            "currencySymbol",
          ],
        },
      ]
    `);
    expect(
      summarizeIssues(
        receiptMathSchema.safeParse(structurallyValidButMathInvalid),
      ),
    ).toMatchInlineSnapshot(`
      [
        {
          "message": "Required",
          "path": [
            "meta",
            "title",
          ],
        },
        {
          "message": "Required",
          "path": [
            "meta",
            "currencySymbol",
          ],
        },
      ]
    `);
    expect(
      summarizeIssues(receiptMathSchema.safeParse(businessValidReceipt)),
    ).toMatchInlineSnapshot(`
      [
        {
          "message": "Required",
          "path": [
            "meta",
            "title",
          ],
        },
        {
          "message": "Required",
          "path": [
            "meta",
            "currencySymbol",
          ],
        },
      ]
    `);
  });

  it("uses the same business schema with english messages in api context", async () => {
    await expect(
      withLanguage("en", () =>
        summarizeIssues(
          receiptMathSchema.safeParse(structurallyValidButMathInvalid),
        ),
      ),
    ).resolves.toMatchInlineSnapshot(`
      [
        {
          "message": "Required",
          "path": [
            "meta",
            "title",
          ],
        },
        {
          "message": "Required",
          "path": [
            "meta",
            "currencySymbol",
          ],
        },
      ]
    `);
  });

  it("validates localized structural field errors", () => {
    expect(
      summarizeIssues(
        positionAiSchema.safeParse({
          name: "",
          price: 0,
          quantity: 0,
          overall: 0,
        }),
      ),
    ).toMatchInlineSnapshot(`
      [
        {
          "message": "Название не должно быть пустым",
          "path": [
            "name",
          ],
        },
        {
          "message": "Цена должна быть больше 0",
          "path": [
            "price",
          ],
        },
        {
          "message": "Количество должно быть больше 0",
          "path": [
            "quantity",
          ],
        },
        {
          "message": "Сумма должна быть больше 0",
          "path": [
            "overall",
          ],
        },
      ]
    `);

    expect(
      summarizeIssues(
        modifierSchema.safeParse({
          name: "",
          value: 0,
        }),
      ),
    ).toMatchInlineSnapshot(`
      [
        {
          "message": "Название не должно быть пустым",
          "path": [
            "name",
          ],
        },
        {
          "message": "Значение должно быть больше 0",
          "path": [
            "value",
          ],
        },
      ]
    `);

    expect(
      summarizeIssues(
        receiptTotalsSchema.safeParse({
          total: 0,
          grandTotal: 0,
        }),
      ),
    ).toMatchInlineSnapshot(`
      [
        {
          "message": "Итог должен быть больше 0",
          "path": [
            "total",
          ],
        },
        {
          "message": "Итог с учетом скидок и сборов должен быть больше 0",
          "path": [
            "grandTotal",
          ],
        },
      ]
    `);
  });

  it("requires ids and claims shape at app schema level", () => {
    expect(
      summarizeIssues(receiptSchema.safeParse(businessValidReceipt)),
    ).toMatchInlineSnapshot(`
      [
        {
          "message": "Required",
          "path": [
            "meta",
            "title",
          ],
        },
        {
          "message": "Required",
          "path": [
            "meta",
            "currencySymbol",
          ],
        },
        {
          "message": "Required",
          "path": [
            "positions",
            0,
            "id",
          ],
        },
        {
          "message": "Required",
          "path": [
            "positions",
            0,
            "claims",
          ],
        },
      ]
    `);
    expect(
      summarizeIssues(receiptSchema.safeParse(appValidReceipt)),
    ).toMatchInlineSnapshot(`"success"`);
  });

  it("enforces claims business rules only in receiptValidationSchema", () => {
    const overclaimedReceipt = {
      ...appValidReceipt,
      positions: [
        {
          ...appValidReceipt.positions[0],
          claims: [
            {
              id: "claim-1",
              participantIds: ["user-1"],
              type: "quantity" as const,
              value: 1,
            },
          ],
        },
      ],
    };

    expect(
      summarizeIssues(receiptSchema.safeParse(overclaimedReceipt)),
    ).toMatchInlineSnapshot(`"success"`);
    expect(
      summarizeIssues(receiptValidationSchema.safeParse(overclaimedReceipt)),
    ).toMatchInlineSnapshot(`
      [
        {
          "message": "Распределенное количество больше количества позиции",
          "path": [
            "positions",
            0,
            "claims",
          ],
        },
      ]
    `);

    const overclaimedAmountReceipt = {
      ...appValidReceipt,
      positions: [
        {
          ...appValidReceipt.positions[0],
          claims: [
            {
              id: "claim-1",
              participantIds: ["user-1"],
              type: "amount" as const,
              value: 500,
            },
          ],
        },
      ],
    };

    expect(
      summarizeIssues(
        receiptValidationSchema.safeParse(overclaimedAmountReceipt),
      ),
    ).toMatchInlineSnapshot(`
      [
        {
          "message": "Распределенная сумма больше суммы позиции",
          "path": [
            "positions",
            0,
            "claims",
          ],
        },
      ]
    `);
  });

  it("reuses shared business validation in editable form schemas", () => {
    expect(
      summarizeIssues(
        editablePositionValidationSchema.safeParse({
          name: "",
          price: 0,
          quantity: 0,
          overall: 0,
        }),
      ),
    ).toMatchInlineSnapshot(`
      [
        {
          "message": "Название не должно быть пустым",
          "path": [
            "name",
          ],
        },
        {
          "message": "Цена должна быть больше 0",
          "path": [
            "price",
          ],
        },
        {
          "message": "Количество должно быть больше 0",
          "path": [
            "quantity",
          ],
        },
        {
          "message": "Сумма должна быть больше 0",
          "path": [
            "overall",
          ],
        },
      ]
    `);

    expect(
      summarizeIssues(
        editablePositionValidationSchema.safeParse(
          structurallyValidButMathInvalid.positions[0],
        ),
      ),
    ).toMatchInlineSnapshot(`
      [
        {
          "message": "Сумма должна совпадать с цена × количество",
          "path": [
            "overall",
          ],
        },
      ]
    `);

    expect(
      summarizeIssues(
        editableModifierSchema.safeParse({
          name: "",
          value: 10,
        }),
      ),
    ).toMatchInlineSnapshot(`
      [
        {
          "message": "Название не должно быть пустым",
          "path": [
            "name",
          ],
        },
      ]
    `);

    expect(
      summarizeIssues(
        editableModifierSchema.safeParse({
          name: "Service",
          value: 0,
        }),
      ),
    ).toMatchInlineSnapshot(`
      [
        {
          "message": "Значение должно быть больше 0",
          "path": [
            "value",
          ],
        },
      ]
    `);

    expect(
      summarizeIssues(
        createEditableTotalsSchema({
          ...appValidReceipt,
          positions: appValidReceipt.positions,
        }).safeParse({
          total: 400,
          grandTotal: 400,
        }),
      ),
    ).toMatchInlineSnapshot(`
      [
        {
          "message": "Итог 400 не совпадает с суммой позиций (484.5)",
          "path": [
            "total",
          ],
        },
        {
          "message": "С учетом скидок и сборов должно быть 484.5",
          "path": [
            "grandTotal",
          ],
        },
      ]
    `);

    expect(
      summarizeIssues(
        createEditableTotalsSchema({
          ...appValidReceipt,
          positions: appValidReceipt.positions,
        }).safeParse({
          total: 0,
          grandTotal: 0,
        }),
      ),
    ).toMatchInlineSnapshot(`
      [
        {
          "message": "Итог должен быть больше 0",
          "path": [
            "total",
          ],
        },
        {
          "message": "Итог с учетом скидок и сборов должен быть больше 0",
          "path": [
            "grandTotal",
          ],
        },
      ]
    `);

    expect(
      summarizeIssues(
        editablePositionValidationSchema.safeParse(businessValidReceipt.positions[0]),
      ),
    ).toMatchInlineSnapshot(`"success"`);

    expect(
      summarizeIssues(
        editableModifierSchema.safeParse({
          name: "Service",
          value: 10,
        }),
      ),
    ).toMatchInlineSnapshot(`"success"`);

    expect(
      summarizeIssues(
        createEditableTotalsSchema({
          ...appValidReceipt,
          positions: appValidReceipt.positions,
        }).safeParse({
          total: 484.5,
          grandTotal: 484.5,
        }),
      ),
    ).toMatchInlineSnapshot(`"success"`);
  });

  it("wraps receipt with participants schema", () => {
    expect(
      summarizeIssues(
        receiptWithParticipantsSchema.safeParse({
          receipt: appValidReceipt,
          participants: [
            {
              id: "user-1",
              displayName: "Anton",
              color: "#111",
              kind: "REAL",
            },
          ],
        }),
      ),
    ).toMatchInlineSnapshot(`"success"`);
  });

  it("covers receipt math helpers", () => {
    expect(validatePosition(structurallyValidButMathInvalid.positions[0])).toBe(
      "Position Beer: overall value 500 doesn't match quantity * price (0.5 * 969 = 484.5)",
    );
    expect(validatePosition(businessValidReceipt.positions[0])).toBe("");
    expect(calculateTotal(appValidReceipt.positions)).toBe(484.5);
    expect(sumModifiers([{ value: 10 }, { value: 2.5 }])).toBe(12.5);
    expect(
      calculateGrandTotal({
        totals: { total: 100 },
        fees: [{ value: 10 }],
        discounts: [{ value: 2.5 }],
      }),
    ).toBe(107.5);
    expect(
      getExpectedReceiptTotals({
        positions: appValidReceipt.positions,
        fees: [],
        discounts: [],
      }),
    ).toEqual({
      total: 484.5,
      grandTotal: 484.5,
    });
    expect(
      getExpectedReceiptTotals(
        {
          positions: appValidReceipt.positions,
          fees: [],
          discounts: [],
        },
        400,
      ),
    ).toEqual({
      total: 400,
      grandTotal: 400,
    });
  });
});
