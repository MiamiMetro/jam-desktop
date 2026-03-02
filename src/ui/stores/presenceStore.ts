import { create } from "zustand";

export type PresenceStatus = "online" | "away" | "busy";

interface PresenceState {
  manualStatus: PresenceStatus;
  currentStatus: PresenceStatus;
  roomToken: string | null;
  isStatusChanging: boolean;
  setManualStatus: (status: PresenceStatus) => void;
  setCurrentStatus: (status: PresenceStatus) => void;
  setRoomToken: (roomToken: string | null) => void;
  setIsStatusChanging: (changing: boolean) => void;
}

const PRESENCE_STATUS_STORAGE_KEY = "presenceManualStatus";

function getInitialManualStatus(): PresenceStatus {
  const stored = localStorage.getItem(PRESENCE_STATUS_STORAGE_KEY);
  if (stored === "away" || stored === "busy") {
    return stored;
  }
  return "online";
}

export const usePresenceStore = create<PresenceState>((set) => ({
  manualStatus: getInitialManualStatus(),
  currentStatus: getInitialManualStatus(),
  roomToken: null,
  isStatusChanging: false,
  setManualStatus: (status) => {
    localStorage.setItem(PRESENCE_STATUS_STORAGE_KEY, status);
    set({ manualStatus: status });
  },
  setCurrentStatus: (status) => {
    set({ currentStatus: status });
  },
  setRoomToken: (roomToken) => {
    set({ roomToken });
  },
  setIsStatusChanging: (changing) => {
    set({ isStatusChanging: changing });
  },
}));
