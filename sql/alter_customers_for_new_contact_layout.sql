ALTER TABLE customers
  DROP COLUMN customer_code,
  DROP COLUMN customer_name,
  DROP COLUMN phone,
  DROP COLUMN address,
  DROP COLUMN opening_balance,
  DROP COLUMN ob_date;

ALTER TABLE customers
  ADD COLUMN customer_group_id INT NULL AFTER id,
  ADD COLUMN company VARCHAR(255) NULL AFTER customer_group_id,
  ADD COLUMN person VARCHAR(255) NOT NULL AFTER company,
  ADD COLUMN designation VARCHAR(255) NULL AFTER person,
  ADD COLUMN department VARCHAR(255) NULL AFTER designation,
  ADD COLUMN office_address TEXT NULL AFTER department,
  ADD COLUMN office_phone VARCHAR(50) NULL AFTER office_address,
  ADD COLUMN fax VARCHAR(50) NULL AFTER office_phone,
  ADD COLUMN residence_address TEXT NULL AFTER fax,
  ADD COLUMN residence_phone VARCHAR(50) NULL AFTER residence_address,
  ADD COLUMN mobile VARCHAR(50) NOT NULL AFTER residence_phone,
  ADD COLUMN website VARCHAR(255) NULL AFTER email,
  ADD COLUMN description TEXT NULL AFTER website;

ALTER TABLE customers
  DROP INDEX unique_customer_name;

ALTER TABLE customers
  ADD CONSTRAINT fk_customers_customer_group
    FOREIGN KEY (customer_group_id) REFERENCES customer_groups(id)
    ON DELETE SET NULL,
  ADD UNIQUE KEY uk_customers_company (company),
  ADD UNIQUE KEY uk_customers_person_mobile (person, mobile),
  ADD KEY idx_customers_group_id (customer_group_id),
  ADD KEY idx_customers_status (status);
