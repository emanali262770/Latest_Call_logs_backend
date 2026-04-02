CREATE TABLE IF NOT EXISTS duty_shifts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  duty_shift_name VARCHAR(255) NOT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_duty_shift_name (duty_shift_name)
);
