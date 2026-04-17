-- ============================================================
-- MecSys — Migración Multi-Tenant
-- Ejecutar en Supabase SQL Editor
-- ============================================================


-- ============================================================
-- 1. AGREGAR user_id A TABLAS QUE NO LO TIENEN
-- ============================================================

ALTER TABLE clientes
    ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE vehiculos
    ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE repuestos
    ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- (turnos y presupuestos ya tienen user_id)


-- ============================================================
-- 2. ÍNDICES DE PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_clientes_user_id     ON clientes(user_id);
CREATE INDEX IF NOT EXISTS idx_vehiculos_user_id    ON vehiculos(user_id);
CREATE INDEX IF NOT EXISTS idx_repuestos_user_id    ON repuestos(user_id);
CREATE INDEX IF NOT EXISTS idx_turnos_user_id       ON turnos(user_id);
CREATE INDEX IF NOT EXISTS idx_presupuestos_user_id ON presupuestos(user_id);


-- ============================================================
-- 3. ACTIVAR ROW LEVEL SECURITY EN TODAS LAS TABLAS
-- ============================================================

ALTER TABLE clientes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehiculos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE repuestos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuesto_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE turno_repuestos   ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 4. POLÍTICAS RLS: clientes
-- ============================================================

DROP POLICY IF EXISTS clientes_select ON clientes;
DROP POLICY IF EXISTS clientes_insert ON clientes;
DROP POLICY IF EXISTS clientes_update ON clientes;
DROP POLICY IF EXISTS clientes_delete ON clientes;

CREATE POLICY clientes_select ON clientes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY clientes_insert ON clientes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY clientes_update ON clientes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY clientes_delete ON clientes
    FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- 5. POLÍTICAS RLS: vehiculos
-- ============================================================

DROP POLICY IF EXISTS vehiculos_select ON vehiculos;
DROP POLICY IF EXISTS vehiculos_insert ON vehiculos;
DROP POLICY IF EXISTS vehiculos_update ON vehiculos;
DROP POLICY IF EXISTS vehiculos_delete ON vehiculos;

CREATE POLICY vehiculos_select ON vehiculos
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY vehiculos_insert ON vehiculos
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY vehiculos_update ON vehiculos
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY vehiculos_delete ON vehiculos
    FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- 6. POLÍTICAS RLS: repuestos
-- ============================================================

DROP POLICY IF EXISTS repuestos_select ON repuestos;
DROP POLICY IF EXISTS repuestos_insert ON repuestos;
DROP POLICY IF EXISTS repuestos_update ON repuestos;
DROP POLICY IF EXISTS repuestos_delete ON repuestos;

CREATE POLICY repuestos_select ON repuestos
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY repuestos_insert ON repuestos
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY repuestos_update ON repuestos
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY repuestos_delete ON repuestos
    FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- 7. POLÍTICAS RLS: turnos
-- ============================================================

DROP POLICY IF EXISTS turnos_select ON turnos;
DROP POLICY IF EXISTS turnos_insert ON turnos;
DROP POLICY IF EXISTS turnos_update ON turnos;
DROP POLICY IF EXISTS turnos_delete ON turnos;

CREATE POLICY turnos_select ON turnos
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY turnos_insert ON turnos
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY turnos_update ON turnos
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY turnos_delete ON turnos
    FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- 8. POLÍTICAS RLS: presupuestos
-- ============================================================

DROP POLICY IF EXISTS presupuestos_select ON presupuestos;
DROP POLICY IF EXISTS presupuestos_insert ON presupuestos;
DROP POLICY IF EXISTS presupuestos_update ON presupuestos;
DROP POLICY IF EXISTS presupuestos_delete ON presupuestos;

CREATE POLICY presupuestos_select ON presupuestos
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY presupuestos_insert ON presupuestos
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY presupuestos_update ON presupuestos
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY presupuestos_delete ON presupuestos
    FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
-- 9. POLÍTICAS RLS: presupuesto_items
--    (acceso delegado: el ítem pertenece al usuario dueño del presupuesto)
-- ============================================================

DROP POLICY IF EXISTS presupuesto_items_select ON presupuesto_items;
DROP POLICY IF EXISTS presupuesto_items_insert ON presupuesto_items;
DROP POLICY IF EXISTS presupuesto_items_update ON presupuesto_items;
DROP POLICY IF EXISTS presupuesto_items_delete ON presupuesto_items;

CREATE POLICY presupuesto_items_select ON presupuesto_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM presupuestos p
            WHERE p.id = presupuesto_id AND p.user_id = auth.uid()
        )
    );

CREATE POLICY presupuesto_items_insert ON presupuesto_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM presupuestos p
            WHERE p.id = presupuesto_id AND p.user_id = auth.uid()
        )
    );

CREATE POLICY presupuesto_items_update ON presupuesto_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM presupuestos p
            WHERE p.id = presupuesto_id AND p.user_id = auth.uid()
        )
    );

CREATE POLICY presupuesto_items_delete ON presupuesto_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM presupuestos p
            WHERE p.id = presupuesto_id AND p.user_id = auth.uid()
        )
    );


-- ============================================================
-- 10. POLÍTICAS RLS: turno_repuestos
--     (acceso delegado: el ítem pertenece al usuario dueño del turno)
-- ============================================================

DROP POLICY IF EXISTS turno_repuestos_select ON turno_repuestos;
DROP POLICY IF EXISTS turno_repuestos_insert ON turno_repuestos;
DROP POLICY IF EXISTS turno_repuestos_update ON turno_repuestos;
DROP POLICY IF EXISTS turno_repuestos_delete ON turno_repuestos;

CREATE POLICY turno_repuestos_select ON turno_repuestos
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM turnos t
            WHERE t.id = turno_id AND t.user_id = auth.uid()
        )
    );

CREATE POLICY turno_repuestos_insert ON turno_repuestos
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM turnos t
            WHERE t.id = turno_id AND t.user_id = auth.uid()
        )
    );

CREATE POLICY turno_repuestos_update ON turno_repuestos
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM turnos t
            WHERE t.id = turno_id AND t.user_id = auth.uid()
        )
    );

CREATE POLICY turno_repuestos_delete ON turno_repuestos
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM turnos t
            WHERE t.id = turno_id AND t.user_id = auth.uid()
        )
    );


-- ============================================================
-- 11. RECREAR VISTA v_presupuestos_totales CON user_id
--     La vista necesita exponer user_id para que el filtro JS funcione.
--     Adaptar el SELECT interno según la estructura real de tu tabla.
-- ============================================================

DROP VIEW IF EXISTS v_presupuestos_totales;

CREATE VIEW v_presupuestos_totales
WITH (security_invoker = true)   -- hereda RLS del usuario que llama
AS
SELECT
    p.id,
    p.user_id,
    p.created_at,
    p.estado,
    p.mano_de_obra,
    p.incluye_iva,
    p.validez_dias,
    p.notas,
    p.cliente_id,
    p.vehiculo_id,
    CONCAT_WS(', ', c.apellido, c.nombre)  AS cliente_nombre,
    v.patente,
    CONCAT_WS(' ', v.marca, v.modelo, v.anio::text) AS vehiculo,
    COALESCE(SUM(pi.cantidad * pi.precio_unitario), 0) AS total_repuestos,
    CASE
        WHEN p.incluye_iva
        THEN ROUND((COALESCE(SUM(pi.cantidad * pi.precio_unitario), 0) + p.mano_de_obra) * 1.21, 2)
        ELSE COALESCE(SUM(pi.cantidad * pi.precio_unitario), 0) + p.mano_de_obra
    END AS total_general
FROM presupuestos p
LEFT JOIN clientes          c  ON c.id  = p.cliente_id
LEFT JOIN vehiculos         v  ON v.id  = p.vehiculo_id
LEFT JOIN presupuesto_items pi ON pi.presupuesto_id = p.id
GROUP BY p.id, c.apellido, c.nombre, v.patente, v.marca, v.modelo, v.anio;


-- ============================================================
-- NOTA: Si la vista falla por diferencias en columnas, usar
-- la definición original y sólo agregar `WITH (security_invoker = true)`.
-- ============================================================
