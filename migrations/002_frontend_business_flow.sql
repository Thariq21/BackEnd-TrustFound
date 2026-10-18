USE trustfound;

ALTER TABLE `item`
  ADD COLUMN IF NOT EXISTS `report_type` ENUM('found','lost') NOT NULL DEFAULT 'found' AFTER `finder_nim`,
  ADD COLUMN IF NOT EXISTS `report_time` TIME NULL DEFAULT NULL AFTER `found_date`;

ALTER TABLE `item`
  MODIFY COLUMN `image_path` VARCHAR(255) NULL;

ALTER TABLE `claim`
  ADD COLUMN IF NOT EXISTS `review_note` TEXT NULL DEFAULT NULL AFTER `challange_answer`,
  ADD COLUMN IF NOT EXISTS `evidence_path` VARCHAR(512) NULL DEFAULT NULL AFTER `review_note`;

ALTER TABLE `pickup_slot`
  ADD COLUMN IF NOT EXISTS `slot_date` DATE NULL DEFAULT NULL AFTER `day_of_week`;
