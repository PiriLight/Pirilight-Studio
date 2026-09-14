import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Estado de sessão/UI (não é dado de negócio): qual dos dois fundadores está
 * "a ver" a app neste browser. Nomes fixos — nunca "Afonso"/"João" no
 * produto (ver plano, secção 13). Persistido em localStorage só para
 * conveniência entre sessões; não tem qualquer efeito nos dados (que ainda
 * nem existem nesta ronda).
 */
export type ProfileId = "sny" | "bino";

export interface Profile {
  id: ProfileId;
  name: string;
  initials: string;
}

export const PROFILES: Record<ProfileId, Profile> = {
  sny: { id: "sny", name: "Sny", initials: "SN" },
  bino: { id: "bino", name: "Bino", initials: "BI" },
};

interface ProfileState {
  activeProfileId: ProfileId;
  setActiveProfileId: (id: ProfileId) => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      activeProfileId: "sny",
      setActiveProfileId: (id) => set({ activeProfileId: id }),
    }),
    { name: "pirilight-active-profile" },
  ),
);
