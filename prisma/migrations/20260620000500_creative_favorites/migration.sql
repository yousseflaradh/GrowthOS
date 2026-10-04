-- Favorite flag for curating creative items.
ALTER TABLE "angles" ADD COLUMN "favorite" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "hooks" ADD COLUMN "favorite" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ugc_concepts" ADD COLUMN "favorite" BOOLEAN NOT NULL DEFAULT false;
