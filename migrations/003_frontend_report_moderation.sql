USE trustfound;

ALTER TABLE `item`
  ADD COLUMN IF NOT EXISTS `report_review_status` ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'accepted' AFTER `report_type`,
  ADD COLUMN IF NOT EXISTS `reviewed_by` INT(11) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `reviewed_at` DATETIME NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `rejection_reason` VARCHAR(255) NULL DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS `rejection_note` TEXT NULL DEFAULT NULL,
  ADD INDEX IF NOT EXISTS `idx_item_review_status` (`report_review_status`);
