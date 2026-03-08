-- ============================================
-- Migration: Project Sections (Estancias)
-- Allows organizing products within a project by rooms/spaces
-- ============================================

-- 1. Table: project_sections
CREATE TABLE IF NOT EXISTS project_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_sections_project ON project_sections(project_id);

-- RLS
ALTER TABLE project_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own project sections"
    ON project_sections FOR ALL
    USING (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    )
    WITH CHECK (
        project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
    );

-- 2. Add section_id and position to project_products
ALTER TABLE project_products
    ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES project_sections(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS position INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_project_products_section ON project_products(section_id);
