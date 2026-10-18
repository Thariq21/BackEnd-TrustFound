-- Migration: Add pickup_slot table and scheduling support to claim table
-- Author: Senior Backend Engineer
-- Date: 2026-10-15

USE trustfound;

-- 1. Create pickup_slot table
CREATE TABLE IF NOT EXISTS `pickup_slot` (
  `slot_id` INT(11) NOT NULL AUTO_INCREMENT,
  `day_of_week` ENUM('Monday','Tuesday','Wednesday','Thursday','Friday') NOT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `location` VARCHAR(255) NOT NULL DEFAULT 'Lemari Kaca Lost & Found',
  `max_quota` INT(11) NOT NULL DEFAULT 5,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`slot_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2. Populate recurring weekly 1-hour slots from 09:00 to 16:00 (Monday - Friday)
INSERT INTO `pickup_slot` (`day_of_week`, `start_time`, `end_time`, `location`, `max_quota`, `is_active`)
SELECT * FROM (
  -- Monday
  SELECT 'Monday' AS day_of_week, '09:00:00' AS start_time, '10:00:00' AS end_time, 'Lemari Kaca Lost & Found' AS location, 5 AS max_quota, 1 AS is_active UNION ALL
  SELECT 'Monday', '10:00:00', '11:00:00', 'Lemari Kaca Lost & Found', 5, 1 UNION ALL
  SELECT 'Monday', '11:00:00', '12:00:00', 'Lemari Kaca Lost & Found', 5, 1 UNION ALL
  SELECT 'Monday', '12:00:00', '13:00:00', 'Lemari Kaca Lost & Found', 5, 1 UNION ALL
  SELECT 'Monday', '13:00:00', '14:00:00', 'Lemari Kaca Lost & Found', 5, 1 UNION ALL
  SELECT 'Monday', '14:00:00', '15:00:00', 'Lemari Kaca Lost & Found', 5, 1 UNION ALL
  SELECT 'Monday', '15:00:00', '16:00:00', 'Lemari Kaca Lost & Found', 5, 1 UNION ALL
  -- Tuesday
  SELECT 'Tuesday', '09:00:00', '10:00:00', 'Lemari Kaca Lost & Found', 5, 1 UNION ALL
  SELECT 'Tuesday', '10:00:00', '11:00:00', 'Lemari Kaca Lost & Found', 5, 1 UNION ALL
  SELECT 'Tuesday', '11:00:00', '12:00:00', 'Lemari Kaca Lost & Found', 5, 1 UNION ALL
  SELECT 'Tuesday', '12:00:00', '13:00:00', 'Lemari Kaca Lost & Found', 5, 1 UNION ALL
  SELECT 'Tuesday', '13:00:00', '14:00:00', 'Lemari Kaca Lost & Found', 5, 1 UNION ALL
  SELECT 'Tuesday', '14:00:00', '15:00:00', 'Lemari Kaca Lost & Found', 5, 1 UNION ALL
  SELECT 'Tuesday', '15:00:00', '16:00:00', 'Lemari Kaca Lost & Found', 5, 1 UNION ALL
  -- Wednesday
  SELECT 'Wednesday', '09:00:00', '10:00:00', 'Lemari Kaca Lost & Found', 5, 1 UNION ALL
  SELECT 'Wednesday', '10:00:00', '11:00:00', 'Lemari Kaca Lost & Found', 5, 1 UNION ALL
  SELECT 'Wednesday', '11:00:00', '12:00:00', 'Lemari Kaca Lost & Found', 5, 1 UNION ALL
  SELECT 'Wednesday', '12:00:00', '13:00:00', 'Lemari Kaca Lost & Found', 5, 1 UNION ALL
  SELECT 'Wednesday', '13:00:00', '14:00:00', 'Lemari Kaca Lost & Found', 5, 1 UNION ALL
  SELECT 'Wednesday', '14:00:00', '15:00:00', 'Lemari Kaca Lost & Found', 5, 1 UNION ALL
  SELECT 'Wednesday', '15:00:00', '16:00:00', 'Lemari Kaca Lost & Found', 5, 1 UNION ALL
  -- Thursday
  SELECT 'Thursday', '09:00:00', '10:00:00', 'Lemari Kaca Lost & Found', 5, 1 UNION ALL
  SELECT 'Thursday', '10:00:00', '11:00:00', 'Lemari Kaca Lost & Found', 5, 1 UNION ALL
  SELECT 'Thursday', '11:00:00', '12:00:00', 'Lemari Kaca Lost & Found', 5, 1 UNION ALL
  SELECT 'Thursday', '12:00:00', '13:00:00', 'Lemari Kaca Lost & Found', 5, 1 UNION ALL
  SELECT 'Thursday', '13:00:00', '14:00:00', 'Lemari Kaca Lost & Found', 5, 1 UNION ALL
  SELECT 'Thursday', '14:00:00', '15:00:00', 'Lemari Kaca Lost & Found', 5, 1 UNION ALL
  SELECT 'Thursday', '15:00:00', '16:00:00', 'Lemari Kaca Lost & Found', 5, 1 UNION ALL
  -- Friday
  SELECT 'Friday', '09:00:00', '10:00:00', 'Lemari Kaca Lost & Found', 5, 1 UNION ALL
  SELECT 'Friday', '10:00:00', '11:00:00', 'Lemari Kaca Lost & Found', 5, 1 UNION ALL
  SELECT 'Friday', '11:00:00', '12:00:00', 'Lemari Kaca Lost & Found', 5, 1 UNION ALL
  SELECT 'Friday', '12:00:00', '13:00:00', 'Lemari Kaca Lost & Found', 5, 1 UNION ALL
  SELECT 'Friday', '13:00:00', '14:00:00', 'Lemari Kaca Lost & Found', 5, 1 UNION ALL
  SELECT 'Friday', '14:00:00', '15:00:00', 'Lemari Kaca Lost & Found', 5, 1 UNION ALL
  SELECT 'Friday', '15:00:00', '16:00:00', 'Lemari Kaca Lost & Found', 5, 1
) AS default_slots
WHERE NOT EXISTS (SELECT 1 FROM `pickup_slot` LIMIT 1);

-- 3. Modify claim.status to include 'scheduled'
ALTER TABLE `claim` 
MODIFY COLUMN `status` ENUM('pending','verified','scheduled','rejected','claimed') DEFAULT 'pending';

-- 4. Add scheduled_slot_id and scheduled_date to claim table if they do not exist
SET @col_slot_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = 'trustfound' AND TABLE_NAME = 'claim' AND COLUMN_NAME = 'scheduled_slot_id'
);

SET @stmt_add_slot = IF(@col_slot_exists = 0, 
  'ALTER TABLE `claim` ADD COLUMN `scheduled_slot_id` INT(11) NULL DEFAULT NULL AFTER `challange_answer`', 
  'SELECT "Column scheduled_slot_id already exists"'
);
PREPARE stmt1 FROM @stmt_add_slot;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

SET @col_date_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = 'trustfound' AND TABLE_NAME = 'claim' AND COLUMN_NAME = 'scheduled_date'
);

SET @stmt_add_date = IF(@col_date_exists = 0, 
  'ALTER TABLE `claim` ADD COLUMN `scheduled_date` DATE NULL DEFAULT NULL AFTER `scheduled_slot_id`', 
  'SELECT "Column scheduled_date already exists"'
);
PREPARE stmt2 FROM @stmt_add_date;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- 5. Add Foreign Key for scheduled_slot_id if not exists
SET @fk_exists = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = 'trustfound' AND TABLE_NAME = 'claim' AND CONSTRAINT_NAME = 'claim_fk_slot'
);

SET @stmt_add_fk = IF(@fk_exists = 0,
  'ALTER TABLE `claim` ADD CONSTRAINT `claim_fk_slot` FOREIGN KEY (`scheduled_slot_id`) REFERENCES `pickup_slot` (`slot_id`) ON DELETE SET NULL',
  'SELECT "Constraint claim_fk_slot already exists"'
);
PREPARE stmt3 FROM @stmt_add_fk;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;
