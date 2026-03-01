import React, { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { SplittingHeroEditor } from "@/app/receipt/components/SplittingSheet/SplittingHeroEditor";
import type { ReceiptPositionClaim } from "@/model/receipt/model";

const baseClaim: ReceiptPositionClaim = {
  id: "claim-1",
  type: "quantity",
  value: 0,
  participantIds: [],
};

const otherClaim: ReceiptPositionClaim = {
  id: "claim-2",
  type: "amount",
  value: 50,
  participantIds: [],
};

describe("SplittingHeroEditor", () => {
  afterEach(() => {
    cleanup();
  });

  it("keeps trailing decimal separator while typing", () => {
    const onUpdate = vi.fn();

    render(
      <SplittingHeroEditor
        claim={baseClaim}
        claims={[]}
        price={50}
        overall={100}
        participants={[]}
        saveDisabled={false}
        allParticipantsSelected={false}
        onUpdate={onUpdate}
        onCancel={() => undefined}
        onSave={() => undefined}
      />,
    );

    const input = screen.getAllByRole("textbox")[0];
    fireEvent.change(input, { target: { value: "1." } });

    expect(input).toHaveValue("1.");
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ value: 1 }),
    );
  });

  it("converts leading dot to 0.", () => {
    const onUpdate = vi.fn();

    render(
      <SplittingHeroEditor
        claim={baseClaim}
        claims={[]}
        price={50}
        overall={100}
        participants={[]}
        saveDisabled={false}
        allParticipantsSelected={false}
        onUpdate={onUpdate}
        onCancel={() => undefined}
        onSave={() => undefined}
      />,
    );

    const input = screen.getAllByRole("textbox")[0];
    fireEvent.change(input, { target: { value: "." } });

    expect(input).toHaveValue("0.");
    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ value: 0 }),
    );
  });

  it("max state is recalculated when switching from quantity to amount", () => {
    const Harness = () => {
      const [claim, setClaim] = useState<ReceiptPositionClaim>({
        ...baseClaim,
        value: 1,
      });

      return (
        <SplittingHeroEditor
          claim={claim}
          claims={[otherClaim]}
          price={50}
          overall={100}
          participants={[]}
          saveDisabled={false}
          allParticipantsSelected={false}
          onUpdate={setClaim}
          onCancel={() => undefined}
          onSave={() => undefined}
        />
      );
    };

    render(<Harness />);

    const maxButton = screen.getByRole("button", { name: "Макс" });
    expect(maxButton).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "₽" }));

    expect(maxButton).toHaveAttribute("aria-pressed", "false");
  });

  it("amount max can become invalid for quantity after type switch", () => {
    const Harness = () => {
      const [claim, setClaim] = useState<ReceiptPositionClaim>({
        ...baseClaim,
        type: "amount",
        value: 50,
      });

      return (
        <SplittingHeroEditor
          claim={claim}
          claims={[otherClaim]}
          price={50}
          overall={100}
          participants={[]}
          saveDisabled={claim.type === "quantity" && claim.value > 1}
          allParticipantsSelected={false}
          onUpdate={setClaim}
          onCancel={() => undefined}
          onSave={() => undefined}
        />
      );
    };

    render(<Harness />);

    const maxButton = screen.getByRole("button", { name: "Макс" });
    expect(maxButton).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "ШТ" }));

    expect(maxButton).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Сохранить" })).toBeDisabled();
  });
});
