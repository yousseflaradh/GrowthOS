-- Phase 8 — Knowledge Base & RAG.

-- ── enums ────────────────────────────────────────────────────
CREATE TYPE "KnowledgeSourceType" AS ENUM ('PRODUCT', 'REVIEWS', 'COMPETITOR');
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- ── documents ────────────────────────────────────────────────
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "source_type" "KnowledgeSourceType" NOT NULL,
    "source_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "chunk_count" INTEGER NOT NULL DEFAULT 0,
    "model" TEXT,
    "error" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "documents_project_source_key" ON "documents"("project_id", "source_type", "source_id");
CREATE INDEX "documents_org_project_idx" ON "documents"("organization_id", "project_id");

-- ── chunks ───────────────────────────────────────────────────
CREATE TABLE "chunks" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "token_count" INTEGER,
    "vector_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chunks_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "chunks_vector_id_key" ON "chunks"("vector_id");
CREATE INDEX "chunks_org_document_idx" ON "chunks"("organization_id", "document_id");

-- ── embedding_metadata ───────────────────────────────────────
CREATE TABLE "embedding_metadata" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "chunk_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "dimensions" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "embedding_metadata_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "embedding_metadata_chunk_id_key" ON "embedding_metadata"("chunk_id");
CREATE INDEX "embedding_metadata_org_idx" ON "embedding_metadata"("organization_id");

-- ── foreign keys ─────────────────────────────────────────────
ALTER TABLE "documents" ADD CONSTRAINT "documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "embedding_metadata" ADD CONSTRAINT "embedding_metadata_chunk_id_fkey" FOREIGN KEY ("chunk_id") REFERENCES "chunks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── row-level security ───────────────────────────────────────
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documents" FORCE ROW LEVEL SECURITY;
CREATE POLICY "documents_tenant_isolation" ON "documents"
  USING ("organization_id" = current_setting('app.org_id', true))
  WITH CHECK ("organization_id" = current_setting('app.org_id', true));

ALTER TABLE "chunks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chunks" FORCE ROW LEVEL SECURITY;
CREATE POLICY "chunks_tenant_isolation" ON "chunks"
  USING ("organization_id" = current_setting('app.org_id', true))
  WITH CHECK ("organization_id" = current_setting('app.org_id', true));

ALTER TABLE "embedding_metadata" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "embedding_metadata" FORCE ROW LEVEL SECURITY;
CREATE POLICY "embedding_metadata_tenant_isolation" ON "embedding_metadata"
  USING ("organization_id" = current_setting('app.org_id', true))
  WITH CHECK ("organization_id" = current_setting('app.org_id', true));
