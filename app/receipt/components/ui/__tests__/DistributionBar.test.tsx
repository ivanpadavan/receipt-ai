import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReceiptPosition } from "@/model/receipt/model";
import { DistributionBar } from "@/app/receipt/components/ui/DistributionBar";
import { useParticipantsStore } from "@/app/receipt/store/participants";

describe("DistributionBar", () => {
  afterEach(() => {
    useParticipantsStore.setState({ participants: [] });
  });

  it("ignores non-existing participant ids when splitting claim amount", () => {
    useParticipantsStore.setState({
      participants: [
        { id: "p1", displayName: "P1", color: "#111111", kind: "REAL" },
        { id: "p2", displayName: "P2", color: "#222222", kind: "REAL" },
      ],
    });

    const position: ReceiptPosition = {
      id: "pos-1",
      name: "Coffee",
      price: 45,
      quantity: 5,
      overall: 225,
      claims: [
        {
          id: "claim-1",
          type: "quantity",
          value: 5,
          participantIds: ["p1", "p2", "orphan-id"],
        },
      ],
    };

    render(<DistributionBar data={position} />);

    expect(screen.getByTitle("P1: 112.50")).toBeInTheDocument();
    expect(screen.getByTitle("P2: 112.50")).toBeInTheDocument();
  });

  it("keeps claim amounts in cent-safe precision", () => {
    useParticipantsStore.setState({
      participants: [
        { id: "p1", displayName: "P1", color: "#111111", kind: "REAL" },
      ],
    });

    const position: ReceiptPosition = {
      id: "pos-1",
      name: "Coffee",
      price: 1620,
      quantity: 1,
      overall: 1620,
      claims: [
        {
          id: "claim-1",
          type: "quantity",
          value: 0.55,
          participantIds: ["p1"],
        },
      ],
    };

    render(<DistributionBar data={position} />);

    expect(screen.getByTitle("P1: 891")).toBeInTheDocument();
  });
});
