// AdSense ad-unit IDs (create display units in AdSense, put the IDs in .env.local).
export const SLOTS = {
  home: import.meta.env.VITE_ADSENSE_SLOT_HOME || '0000000001',
  create: import.meta.env.VITE_ADSENSE_SLOT_CREATE || '0000000002',
  public: import.meta.env.VITE_ADSENSE_SLOT_PUBLIC || '0000000003',
}
