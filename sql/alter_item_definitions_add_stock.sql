ALTER TABLE item_definitions
  ADD COLUMN IF NOT EXISTS stock DECIMAL(12, 2) NOT NULL DEFAULT 0 AFTER unit_qty,
  ADD COLUMN IF NOT EXISTS item_specification TEXT NULL AFTER location_id;
