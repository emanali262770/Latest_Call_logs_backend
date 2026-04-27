ALTER TABLE estimations
  ADD COLUMN tax_mode ENUM('withoutTax', 'withTax') NOT NULL DEFAULT 'withoutTax'
  AFTER service_id;
