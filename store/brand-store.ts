import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { BrandProfile } from '@/types/brand';

interface BrandState {
    profile: Partial<BrandProfile>;
    currentStep: number;

    // Actions
    updateProfile: (data: Partial<BrandProfile>) => void;
    setStep: (step: number) => void;
    reset: () => void;
}

const sanitizeLogoUrl = (logoUrl: unknown): string | undefined => {
    if (typeof logoUrl !== 'string') return undefined;
    return logoUrl.startsWith('blob:') ? '' : logoUrl;
};

export const useBrandStore = create<BrandState>()(
    persist(
        (set) => ({
            profile: {
                colors: { primaryText: '#1e293b', text: '#334155', background: '#ffffff' }, // Defaults
            },
            currentStep: 1,

            updateProfile: (data) =>
                set((state) => {
                    const sanitized = { ...data };
                    if (Object.prototype.hasOwnProperty.call(data, 'logo_url')) {
                        const safeLogoUrl = sanitizeLogoUrl(data.logo_url);
                        if (safeLogoUrl !== undefined) {
                            sanitized.logo_url = safeLogoUrl;
                        }
                    }

                    return {
                        profile: { ...state.profile, ...sanitized },
                    };
                }),

            setStep: (step) => set({ currentStep: step }),

            reset: () => set({ currentStep: 1, profile: {} }),
        }),
        {
            name: 'brand-storage', // name of the item in the storage (must be unique)
            storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
            version: 1,
            migrate: (persistedState) => {
                const state = persistedState as {
                    state?: { profile?: Partial<BrandProfile> };
                };

                const currentLogoUrl = state?.state?.profile?.logo_url;
                if (typeof currentLogoUrl === 'string' && currentLogoUrl.startsWith('blob:')) {
                    return {
                        ...state,
                        state: {
                            ...state.state,
                            profile: {
                                ...state.state?.profile,
                                logo_url: '',
                            },
                        },
                    };
                }

                return state;
            },
        }
    )
);
