import { create } from "zustand";
import { ParticipantDTO } from "@/model/receipt/model";

interface ParticipantsState {
  participants: ParticipantDTO[];
  setParticipants: (participants: ParticipantDTO[]) => void;
  hasParticipant: (id: string) => boolean;
  getById: (id: string) => ParticipantDTO | undefined;
}

export const useParticipantsStore = create<ParticipantsState>((set, get) => ({
  participants: [],
  setParticipants: (participants) =>
    set({ participants }),
  hasParticipant: (id) => get().participants.some((p) => p.id === id),
  getById: (id) => get().participants.find((p) => p.id === id),
}));
