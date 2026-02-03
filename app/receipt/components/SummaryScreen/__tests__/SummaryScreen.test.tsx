import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SummaryScreen } from "../SummaryScreen";
import { Receipt } from "@/model/receipt/model";

// Mock translations
vi.mock("@/app/i18n/translations", () => ({
    t: (key: string) => {
        const translations: Record<string, string> = {
            receipt: "Receipt",
            remaining: "Remaining",
            overpaid: "Overpaid",
            share: "Share",
            total: "Total",
            noClaims: "No claims yet",
        };
        return translations[key] || key;
    },
}));

// Mock Avatar
vi.mock("@/components/ui/participant-avatar", () => ({
    ParticipantAvatar: ({ participant }: { participant: any }) => <div>{participant.name[0]}</div>,
}));

// Mock Sonner
vi.mock("sonner", () => ({
    toast: { success: vi.fn() },
}));

describe("SummaryScreen", () => {
    const mockReceipt: Receipt = {
        positions: [
            {
                id: "p1",
                name: "Item 1",
                price: 100,
                quantity: 1,
                overall: 100,
                claims: [
                    {
                        type: "quantity",
                        value: 1,
                        participantIds: ["user1"],
                    },
                ],
            },
        ],
        participants: [
            { id: "user1", name: "Alice", color: "red" },
        ],
        // Total claimed: 100.
        // We want a discount. Let's make GrandTotal 90.
        // Ratio = 90 / 100 = 0.9.
        totals: {
            total: 100,
            grandTotal: 90,
        },
        fees: [],
        discounts: [{ id: "d1", name: "Disc", value: 10 }],
        editingFinished: true,
    };

    it("displays discount with correct formatting (minus sign)", () => {
        render(<SummaryScreen receipt={mockReceipt} onBack={() => { }} />);

        // Alice claimed 100.
        // Final amount: 100 * 0.9 = 90.
        // Base: 100.
        // Diff: -10.
        // Expected display: "100 − 10" (using the special minus char or just checking format)

        expect(screen.getByText("Alice")).toBeInTheDocument();
        expect(screen.getByText("90 ₽")).toBeInTheDocument(); // Final amount

        // The breakdown string: "100 − 10"
        // Note: I used "−" (U+2212) or "-" (hyphen)?
        // In the code I used: (balance.finalAmount - balance.baseAmount) > 0 ? "+" : "−"
        // That is U+2212 MINUS SIGN if I copied correctly, or just a dash.
        // Let's check what I wrote: "−" in the replace_file_content.

        // I will search for the element containing "100" and "10"

        // We can look for the breakdown text directly.
        // 100 − 10
        // Use a function match for flexibility or specific string if confident.

        const breakdown = screen.getByText((content, element) => {
            return element?.tagName.toLowerCase() === 'span' &&
                content.includes("100") &&
                (content.includes("−") || content.includes("-")) &&
                content.includes("10");
        });

        expect(breakdown).toBeInTheDocument();
        expect(breakdown.textContent).toContain("100 − 10");
    });

    it("displays fee with plus sign", () => {
        const feeReceipt = {
            ...mockReceipt,
            totals: {
                total: 100,
                grandTotal: 110,
            },
            discounts: [],
            fees: [{ id: "f1", name: "Service", value: 10 }],
        };

        render(<SummaryScreen receipt={feeReceipt} onBack={() => { }} />);

        // Final: 110. Base: 100. Diff: +10.
        const breakdown = screen.getByText((content, element) => {
            return element?.tagName.toLowerCase() === 'span' && content.includes("100") && content.includes("+") && content.includes("10");
        });
        expect(breakdown).toBeInTheDocument();
        expect(breakdown.textContent).toContain("100 + 10");
    });
});
