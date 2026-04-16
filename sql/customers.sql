CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_group_id INT DEFAULT NULL,
  company VARCHAR(255) DEFAULT NULL,
  person VARCHAR(255) NOT NULL,
  designation VARCHAR(255) DEFAULT NULL,
  department VARCHAR(255) DEFAULT NULL,
  office_address TEXT DEFAULT NULL,
  office_phone VARCHAR(50) DEFAULT NULL,
  fax VARCHAR(50) DEFAULT NULL,
  residence_address TEXT DEFAULT NULL,
  residence_phone VARCHAR(50) DEFAULT NULL,
  mobile VARCHAR(50) NOT NULL,
  email VARCHAR(255) DEFAULT NULL,
  website VARCHAR(255) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_customers_customer_group
    FOREIGN KEY (customer_group_id) REFERENCES customer_groups(id)
    ON DELETE SET NULL,
  UNIQUE KEY uk_customers_company (company),
  UNIQUE KEY uk_customers_person_mobile (person, mobile),
  KEY idx_customers_group_id (customer_group_id),
  KEY idx_customers_status (status)
);
