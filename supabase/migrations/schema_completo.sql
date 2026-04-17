-- ============================================================
-- MecSys — Schema completo
-- ============================================================

-- ============================================================
-- TABLAS
-- ============================================================

ALTER TABLE clientes  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE vehiculos ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE repuestos ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS presupuesto_items (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    presupuesto_id  uuid REFERENCES presupuestos(id) ON DELETE CASCADE NOT NULL,
    repuesto_id     uuid REFERENCES repuestos(id) ON DELETE SET NULL,
    descripcion     text NOT NULL,
    cantidad        numeric(10,3) NOT NULL DEFAULT 1,
    precio_unitario numeric(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS turno_repuestos (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    turno_id    uuid REFERENCES turnos(id) ON DELETE CASCADE NOT NULL,
    repuesto_id uuid REFERENCES repuestos(id) ON DELETE SET NULL,
    cantidad    numeric(10,3) NOT NULL DEFAULT 1,
    precio      numeric(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS facturas (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_factura text,
    tipo           char(1) NOT NULL DEFAULT 'B' CHECK (tipo IN ('A','B','C','X')),
    cliente_id     uuid REFERENCES clientes(id)  ON DELETE SET NULL,
    vehiculo_id    uuid REFERENCES vehiculos(id) ON DELETE SET NULL,
    mano_de_obra   numeric(12,2) NOT NULL DEFAULT 0,
    incluye_iva    boolean NOT NULL DEFAULT false,
    estado         text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','pagada','anulada')),
    validez_dias   integer NOT NULL DEFAULT 30,
    notas          text,
    presupuesto_id uuid REFERENCES presupuestos(id) ON DELETE SET NULL,
    user_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at     timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS factura_items (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    factura_id      uuid REFERENCES facturas(id)  ON DELETE CASCADE NOT NULL,
    repuesto_id     uuid REFERENCES repuestos(id) ON DELETE SET NULL,
    descripcion     text NOT NULL,
    cantidad        numeric(10,3) NOT NULL DEFAULT 1,
    precio_unitario numeric(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS historial_vehiculo (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vehiculo_id uuid REFERENCES vehiculos(id) ON DELETE CASCADE NOT NULL,
    fecha       date NOT NULL DEFAULT CURRENT_DATE,
    tipo        text NOT NULL DEFAULT 'servicio' CHECK (tipo IN ('servicio','reparacion','revision','diagnostico','otro')),
    descripcion text NOT NULL,
    km          integer,
    costo       numeric(12,2) DEFAULT 0,
    notas       text,
    user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at  timestamptz DEFAULT now()
);

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

-- ============================================================
-- ÍNDICES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_clientes_user_id     ON clientes(user_id);
CREATE INDEX IF NOT EXISTS idx_vehiculos_user_id    ON vehiculos(user_id);
CREATE INDEX IF NOT EXISTS idx_repuestos_user_id    ON repuestos(user_id);
CREATE INDEX IF NOT EXISTS idx_turnos_user_id       ON turnos(user_id);
CREATE INDEX IF NOT EXISTS idx_presupuestos_user_id ON presupuestos(user_id);
CREATE INDEX IF NOT EXISTS idx_repcompat_repuesto   ON repuesto_compatibilidades(repuesto_id);
CREATE INDEX IF NOT EXISTS idx_repcompat_user       ON repuesto_compatibilidades(user_id);
CREATE INDEX IF NOT EXISTS idx_historial_vehiculo   ON historial_vehiculo(vehiculo_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE clientes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehiculos                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE repuestos                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnos                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuestos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE presupuesto_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE turno_repuestos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE factura_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_vehiculo        ENABLE ROW LEVEL SECURITY;
ALTER TABLE repuesto_compatibilidades ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLÍTICAS RLS
-- ============================================================

-- clientes
DROP POLICY IF EXISTS clientes_select ON clientes;
DROP POLICY IF EXISTS clientes_insert ON clientes;
DROP POLICY IF EXISTS clientes_update ON clientes;
DROP POLICY IF EXISTS clientes_delete ON clientes;
CREATE POLICY clientes_select ON clientes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY clientes_insert ON clientes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY clientes_update ON clientes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY clientes_delete ON clientes FOR DELETE USING (auth.uid() = user_id);

-- vehiculos
DROP POLICY IF EXISTS vehiculos_select ON vehiculos;
DROP POLICY IF EXISTS vehiculos_insert ON vehiculos;
DROP POLICY IF EXISTS vehiculos_update ON vehiculos;
DROP POLICY IF EXISTS vehiculos_delete ON vehiculos;
CREATE POLICY vehiculos_select ON vehiculos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY vehiculos_insert ON vehiculos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY vehiculos_update ON vehiculos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY vehiculos_delete ON vehiculos FOR DELETE USING (auth.uid() = user_id);

-- repuestos
DROP POLICY IF EXISTS repuestos_select ON repuestos;
DROP POLICY IF EXISTS repuestos_insert ON repuestos;
DROP POLICY IF EXISTS repuestos_update ON repuestos;
DROP POLICY IF EXISTS repuestos_delete ON repuestos;
CREATE POLICY repuestos_select ON repuestos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY repuestos_insert ON repuestos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY repuestos_update ON repuestos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY repuestos_delete ON repuestos FOR DELETE USING (auth.uid() = user_id);

-- turnos
DROP POLICY IF EXISTS turnos_select ON turnos;
DROP POLICY IF EXISTS turnos_insert ON turnos;
DROP POLICY IF EXISTS turnos_update ON turnos;
DROP POLICY IF EXISTS turnos_delete ON turnos;
CREATE POLICY turnos_select ON turnos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY turnos_insert ON turnos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY turnos_update ON turnos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY turnos_delete ON turnos FOR DELETE USING (auth.uid() = user_id);

-- presupuestos
DROP POLICY IF EXISTS presupuestos_select ON presupuestos;
DROP POLICY IF EXISTS presupuestos_insert ON presupuestos;
DROP POLICY IF EXISTS presupuestos_update ON presupuestos;
DROP POLICY IF EXISTS presupuestos_delete ON presupuestos;
CREATE POLICY presupuestos_select ON presupuestos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY presupuestos_insert ON presupuestos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY presupuestos_update ON presupuestos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY presupuestos_delete ON presupuestos FOR DELETE USING (auth.uid() = user_id);

-- presupuesto_items (delegado al user_id del presupuesto padre)
DROP POLICY IF EXISTS presupuesto_items_select ON presupuesto_items;
DROP POLICY IF EXISTS presupuesto_items_insert ON presupuesto_items;
DROP POLICY IF EXISTS presupuesto_items_update ON presupuesto_items;
DROP POLICY IF EXISTS presupuesto_items_delete ON presupuesto_items;
CREATE POLICY presupuesto_items_select ON presupuesto_items FOR SELECT USING (EXISTS (SELECT 1 FROM presupuestos p WHERE p.id = presupuesto_id AND p.user_id = auth.uid()));
CREATE POLICY presupuesto_items_insert ON presupuesto_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM presupuestos p WHERE p.id = presupuesto_id AND p.user_id = auth.uid()));
CREATE POLICY presupuesto_items_update ON presupuesto_items FOR UPDATE USING (EXISTS (SELECT 1 FROM presupuestos p WHERE p.id = presupuesto_id AND p.user_id = auth.uid()));
CREATE POLICY presupuesto_items_delete ON presupuesto_items FOR DELETE USING (EXISTS (SELECT 1 FROM presupuestos p WHERE p.id = presupuesto_id AND p.user_id = auth.uid()));

-- turno_repuestos (delegado al user_id del turno padre)
DROP POLICY IF EXISTS turno_repuestos_select ON turno_repuestos;
DROP POLICY IF EXISTS turno_repuestos_insert ON turno_repuestos;
DROP POLICY IF EXISTS turno_repuestos_update ON turno_repuestos;
DROP POLICY IF EXISTS turno_repuestos_delete ON turno_repuestos;
CREATE POLICY turno_repuestos_select ON turno_repuestos FOR SELECT USING (EXISTS (SELECT 1 FROM turnos t WHERE t.id = turno_id AND t.user_id = auth.uid()));
CREATE POLICY turno_repuestos_insert ON turno_repuestos FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM turnos t WHERE t.id = turno_id AND t.user_id = auth.uid()));
CREATE POLICY turno_repuestos_update ON turno_repuestos FOR UPDATE USING (EXISTS (SELECT 1 FROM turnos t WHERE t.id = turno_id AND t.user_id = auth.uid()));
CREATE POLICY turno_repuestos_delete ON turno_repuestos FOR DELETE USING (EXISTS (SELECT 1 FROM turnos t WHERE t.id = turno_id AND t.user_id = auth.uid()));

-- facturas
DROP POLICY IF EXISTS "Users manage own facturas" ON facturas;
DROP POLICY IF EXISTS facturas_all ON facturas;
CREATE POLICY facturas_all ON facturas FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- factura_items (delegado al user_id de la factura padre)
DROP POLICY IF EXISTS "Users manage own factura_items" ON factura_items;
DROP POLICY IF EXISTS factura_items_all ON factura_items;
CREATE POLICY factura_items_all ON factura_items FOR ALL USING (EXISTS (SELECT 1 FROM facturas f WHERE f.id = factura_id AND f.user_id = auth.uid()));

-- historial_vehiculo
DROP POLICY IF EXISTS "Users manage own historial" ON historial_vehiculo;
DROP POLICY IF EXISTS historial_all ON historial_vehiculo;
CREATE POLICY historial_all ON historial_vehiculo FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- repuesto_compatibilidades
DROP POLICY IF EXISTS repcompat_select ON repuesto_compatibilidades;
DROP POLICY IF EXISTS repcompat_insert ON repuesto_compatibilidades;
DROP POLICY IF EXISTS repcompat_update ON repuesto_compatibilidades;
DROP POLICY IF EXISTS repcompat_delete ON repuesto_compatibilidades;
CREATE POLICY repcompat_select ON repuesto_compatibilidades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY repcompat_insert ON repuesto_compatibilidades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY repcompat_update ON repuesto_compatibilidades FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY repcompat_delete ON repuesto_compatibilidades FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- VISTAS
-- ============================================================

DROP VIEW IF EXISTS v_presupuestos_totales;
CREATE VIEW v_presupuestos_totales WITH (security_invoker = true) AS
SELECT
    p.id, p.user_id, p.created_at, p.estado, p.mano_de_obra,
    p.incluye_iva, p.validez_dias, p.notas, p.cliente_id, p.vehiculo_id,
    CONCAT_WS(', ', c.apellido, c.nombre) AS cliente_nombre,
    v.patente,
    CONCAT_WS(' ', v.marca, v.modelo, v.anio::text) AS vehiculo,
    COALESCE(SUM(pi.cantidad * pi.precio_unitario), 0) AS total_repuestos,
    CASE WHEN p.incluye_iva
        THEN ROUND((COALESCE(SUM(pi.cantidad * pi.precio_unitario), 0) + p.mano_de_obra) * 1.21, 2)
        ELSE COALESCE(SUM(pi.cantidad * pi.precio_unitario), 0) + p.mano_de_obra
    END AS total_general
FROM presupuestos p
LEFT JOIN clientes          c  ON c.id = p.cliente_id
LEFT JOIN vehiculos         v  ON v.id = p.vehiculo_id
LEFT JOIN presupuesto_items pi ON pi.presupuesto_id = p.id
GROUP BY p.id, c.apellido, c.nombre, v.patente, v.marca, v.modelo, v.anio;

DROP VIEW IF EXISTS v_facturas_totales;
CREATE VIEW v_facturas_totales WITH (security_invoker = true) AS
SELECT
    f.*,
    CONCAT_WS(', ', c.apellido, c.nombre) AS cliente_nombre,
    v.patente,
    CONCAT_WS(' ', v.marca, v.modelo) AS vehiculo,
    COALESCE(SUM(fi.cantidad * fi.precio_unitario), 0) AS total_repuestos,
    CASE WHEN f.incluye_iva
        THEN ROUND((COALESCE(SUM(fi.cantidad * fi.precio_unitario), 0) + f.mano_de_obra) * 1.21, 2)
        ELSE COALESCE(SUM(fi.cantidad * fi.precio_unitario), 0) + f.mano_de_obra
    END AS total_general
FROM facturas f
LEFT JOIN clientes      c  ON c.id = f.cliente_id
LEFT JOIN vehiculos     v  ON v.id = f.vehiculo_id
LEFT JOIN factura_items fi ON fi.factura_id = f.id
GROUP BY f.id, c.apellido, c.nombre, v.patente, v.marca, v.modelo;

-- ============================================================
-- MIGRAR compatibilidades existentes (solo si no se hizo antes)
-- ============================================================

INSERT INTO repuesto_compatibilidades (repuesto_id, user_id, marca, modelo, anio_desde, anio_hasta, combustible)
SELECT id, user_id,
    NULLIF(TRIM(marca_compatible), ''),
    NULLIF(TRIM(modelo_compatible), ''),
    anio_desde, anio_hasta,
    COALESCE(NULLIF(combustible, ''), 'cualquiera')
FROM repuestos
WHERE (marca_compatible IS NOT NULL OR modelo_compatible IS NOT NULL)
  AND id NOT IN (SELECT repuesto_id FROM repuesto_compatibilidades);
