import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  activeModal: string | null;
  breadcrumbs: Array<{ label: string; path?: string }>;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleMobileSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  setBreadcrumbs: (crumbs: Array<{ label: string; path?: string }>) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  activeModal: null,
  breadcrumbs: [],

  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleMobileSidebar: () => set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  openModal: (modalId) => set({ activeModal: modalId }),
  closeModal: () => set({ activeModal: null }),
  setBreadcrumbs: (crumbs) => set({ breadcrumbs: crumbs }),
}));
