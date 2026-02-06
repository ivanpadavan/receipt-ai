import { create } from "zustand";
import { ParticipantDTO } from "@/model/receipt/model";

interface ParticipantsState {
  participants: ParticipantDTO[];
  initialized: boolean;
  setParticipants: (participants: ParticipantDTO[]) => void;
  hasParticipant: (id: string) => boolean;
  getById: (id: string) => ParticipantDTO | undefined;
}

export const useParticipantsStore = create<ParticipantsState>((set, get) => ({
  participants: [],
  initialized: false,
  setParticipants: (participants) =>
    set({ participants, initialized: true }),
  hasParticipant: (id) => get().participants.some((p) => p.id === id),
  getById: (id) => get().participants.find((p) => p.id === id),
}));
