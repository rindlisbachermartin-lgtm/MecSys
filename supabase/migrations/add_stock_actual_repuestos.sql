-- Agrega la columna stock_actual a la tabla repuestos
-- Esta columna almacena la cantidad disponible en inventario
ALTER TABLE repuestos ADD COLUMN IF NOT EXISTS stock_actual numeric;
