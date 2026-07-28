import { create } from 'zustand';

interface UIState {
  isDarkMode: boolean;
  sidebarOpen: boolean;
  subscriptionModalOpen: boolean;
  subscriptionModalContext: { pdfId?: string; quizId?: string; message?: string } | null;

  toggleDarkMode: () => void;
  setSidebarOpen: (open: boolean) => void;
  openSubscriptionModal: (context?: UIState['subscriptionModalContext']) => void;
  closeSubscriptionModal: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  isDarkMode: false,
  sidebarOpen: true,
  subscriptionModalOpen: false,
  subscriptionModalContext: null,

  toggleDarkMode: () => set((s) => {
    const next = !s.isDarkMode;
    document.documentElement.classList.toggle('dark', next);
    return { isDarkMode: next };
  }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  openSubscriptionModal: (context = null) => set({ subscriptionModalOpen: true, subscriptionModalContext: context }),
  closeSubscriptionModal: () => set({ subscriptionModalOpen: false, subscriptionModalContext: null }),
}));
