USE trustfound;

ALTER TABLE `item`
  MODIFY COLUMN `status` enum('pending','secured','active','available','claimed','donated') NOT NULL DEFAULT 'available';

UPDATE `item`
SET `status` = CASE
  WHEN `report_type` = 'lost' THEN 'active'
  ELSE 'available'
END
WHERE `status` IN ('pending', 'secured');

ALTER TABLE `item`
  MODIFY COLUMN `status` enum('active','available','claimed','donated') NOT NULL DEFAULT 'available';
