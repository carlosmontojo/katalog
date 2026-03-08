-- ==============================================
-- MIGRACIÓN: Biblioteca de Productos (Product Library)
-- Ejecutar en Supabase SQL Editor
-- ==============================================

-- 1. Añadir user_id a products
ALTER TABLE products ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 2. Backfill user_id desde projects
UPDATE products p
SET user_id = pr.user_id
FROM projects pr
WHERE p.project_id = pr.id
  AND p.user_id IS NULL;

-- 3. Añadir columna typology
ALTER TABLE products ADD COLUMN IF NOT EXISTS typology TEXT;

-- 4. Crear tabla junction para muchos-a-muchos
CREATE TABLE IF NOT EXISTS project_products (
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (project_id, product_id)
);

-- 5. Backfill junction table desde project_id existentes
INSERT INTO project_products (project_id, product_id)
SELECT project_id, id FROM products WHERE project_id IS NOT NULL
ON CONFLICT (project_id, product_id) DO NOTHING;

-- 6. Índices para queries de biblioteca
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_user_brand ON products(user_id, brand);
CREATE INDEX IF NOT EXISTS idx_products_user_typology ON products(user_id, typology);
CREATE INDEX IF NOT EXISTS idx_project_products_project ON project_products(project_id);
CREATE INDEX IF NOT EXISTS idx_project_products_product ON project_products(product_id);

-- 7. RLS para project_products
ALTER TABLE project_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own project_products" ON project_products
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM projects WHERE projects.id = project_products.project_id AND projects.user_id = auth.uid())
    );

CREATE POLICY "Users can insert own project_products" ON project_products
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM projects WHERE projects.id = project_products.project_id AND projects.user_id = auth.uid())
    );

CREATE POLICY "Users can delete own project_products" ON project_products
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM projects WHERE projects.id = project_products.project_id AND projects.user_id = auth.uid())
    );

-- 8. Actualizar RLS de products para incluir user_id
-- (Solo si no existe ya una policy basada en user_id)
-- Primero verificamos las policies existentes y añadimos las nuevas

-- Policy para que el usuario vea SUS productos (por user_id directo)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Users can view own products by user_id'
    ) THEN
        CREATE POLICY "Users can view own products by user_id" ON products
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
END
$$;

-- NOTA: No eliminamos las policies existentes basadas en project_id
-- para mantener backward compatibility durante la transición
