ALTER TABLE users
  ADD COLUMN IF NOT EXISTS user_id VARCHAR(50) NULL AFTER id,
  ADD COLUMN IF NOT EXISTS is_locked TINYINT(1) NOT NULL DEFAULT 0 AFTER status;

UPDATE users
SET user_id = CONCAT('USR-', LPAD(id, 5, '0'))
WHERE user_id IS NULL OR TRIM(user_id) = '';

ALTER TABLE users
  MODIFY COLUMN user_id VARCHAR(50) NOT NULL;

ALTER TABLE users
  ADD UNIQUE KEY unique_users_user_id (user_id);
