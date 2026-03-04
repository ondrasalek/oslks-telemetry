import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface Consent {
    essential: boolean; // Vždy true
    analytics: boolean; // Volitelné
}

interface CookieState {
    hasInteracted: boolean;
    consent: Consent;

    // Actions
    acceptAll: () => void;
    rejectAll: () => void;
    setConsent: (partialConsent: Partial<Consent>) => void;
    saveSettings: () => void;
}

export const useCookieStore = create<CookieState>()(
    persist(
        (set) => ({
            hasInteracted: false,
            consent: {
                essential: true,
                analytics: false,
            },

            acceptAll: () =>
                set({
                    hasInteracted: true,
                    consent: {
                        essential: true,
                        analytics: true,
                    },
                }),

            rejectAll: () =>
                set({
                    hasInteracted: true,
                    consent: {
                        essential: true,
                        analytics: false,
                    },
                }),

            setConsent: (partialConsent) =>
                set((state) => ({
                    consent: { ...state.consent, ...partialConsent },
                })),

            saveSettings: () =>
                set({
                    hasInteracted: true,
                }),
        }),
        {
            name: 'cookie-consent-storage',
            storage: createJSONStorage(() => localStorage),
            skipHydration: true,
        },
    ),
);
