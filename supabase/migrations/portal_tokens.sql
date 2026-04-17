-- ============================================================
-- PORTAL TOKENS — acceso público de clientes
-- ============================================================

CREATE TABLE IF NOT EXISTS portal_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES clientes(id) ON DELETE CASCADE,
  token      text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portal_tokens_token     ON portal_tokens(token);
CREATE INDEX IF NOT EXISTS idx_portal_tokens_cliente_id ON portal_tokens(cliente_id);

-- RLS: el dueño del taller gestiona sus tokens
ALTER TABLE portal_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS portal_tokens_select ON portal_tokens;
DROP POLICY IF EXISTS portal_tokens_insert ON portal_tokens;
DROP POLICY IF EXISTS portal_tokens_delete ON portal_tokens;
CREATE POLICY portal_tokens_select ON portal_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY portal_tokens_insert ON portal_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY portal_tokens_delete ON portal_tokens FOR DELETE USING (auth.uid() = user_id);

-- Función pública para leer datos por token (sin autenticación)
CREATE OR REPLACE FUNCTION get_portal_data(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cliente_id uuid;
  v_result json;
BEGIN
  SELECT cliente_id INTO v_cliente_id
  FROM portal_tokens WHERE token = p_token;

  IF v_cliente_id IS NULL THEN
    RETURN json_build_object('error', 'Token inválido');
  END IF;

  SELECT json_build_object(
    'cliente', (SELECT row_to_json(c) FROM clientes c WHERE c.id = v_cliente_id),
    'vehiculos', (SELECT json_agg(v) FROM vehiculos v WHERE v.cliente_id = v_cliente_id),
    'turnos', (
      SELECT json_agg(t ORDER BY t.fecha_hora DESC)
      FROM turnos t WHERE t.cliente_id = v_cliente_id
    ),
    'presupuestos', (
      SELECT json_agg(p ORDER BY p.created_at DESC)
      FROM presupuestos p WHERE p.cliente_id = v_cliente_id
    ),
    'facturas', (
      SELECT json_agg(f ORDER BY f.created_at DESC)
      FROM facturas f WHERE f.cliente_id = v_cliente_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;
