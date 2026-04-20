ALTER TABLE customers
  ADD COLUMN whatsapp_no VARCHAR(50) NULL AFTER mobile;

UPDATE customers
SET whatsapp_no = mobile
WHERE whatsapp_no IS NULL OR TRIM(whatsapp_no) = '';

ALTER TABLE customers
  MODIFY COLUMN whatsapp_no VARCHAR(50) NOT NULL;
