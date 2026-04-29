import { create } from 'zustand';

export type Intent = 'formal' | 'casual' | 'sports';

interface IntentState {
  selectedIntent: Intent | null;
  setIntent: (intent: Intent) => void;
  clearIntent: () => void;
}

export const useIntentStore = create<IntentState>((set) => ({
  selectedIntent: null,
  setIntent: (intent) => set({ selectedIntent: intent }),
  clearIntent: () => set({ selectedIntent: null }),
}));