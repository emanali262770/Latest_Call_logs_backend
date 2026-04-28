ALTER TABLE quotations
  ADD COLUMN print_template VARCHAR(80) NOT NULL DEFAULT 'executive_letterhead' AFTER tax_mode;
