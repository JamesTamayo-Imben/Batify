// AdSense ad-unit IDs (create display units in AdSense, put the IDs in .env.local).
export const SLOTS = {
  home: import.meta.env.VITE_ADSENSE_SLOT_HOME || '',
  create: import.meta.env.VITE_ADSENSE_SLOT_CREATE || '',
  public: import.meta.env.VITE_ADSENSE_SLOT_PUBLIC || '',
}
