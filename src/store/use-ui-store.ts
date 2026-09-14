import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Estado de UI transversal (não é dado de negócio): a Sidebar está
 * colapsada ou não. Persistido em localStorage por conveniência.
 */
interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    }),
    { name: "pirilight-ui" },
  ),
);
