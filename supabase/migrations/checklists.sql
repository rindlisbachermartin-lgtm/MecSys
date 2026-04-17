-- ============================================================
-- CHECKLISTS DE REVISIÓN
-- ============================================================

CREATE TABLE IF NOT EXISTS checklists (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  turno_id         uuid REFERENCES turnos(id) ON DELETE SET NULL,
  vehiculo_id      uuid REFERENCES vehiculos(id) ON DELETE SET NULL,
  cliente_id       uuid REFERENCES clientes(id) ON DELETE SET NULL,
  fecha            date NOT NULL DEFAULT CURRENT_DATE,
  kilometraje      integer,
  notas            text,
  alertas_atencion integer DEFAULT 0,
  alertas_critico  integer DEFAULT 0,
  created_at       timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
  categoria    text NOT NULL,
  item         text NOT NULL,
  estado       text NOT NULL DEFAULT 'ok' CHECK (estado IN ('ok','atencion','critico','na')),
  observacion  text
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_checklists_user_id     ON checklists(user_id);
CREATE INDEX IF NOT EXISTS idx_checklists_vehiculo_id ON checklists(vehiculo_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_cl_id  ON checklist_items(checklist_id);

-- RLS
ALTER TABLE checklists      ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS checklists_select ON checklists;
DROP POLICY IF EXISTS checklists_insert ON checklists;
DROP POLICY IF EXISTS checklists_update ON checklists;
DROP POLICY IF EXISTS checklists_delete ON checklists;
CREATE POLICY checklists_select ON checklists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY checklists_insert ON checklists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY checklists_update ON checklists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY checklists_delete ON checklists FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS checklist_items_select ON checklist_items;
DROP POLICY IF EXISTS checklist_items_insert ON checklist_items;
DROP POLICY IF EXISTS checklist_items_update ON checklist_items;
DROP POLICY IF EXISTS checklist_items_delete ON checklist_items;
CREATE POLICY checklist_items_select ON checklist_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM checklists c WHERE c.id = checklist_id AND c.user_id = auth.uid()));
CREATE POLICY checklist_items_insert ON checklist_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM checklists c WHERE c.id = checklist_id AND c.user_id = auth.uid()));
CREATE POLICY checklist_items_update ON checklist_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM checklists c WHERE c.id = checklist_id AND c.user_id = auth.uid()));
CREATE POLICY checklist_items_delete ON checklist_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM checklists c WHERE c.id = checklist_id AND c.user_id = auth.uid()));
