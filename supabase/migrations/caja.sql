-- ============================================================
-- CAJA DIARIA + GASTOS DEL TALLER
-- ============================================================

CREATE TABLE IF NOT EXISTS caja_movimientos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha         date NOT NULL DEFAULT CURRENT_DATE,
  tipo          text NOT NULL CHECK (tipo IN ('ingreso','egreso')),
  categoria     text NOT NULL DEFAULT 'Otros',
  descripcion   text,
  monto         numeric NOT NULL CHECK (monto > 0),
  medio_pago    text NOT NULL DEFAULT 'efectivo'
                CHECK (medio_pago IN ('efectivo','transferencia','debito','credito','otro')),
  referencia_id uuid,
  created_at    timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_caja_user_id ON caja_movimientos(user_id);
CREATE INDEX IF NOT EXISTS idx_caja_fecha   ON caja_movimientos(fecha);

-- RLS
ALTER TABLE caja_movimientos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS caja_select ON caja_movimientos;
DROP POLICY IF EXISTS caja_insert ON caja_movimientos;
DROP POLICY IF EXISTS caja_update ON caja_movimientos;
DROP POLICY IF EXISTS caja_delete ON caja_movimientos;
CREATE POLICY caja_select ON caja_movimientos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY caja_insert ON caja_movimientos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY caja_update ON caja_movimientos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY caja_delete ON caja_movimientos FOR DELETE USING (auth.uid() = user_id);
