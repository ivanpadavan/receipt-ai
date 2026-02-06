import { create } from "zustand";

export type GateStep = "choice" | "settings" | "removed" | null;

interface UiGateState {
  isBlocked: boolean;
  step: GateStep;
  openChoice: () => void;
  openSettings: () => void;
  openRemoved: () => void;
  closeGate: () => void;
}

export const useUiGateStore = create<UiGateState>((set) => ({
  isBlocked: false,
  step: null,
  openChoice: () => set({ isBlocked: true, step: "choice" }),
  openSettings: () => set({ isBlocked: true, step: "settings" }),
  openRemoved: () => set({ isBlocked: true, step: "removed" }),
  closeGate: () => set({ isBlocked: false, step: null }),
}));
