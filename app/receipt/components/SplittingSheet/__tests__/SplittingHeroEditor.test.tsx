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

describe("SplittingHeroEditor", () => {
  afterEach(() => {
    cleanup();
  });

  it("keeps trailing decimal separator while typing", () => {
    const onUpdate = vi.fn();

    render(
      <SplittingHeroEditor
        claim={baseClaim}
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
});
