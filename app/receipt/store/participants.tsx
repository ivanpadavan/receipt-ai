import React, { createContext, useContext, useRef } from "react";
import { ParticipantDTO } from "@/model/receipt/model";
import { createStore, StoreApi } from "zustand/vanilla";
import { useStore } from "zustand";
import { isEqual } from "lodash-es";

interface ParticipantsState {
  participants: ParticipantDTO[];
  setParticipants: (participants: ParticipantDTO[]) => void;
  hasParticipant: (id: string) => boolean;
  getById: (id: string) => ParticipantDTO | undefined;
}

export type ParticipantsStore = StoreApi<ParticipantsState>;

export const createParticipantsStore = (
  initialParticipants: ParticipantDTO[] = [],
) =>
  createStore<ParticipantsState>((set, get) => ({
    participants: initialParticipants,
    setParticipants: (participants) =>
      set((state) =>
        isEqual(state.participants, participants) ? state : { participants },
      ),
    hasParticipant: (id) => get().participants.some((p) => p.id === id),
    getById: (id) => get().participants.find((p) => p.id === id),
  }));

const fallbackStore = createParticipantsStore();
const ParticipantsStoreContext = createContext<ParticipantsStore | null>(null);

export const ParticipantsStoreProvider: React.FC<{
  initialParticipants: ParticipantDTO[];
  children: React.ReactNode;
}> = ({ initialParticipants, children }) => {
  const storeRef = useRef<ParticipantsStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createParticipantsStore(initialParticipants);
  }
  return (
    <ParticipantsStoreContext.Provider value={storeRef.current}>
      {children}
    </ParticipantsStoreContext.Provider>
  );
};

export const useParticipantsStore = <T,>(
  selector: (state: ParticipantsState) => T,
): T => {
  const store = useContext(ParticipantsStoreContext) ?? fallbackStore;
  return useStore(store, selector);
};

useParticipantsStore.setState = fallbackStore.setState;
useParticipantsStore.getState = fallbackStore.getState;
useParticipantsStore.subscribe = fallbackStore.subscribe;
