import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ParticipantsSheet } from "@/app/receipt/components/ParticipantsSheet/ParticipantsSheet";
import { useParticipantsStore } from "@/app/receipt/store/participants";

const joinReceiptClientMock = vi.fn();
const useUserMock = vi.fn();

vi.mock("@/app/receipt/[id]/join-flow/join-receipt-client", () => ({
  joinReceiptClient: (...args: unknown[]) => joinReceiptClientMock(...args),
}));

vi.mock("@/context/AuthContext", () => ({
  useUser: () => useUserMock(),
}));

vi.mock("@/app/i18n/translations", () => ({
  t: (key: string) => {
    const translations: Record<string, string> = {
      participants: "Participants",
      participantsEmpty: "No participants",
      online: "Online",
      offline: "Offline",
      addParticipant: "Add participant",
      newParticipantNamePlaceholder: "New participant name",
      done: "Done",
      edit: "Edit",
      delete: "Delete",
      deleteParticipant: "Delete participant",
      deleteParticipantConfirm: "Delete participant confirm",
      cancel: "Cancel",
      itsMe: "Это я",
    };
    return translations[key] || key;
  },
}));

vi.mock("@/components/ui/drawer", () => ({
  DrawerContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
  AlertDialogAction: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>{children}</button>
  ),
}));

vi.mock("@/app/receipt/components/ui/ReceiptCard", () => ({
  ReceiptCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/app/receipt/components/ui/participant-avatar", () => ({
  ParticipantAvatar: ({ participant }: { participant: { displayName: string } }) => (
    <div>{participant.displayName}</div>
  ),
}));

vi.mock("@/app/receipt/components/ui/ActionMenu", () => ({
  ActionMenu: ({ items }: { items: { id: string; label: string; onSelect: () => void }[] }) => (
    <div>
      {items.map((item) => (
        <button key={item.id} type="button" onClick={item.onSelect}>
          {item.label}
        </button>
      ))}
    </div>
  ),
}));

describe("ParticipantsSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useParticipantsStore.setState({
      participants: [
        {
          id: "real-anon-offline",
          displayName: "Anon Offline",
          color: "#111",
          kind: "REAL",
          isAnonymous: true,
          isOnline: false,
        },
        {
          id: "real-anon-online",
          displayName: "Anon Online",
          color: "#222",
          kind: "REAL",
          isAnonymous: true,
          isOnline: true,
        },
        {
          id: "real-named-offline",
          displayName: "Named Offline",
          color: "#333",
          kind: "REAL",
          isAnonymous: false,
          isOnline: false,
        },
        {
          id: "mock-1",
          displayName: "Mock Person",
          color: "#444",
          kind: "MOCK",
        },
      ],
    });
    useUserMock.mockReturnValue({
      user: {
        id: "current-user",
        user_metadata: {
          displayName: "Current User",
        },
      },
    });
  });

  afterEach(() => {
    cleanup();
    useParticipantsStore.setState({ participants: [] });
  });

  it("shows 'Это я' only for offline anonymous real and mock participants", () => {
    render(<ParticipantsSheet receiptId="receipt-1" />);

    expect(screen.getAllByRole("button", { name: "Это я" })).toHaveLength(2);
    expect(screen.getAllByText("Anon Offline").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Mock Person").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Anon Online").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Named Offline").length).toBeGreaterThan(0);
  });

  it("uses join flow replace endpoint when 'Это я' is clicked", async () => {
    joinReceiptClientMock.mockResolvedValue({});

    render(<ParticipantsSheet receiptId="receipt-1" />);

    fireEvent.click(screen.getAllByRole("button", { name: "Это я" })[0]);

    expect(joinReceiptClientMock).toHaveBeenCalledWith("receipt-1", {
      replaceParticipantId: "real-anon-offline",
    });
  });
});
