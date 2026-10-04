export const INTEL_STATUSES = ["PENDING", "PROCESSING", "COMPLETED", "FAILED"] as const;
export type IntelStatus = (typeof INTEL_STATUSES)[number];

export const AD_SOURCES = ["FACEBOOK", "INSTAGRAM", "TIKTOK", "MANUAL", "OTHER"] as const;
export type AdSource = (typeof AD_SOURCES)[number];
