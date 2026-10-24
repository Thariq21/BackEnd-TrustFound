USE trustfound;

CREATE TABLE IF NOT EXISTS `found_item` (
  `item_id` int(11) NOT NULL,
  `found_location` varchar(255) NOT NULL,
  `found_date` date NOT NULL,
  `found_time` time DEFAULT NULL,
  PRIMARY KEY (`item_id`),
  CONSTRAINT `found_item_fk1` FOREIGN KEY (`item_id`) REFERENCES `item` (`item_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS `lost_item` (
  `item_id` int(11) NOT NULL,
  `lost_location` varchar(255) NOT NULL,
  `lost_date` date NOT NULL,
  `lost_time` time DEFAULT NULL,
  PRIMARY KEY (`item_id`),
  CONSTRAINT `lost_item_fk1` FOREIGN KEY (`item_id`) REFERENCES `item` (`item_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `lost_item`
  MODIFY COLUMN `lost_time` time DEFAULT NULL;

INSERT INTO `found_item` (`item_id`, `found_location`, `found_date`, `found_time`)
SELECT i.`item_id`, i.`found_location`, i.`found_date`, i.`report_time`
FROM `item` i
LEFT JOIN `found_item` fi ON fi.`item_id` = i.`item_id`
WHERE i.`report_type` = 'found' AND fi.`item_id` IS NULL;

INSERT INTO `lost_item` (`item_id`, `lost_location`, `lost_date`, `lost_time`)
SELECT i.`item_id`, i.`found_location`, i.`found_date`, i.`report_time`
FROM `item` i
LEFT JOIN `lost_item` li ON li.`item_id` = i.`item_id`
WHERE i.`report_type` = 'lost' AND li.`item_id` IS NULL;

ALTER TABLE `item`
  DROP COLUMN `found_location`,
  DROP COLUMN `found_date`,
  DROP COLUMN `report_time`;
