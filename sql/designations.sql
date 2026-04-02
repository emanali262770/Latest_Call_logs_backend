CREATE TABLE IF NOT EXISTS designations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  designation_name VARCHAR(255) NOT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_designation_name (designation_name)
);
