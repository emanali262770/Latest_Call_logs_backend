CREATE TABLE IF NOT EXISTS employee_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_type_name VARCHAR(255) NOT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_employee_type_name (employee_type_name)
);
