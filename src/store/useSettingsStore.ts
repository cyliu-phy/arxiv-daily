import { create } from "zustand";
import { getSubscriptions, getSettings, type AppSettings } from "@/lib/tauri";

interface SettingsState {
  subscriptions: string[];
  settings: AppSettings;
  loaded: boolean;
  setSubscriptions: (cats: string[]) => void;
  setSettings: (s: AppSettings) => void;
  load: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  subscriptions: [],
  settings: {
    llm_endpoint: "",
    llm_api_key: "",
    llm_model: "gpt-4o-mini",
    theme: "system",
  },
  loaded: false,

  setSubscriptions: (subscriptions) => set({ subscriptions }),
  setSettings: (settings) => set({ settings }),

  load: async () => {
    const [subscriptions, settings] = await Promise.all([
      getSubscriptions(),
      getSettings(),
    ]);
    set({ subscriptions, settings, loaded: true });
  },
}));
