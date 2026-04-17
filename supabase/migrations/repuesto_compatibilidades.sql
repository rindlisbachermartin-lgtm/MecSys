-- ============================================================
-- MecSys — Compatibilidades múltiples por repuesto
-- Ejecutar en Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS repuesto_compatibilidades (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repuesto_id uuid NOT NULL REFERENCES repuestos(id) ON DELETE CASCADE,
    user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    marca       varchar(100),
    modelo      varchar(100),
    anio_desde  integer,
    anio_hasta  integer,
    combustible varchar(50) DEFAULT 'cualquiera',
    created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_repcompat_repuesto ON repuesto_compatibilidades(repuesto_id);
CREATE INDEX IF NOT EXISTS idx_repcompat_user    ON repuesto_compatibilidades(user_id);

ALTER TABLE repuesto_compatibilidades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS repcompat_select ON repuesto_compatibilidades;
DROP POLICY IF EXISTS repcompat_insert ON repuesto_compatibilidades;
DROP POLICY IF EXISTS repcompat_update ON repuesto_compatibilidades;
DROP POLICY IF EXISTS repcompat_delete ON repuesto_compatibilidades;

CREATE POLICY repcompat_select ON repuesto_compatibilidades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY repcompat_insert ON repuesto_compatibilidades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY repcompat_update ON repuesto_compatibilidades FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY repcompat_delete ON repuesto_compatibilidades FOR DELETE USING (auth.uid() = user_id);

-- Migrar datos existentes de columnas antiguas
INSERT INTO repuesto_compatibilidades (repuesto_id, user_id, marca, modelo, anio_desde, anio_hasta, combustible)
SELECT
    id,
    user_id,
    NULLIF(TRIM(marca_compatible), ''),
    NULLIF(TRIM(modelo_compatible), ''),
    anio_desde,
    anio_hasta,
    COALESCE(NULLIF(combustible, ''), 'cualquiera')
FROM repuestos
WHERE marca_compatible IS NOT NULL OR modelo_compatible IS NOT NULL;
