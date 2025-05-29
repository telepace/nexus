import { create } from 'zustand';
import type { AppState, User, PageInfo } from '../lib/types';

interface ExtensionStore extends AppState {
  // Actions
  setUser: (user: User | null) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setCurrentPage: (page: PageInfo | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState: AppState = {
  isAuthenticated: false,
  user: null,
  currentPage: null,
  isLoading: false,
  error: null,
};

export const useExtensionStore = create<ExtensionStore>((set) => ({
  ...initialState,
  
  setUser: (user) => set({ user }),
  
  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  
  setCurrentPage: (currentPage) => set({ currentPage }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),
  
  reset: () => set(initialState),
})); 