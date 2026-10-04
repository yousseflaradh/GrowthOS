export const CREATIVE_STATUSES = ["PENDING", "PROCESSING", "COMPLETED", "FAILED"] as const;
export type CreativeStatus = (typeof CREATIVE_STATUSES)[number];
