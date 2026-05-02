CREATE TABLE IF NOT EXISTS message_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  batch_id VARCHAR(64) NULL,
  customer_group_id INT NULL,
  customer_id INT NULL,
  template_id VARCHAR(100) NOT NULL,
  template_title VARCHAR(150) NOT NULL,
  message_text TEXT NOT NULL,
  status ENUM('sent', 'failed') NOT NULL DEFAULT 'sent',
  provider_sid VARCHAR(120) NULL,
  error_message TEXT NULL,
  sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_message_logs_batch_id (batch_id),
  INDEX idx_message_logs_customer_group_id (customer_group_id),
  INDEX idx_message_logs_customer_id (customer_id),
  INDEX idx_message_logs_template_id (template_id),
  INDEX idx_message_logs_sent_at (sent_at),
  CONSTRAINT fk_message_logs_customer_group
    FOREIGN KEY (customer_group_id) REFERENCES customer_groups(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_message_logs_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
);
