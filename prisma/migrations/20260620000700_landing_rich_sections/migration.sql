-- Phase 4 — richer landing-page sections (gallery / comparison / guarantee).
ALTER TYPE "SectionType" ADD VALUE IF NOT EXISTS 'GALLERY';
ALTER TYPE "SectionType" ADD VALUE IF NOT EXISTS 'COMPARISON';
ALTER TYPE "SectionType" ADD VALUE IF NOT EXISTS 'GUARANTEE';
