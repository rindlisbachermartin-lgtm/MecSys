-- ============================================================
-- MECSYS — Migración: Facturación + Historial de vehículo
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. HISTORIAL DE VEHÍCULO
-- ============================================================

CREATE TABLE IF NOT EXISTS historial_vehiculo (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vehiculo_id UUID REFERENCES vehiculos(id) ON DELETE CASCADE NOT NULL,
    fecha       DATE NOT NULL DEFAULT CURRENT_DATE,
    tipo        TEXT NOT NULL DEFAULT 'servicio'
                    CHECK (tipo IN ('servicio', 'reparacion', 'revision', 'diagnostico', 'otro')),
    descripcion TEXT NOT NULL,
    km          INTEGER,
    costo       NUMERIC(12,2) DEFAULT 0,
    notas       TEXT,
    user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE historial_vehiculo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own historial"
    ON historial_vehiculo FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_historial_vehiculo_id ON historial_vehiculo(vehiculo_id);
CREATE INDEX IF NOT EXISTS idx_historial_fecha       ON historial_vehiculo(fecha DESC);


-- ============================================================
-- 2. FACTURAS
-- ============================================================

CREATE TABLE IF NOT EXISTS facturas (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    numero_factura  TEXT,
    tipo            CHAR(1) NOT NULL DEFAULT 'B' CHECK (tipo IN ('A','B','C','X')),
    cliente_id      UUID REFERENCES clientes(id)  ON DELETE SET NULL,
    vehiculo_id     UUID REFERENCES vehiculos(id) ON DELETE SET NULL,
    mano_de_obra    NUMERIC(12,2) NOT NULL DEFAULT 0,
    incluye_iva     BOOLEAN NOT NULL DEFAULT false,
    estado          TEXT NOT NULL DEFAULT 'pendiente'
                        CHECK (estado IN ('pendiente','pagada','anulada')),
    validez_dias    INTEGER NOT NULL DEFAULT 30,
    notas           TEXT,
    presupuesto_id  UUID REFERENCES presupuestos(id) ON DELETE SET NULL,
    user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own facturas"
    ON facturas FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);


-- ============================================================
-- 3. ÍTEMS DE FACTURA
-- ============================================================

CREATE TABLE IF NOT EXISTS factura_items (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    factura_id      UUID REFERENCES facturas(id)  ON DELETE CASCADE NOT NULL,
    repuesto_id     UUID REFERENCES repuestos(id) ON DELETE SET NULL,
    descripcion     TEXT NOT NULL,
    cantidad        NUMERIC(10,3) NOT NULL DEFAULT 1,
    precio_unitario NUMERIC(12,2) NOT NULL DEFAULT 0
);

ALTER TABLE factura_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own factura_items"
    ON factura_items FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM facturas f
            WHERE f.id = factura_id AND f.user_id = auth.uid()
        )
    );

CREATE INDEX IF NOT EXISTS idx_factura_items_factura ON factura_items(factura_id);


-- ============================================================
-- 4. VISTA: v_facturas_totales
-- ============================================================

CREATE OR REPLACE VIEW v_facturas_totales AS
SELECT
    f.*,
    CONCAT(c.apellido, ', ', c.nombre)             AS cliente_nombre,
    v.patente,
    CONCAT(v.marca, ' ', v.modelo)                 AS vehiculo,
    COALESCE(SUM(fi.cantidad * fi.precio_unitario), 0)                          AS total_repuestos,
    COALESCE(SUM(fi.cantidad * fi.precio_unitario), 0) + f.mano_de_obra         AS subtotal,
    CASE WHEN f.incluye_iva
        THEN (COALESCE(SUM(fi.cantidad * fi.precio_unitario), 0) + f.mano_de_obra) * 1.21
        ELSE  COALESCE(SUM(fi.cantidad * fi.precio_unitario), 0) + f.mano_de_obra
    END                                                                          AS total_general
FROM facturas f
LEFT JOIN clientes     c  ON f.cliente_id   = c.id
LEFT JOIN vehiculos    v  ON f.vehiculo_id  = v.id
LEFT JOIN factura_items fi ON f.id          = fi.factura_id
GROUP BY f.id, c.apellido, c.nombre, v.patente, v.marca, v.modelo;
