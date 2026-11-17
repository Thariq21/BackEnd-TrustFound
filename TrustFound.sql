-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: db-server
-- Generation Time: Sep 26, 2026 at 02:31 PM
-- Server version: 11.8.2-MariaDB-ubu2404
-- PHP Version: 8.3.26

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `TrustFound`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin`
--

CREATE TABLE `admin` (
  `nip` int(11) NOT NULL,
  `univ_id` int(11) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `role` enum('Admin_BEM') NOT NULL DEFAULT 'Admin_BEM'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admin`
--

INSERT INTO `admin` (`nip`, `univ_id`, `full_name`, `password`, `email`, `role`) VALUES
(2314, 1231, 'Budi Santoso', '$2a$12$F6X2u4bgYvY/6wlyV11LMuj3R6hcHD0aFqevy0V/UOmh4tZpM7HcW', 'budi@bakrie.ac.id', 'Admin_BEM'),
(1231001056, 1231, 'Rahul Nafta', '$2a$12$FaXTUpkK3HBbNu6YgWUgSulXQ7R01piMzNMRO2hrjfSgTzFGfzQsm', 'awan@bakrie.ac.id', 'Admin_BEM');

-- --------------------------------------------------------

--
-- Table structure for table `category`
--

CREATE TABLE `category` (
  `category_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `default_sensitive` tinyint(1) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `category`
--

INSERT INTO `category` (`category_id`, `name`, `default_sensitive`) VALUES
(1, 'Elektronik (HP, Laptop, Tab, Earphone)', 1),
(2, 'Dompet / Tas / Identitas Pribadi', 1),
(3, 'Umum (Tumbler, Buku, Jaket, Aksesoris, Alat Tulis, dll)', 0),
(4, 'Charger Elektronik', 0);

-- --------------------------------------------------------

--
-- Table structure for table `claim`
--

CREATE TABLE `claim` (
  `claim_id` int(11) NOT NULL,
  `claimer_nim` int(11) NOT NULL,
  `validator_nip` int(11) DEFAULT NULL,
  `item_id` int(11) NOT NULL,
  `create_at` datetime NOT NULL DEFAULT current_timestamp(),
  `challange_answer` text NOT NULL,
  `review_note` text DEFAULT NULL,
  `evidence_path` varchar(512) DEFAULT NULL,
  `scheduled_slot_id` int(11) DEFAULT NULL,
  `scheduled_date` date DEFAULT NULL,
  `status` enum('pending','verified','scheduled','rejected','claimed') DEFAULT 'pending',
  `qr_token` varchar(255) DEFAULT NULL,
  `qr_expires_at` datetime DEFAULT NULL,
  `processed_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Table structure for table `claim_verification_answer`
--

CREATE TABLE `claim_verification_answer` (
  `answer_id` int(11) NOT NULL,
  `claim_id` int(11) NOT NULL,
  `question_order` tinyint(3) unsigned NOT NULL,
  `question_text` varchar(500) NOT NULL,
  `answer_text` text NOT NULL,
  UNIQUE KEY `uq_claim_verification_answer_order` (`claim_id`, `question_order`),
  CONSTRAINT `chk_claim_verification_answer_order` CHECK (`question_order` BETWEEN 1 AND 10),
  CONSTRAINT `chk_claim_verification_question_text` CHECK (char_length(trim(`question_text`)) BETWEEN 1 AND 500),
  CONSTRAINT `chk_claim_verification_answer_text` CHECK (char_length(trim(`answer_text`)) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- --------------------------------------------------------

--
-- Table structure for table `general_user`
--

CREATE TABLE `general_user` (
  `nim` int(11) NOT NULL,
  `univ_id` int(11) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone_number` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `status` enum('active','inactive','suspended') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `general_user`
--

INSERT INTO `general_user` (`nim`, `univ_id`, `full_name`, `email`, `phone_number`, `password`, `status`) VALUES
(1232001011, 1231, 'Thariq Rahman', '1232001011@student.bakrie.ac.id', '0881024468406', '$2a$12$qx9ZE/4nsyZ5FaF3OBmetebMPAvPkU1QpnMAizEDHFyPdwCyG6y7e', 'active'),
(1232001022, 1231, 'Muhammad Alfi Anfahsa', '1232001022@student.bakrie.ac.id', '08561022054', '$2a$12$qx9ZE/4nsyZ5FaF3OBmetebMPAvPkU1QpnMAizEDHFyPdwCyG6y7e', 'active'),
(1232001032, 1231, 'Egbert Felica Wibianto', '1232001032@student.bakrie.ac.id', '085799335009', '$2a$12$562uZI1sINkgDI9PMlnRW.sC6lmJ79KnIrT2LF9n6.ZF7/eHdxNae', 'active'),
(1232001033, 1231, 'Daffa Ibnu Abdillah', '1232001033@student.bakrie.ac.id', '089636315277', '$2a$12$AY1n3XYkeaHRJctSsE0rH.XWSFTwrVWRWIbz4OycY6koAFyPgBkUe', 'active'),
(1232001035, 1231, 'Ghefa Marva Raka Putra', '1232001035@student.bakrie.ac.id', '081382703685', '$2a$12$7M.8tjfyFx4JrXJpqOrjVuHObJGN9tqO.CublUKq3CJlmhHn762hi', 'active'),
(1232001041, 1231, 'Muhammad Faalih', '1232001041@student.bakrie.ac.id', '083167282880', '$2a$12$oWhKjyNnZi5A5DtG8IklKeIJ/e5HAsGiLrhR9QhAe6u168GOyTKzq', 'active'),
(1232001044, 1231, 'Aditya Novadianto Pratama', '1232001044@student.bakrie.ac.id', '081292193758', '$2a$12$sxE.20B4bpo3zhEz9KUvJO5rGOGNzzVl3yEUIIjz4EQmOvqCaIaDq', 'active'),
(1232001046, 1231, 'Dinda Nuraini', '1232001046@student.bakrie.ac.id', '085710201820', '$2a$12$z.lF7v6BwEd9BWfG3CigvO2tnMAftLTau86TZbIzSeGLpMQqxu3ZG', 'active'),
(1232001059, 1231, 'Kayla El-Raudhia De Nato', '1232001059@student.bakrie.ac.id', '0821989321', '$2a$12$/ThwIb/nYaeLrsOE7T7VMucPMDQvXPhycA67Son4sM5IRTmqczlgm', 'active'),
(1232001010, 1231, 'Najwa Naela Fawwa', '1232001010@student.bakrie.ac.id', '081234567890', '$2a$12$Q1DkxLtLlhCMnAiGhyhCBORiyi2rm3jHdA3dSgNydO/pdpGBjxWsS', 'active');


-- --------------------------------------------------------

--
-- Table structure for table `item`
--
-- Legacy detail columns are copied into the subtype tables below and dropped
-- before the dump completes.

CREATE TABLE `item` (
  `item_id` int(11) NOT NULL,
  `finder_nim` int(11) DEFAULT NULL,
  `report_type` enum('found','lost') NOT NULL DEFAULT 'found',
  `report_review_status` enum('pending','accepted','rejected') NOT NULL DEFAULT 'accepted',
  `manage_nip` int(11) DEFAULT NULL,
  `category_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `found_location` varchar(255) NOT NULL,
  `is_sensitive` tinyint(1) NOT NULL,
  `found_date` date NOT NULL,
  `report_time` time DEFAULT NULL,
  `image_path` varchar(255) DEFAULT NULL,
  `status` enum('active','available','claimed','donated') NOT NULL DEFAULT 'available',
  `reviewed_by` int(11) DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `rejection_reason` varchar(255) DEFAULT NULL,
  `rejection_note` text DEFAULT NULL,
  KEY `idx_item_review_status` (`report_review_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Table structure for table `item_verification_question`
--

CREATE TABLE `item_verification_question` (
  `question_id` int(11) NOT NULL,
  `item_id` int(11) NOT NULL,
  `question_order` tinyint(3) unsigned NOT NULL,
  `question_text` varchar(500) NOT NULL,
  UNIQUE KEY `uq_item_verification_question_order` (`item_id`, `question_order`),
  CONSTRAINT `chk_item_verification_question_order` CHECK (`question_order` BETWEEN 1 AND 10),
  CONSTRAINT `chk_item_verification_question_text` CHECK (char_length(trim(`question_text`)) BETWEEN 1 AND 500)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Table structure for table `found_item`
--

CREATE TABLE `found_item` (
  `item_id` int(11) NOT NULL,
  `found_location` varchar(255) NOT NULL,
  `found_date` date NOT NULL,
  `found_time` time DEFAULT NULL,
  KEY `found_item_fk1` (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Table structure for table `lost_item`
--

CREATE TABLE `lost_item` (
  `item_id` int(11) NOT NULL,
  `lost_location` varchar(255) NOT NULL,
  `lost_date` date NOT NULL,
  `lost_time` time DEFAULT NULL,
  KEY `lost_item_fk1` (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


--
-- Preserve report details from the legacy item columns in their subtype tables
--

INSERT INTO `found_item` (`item_id`, `found_location`, `found_date`, `found_time`)
SELECT `item_id`, `found_location`, `found_date`, `report_time`
FROM `item`
WHERE `report_type` = 'found';

INSERT INTO `lost_item` (`item_id`, `lost_location`, `lost_date`, `lost_time`)
SELECT `item_id`, `found_location`, `found_date`, `report_time`
FROM `item`
WHERE `report_type` = 'lost';

ALTER TABLE `item`
  DROP COLUMN `found_location`,
  DROP COLUMN `found_date`,
  DROP COLUMN `report_time`;

-- --------------------------------------------------------

-- --------------------------------------------------------

--
-- Table structure for table `pickup_slot`
--

CREATE TABLE `pickup_slot` (
  `slot_id` int(11) NOT NULL,
  `day_of_week` enum('Monday','Tuesday','Wednesday','Thursday','Friday') NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `location` varchar(255) NOT NULL DEFAULT 'Lemari Kaca Lost & Found',
  `max_quota` int(11) NOT NULL DEFAULT 5,
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `pickup_slot`
--

INSERT INTO `pickup_slot` (`slot_id`, `day_of_week`, `start_time`, `end_time`, `location`, `max_quota`, `is_active`) VALUES
(1, 'Monday', '09:00:00', '10:00:00', 'Lemari Kaca Lost & Found', 5, 1),
(2, 'Monday', '10:00:00', '11:00:00', 'Lemari Kaca Lost & Found', 5, 1),
(3, 'Monday', '11:00:00', '12:00:00', 'Lemari Kaca Lost & Found', 5, 1),
(4, 'Monday', '12:00:00', '13:00:00', 'Lemari Kaca Lost & Found', 5, 1),
(5, 'Monday', '13:00:00', '14:00:00', 'Lemari Kaca Lost & Found', 5, 1),
(6, 'Monday', '14:00:00', '15:00:00', 'Lemari Kaca Lost & Found', 5, 1),
(7, 'Monday', '15:00:00', '16:00:00', 'Lemari Kaca Lost & Found', 5, 1),
(8, 'Tuesday', '09:00:00', '10:00:00', 'Lemari Kaca Lost & Found', 5, 1),
(9, 'Tuesday', '10:00:00', '11:00:00', 'Lemari Kaca Lost & Found', 5, 1),
(10, 'Tuesday', '11:00:00', '12:00:00', 'Lemari Kaca Lost & Found', 5, 1),
(11, 'Tuesday', '12:00:00', '13:00:00', 'Lemari Kaca Lost & Found', 5, 1),
(12, 'Tuesday', '13:00:00', '14:00:00', 'Lemari Kaca Lost & Found', 5, 1),
(13, 'Tuesday', '14:00:00', '15:00:00', 'Lemari Kaca Lost & Found', 5, 1),
(14, 'Tuesday', '15:00:00', '16:00:00', 'Lemari Kaca Lost & Found', 5, 1),
(15, 'Wednesday', '09:00:00', '10:00:00', 'Lemari Kaca Lost & Found', 5, 1),
(16, 'Wednesday', '10:00:00', '11:00:00', 'Lemari Kaca Lost & Found', 5, 1),
(17, 'Wednesday', '11:00:00', '12:00:00', 'Lemari Kaca Lost & Found', 5, 1),
(18, 'Wednesday', '12:00:00', '13:00:00', 'Lemari Kaca Lost & Found', 5, 1),
(19, 'Wednesday', '13:00:00', '14:00:00', 'Lemari Kaca Lost & Found', 5, 1),
(20, 'Wednesday', '14:00:00', '15:00:00', 'Lemari Kaca Lost & Found', 5, 1),
(21, 'Wednesday', '15:00:00', '16:00:00', 'Lemari Kaca Lost & Found', 5, 1),
(22, 'Thursday', '09:00:00', '10:00:00', 'Lemari Kaca Lost & Found', 5, 1),
(23, 'Thursday', '10:00:00', '11:00:00', 'Lemari Kaca Lost & Found', 5, 1),
(24, 'Thursday', '11:00:00', '12:00:00', 'Lemari Kaca Lost & Found', 5, 1),
(25, 'Thursday', '12:00:00', '13:00:00', 'Lemari Kaca Lost & Found', 5, 1),
(26, 'Thursday', '13:00:00', '14:00:00', 'Lemari Kaca Lost & Found', 5, 1),
(27, 'Thursday', '14:00:00', '15:00:00', 'Lemari Kaca Lost & Found', 5, 1),
(28, 'Thursday', '15:00:00', '16:00:00', 'Lemari Kaca Lost & Found', 5, 1),
(29, 'Friday', '09:00:00', '10:00:00', 'Lemari Kaca Lost & Found', 5, 1),
(30, 'Friday', '10:00:00', '11:00:00', 'Lemari Kaca Lost & Found', 5, 1),
(31, 'Friday', '11:00:00', '12:00:00', 'Lemari Kaca Lost & Found', 5, 1),
(32, 'Friday', '12:00:00', '13:00:00', 'Lemari Kaca Lost & Found', 5, 1),
(33, 'Friday', '13:00:00', '14:00:00', 'Lemari Kaca Lost & Found', 5, 1),
(34, 'Friday', '14:00:00', '15:00:00', 'Lemari Kaca Lost & Found', 5, 1),
(35, 'Friday', '15:00:00', '16:00:00', 'Lemari Kaca Lost & Found', 5, 1);

-- --------------------------------------------------------

--
-- Table structure for table `university`
--

CREATE TABLE `university` (
  `univ_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `address` text NOT NULL,
  `email` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `university`
--

INSERT INTO `university` (`univ_id`, `name`, `address`, `email`) VALUES
(1231, 'Universitas Bakrie Kampus Jakarta', 'Bakrie Tower, Jl. Epicentrum Utama Raya No.2 40 42rd Floor, RT.2/RW.5, Kuningan, Karet, Kecamatan Setiabudi, Kuningan, Daerah Khusus Ibukota Jakarta 12940', 'ubakrie@bakrie.ac.id');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin`
--
ALTER TABLE `admin`
  ADD PRIMARY KEY (`nip`),
  ADD UNIQUE KEY `nip` (`nip`),
  ADD KEY `admin_fk1` (`univ_id`);

--
-- Indexes for table `category`
--
ALTER TABLE `category`
  ADD PRIMARY KEY (`category_id`),
  ADD UNIQUE KEY `category_id` (`category_id`);

--
-- Indexes for table `claim`
--
ALTER TABLE `claim`
  ADD PRIMARY KEY (`claim_id`),
  ADD UNIQUE KEY `claim_id` (`claim_id`),
  ADD KEY `claim_fk1` (`claimer_nim`),
  ADD KEY `claim_fk2` (`validator_nip`),
  ADD KEY `claim_fk3` (`item_id`);

ALTER TABLE `claim_verification_answer`
  ADD PRIMARY KEY (`answer_id`);

ALTER TABLE `item_verification_question`
  ADD PRIMARY KEY (`question_id`);

--
-- Indexes for table `general_user`
--
ALTER TABLE `general_user`
  ADD PRIMARY KEY (`nim`),
  ADD UNIQUE KEY `nim` (`nim`),
  ADD KEY `general_user_fk1` (`univ_id`);

--
-- Indexes for table `item`
--
ALTER TABLE `item`
  ADD PRIMARY KEY (`item_id`),
  ADD UNIQUE KEY `item_id` (`item_id`),
  ADD KEY `item_fk1` (`finder_nim`),
  ADD KEY `item_fk2` (`manage_nip`),
  ADD KEY `item_fk3` (`category_id`);

--
-- Indexes for tables `found_item` and `lost_item`
--
ALTER TABLE `found_item`
  ADD PRIMARY KEY (`item_id`);

ALTER TABLE `lost_item`
  ADD PRIMARY KEY (`item_id`);

--
-- Indexes for table `university`
--
ALTER TABLE `university`
  ADD PRIMARY KEY (`univ_id`),
  ADD UNIQUE KEY `univ_id` (`univ_id`);

--
-- Indexes for table `pickup_slot`
--
ALTER TABLE `pickup_slot`
  ADD PRIMARY KEY (`slot_id`),
  ADD UNIQUE KEY `slot_id` (`slot_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin`
--
ALTER TABLE `admin`
  MODIFY `nip` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1231001057;

--
-- AUTO_INCREMENT for table `category`
--
ALTER TABLE `category`
  MODIFY `category_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `claim`
--
ALTER TABLE `claim`
  MODIFY `claim_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

ALTER TABLE `claim_verification_answer`
  MODIFY `answer_id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `item_verification_question`
  MODIFY `question_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `general_user`
--
ALTER TABLE `general_user`
  MODIFY `nim` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1232001060;

--
-- AUTO_INCREMENT for table `item`
--
ALTER TABLE `item`
  MODIFY `item_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT for table `pickup_slot`
--
ALTER TABLE `pickup_slot`
  MODIFY `slot_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT for table `university`
--
ALTER TABLE `university`
  MODIFY `univ_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1232;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `admin`
--
ALTER TABLE `admin`
  ADD CONSTRAINT `admin_fk1` FOREIGN KEY (`univ_id`) REFERENCES `university` (`univ_id`);

--
-- Constraints for table `claim`
--
ALTER TABLE `claim`
  ADD CONSTRAINT `claim_fk1` FOREIGN KEY (`claimer_nim`) REFERENCES `general_user` (`nim`),
  ADD CONSTRAINT `claim_fk2` FOREIGN KEY (`validator_nip`) REFERENCES `admin` (`nip`),
  ADD CONSTRAINT `claim_fk3` FOREIGN KEY (`item_id`) REFERENCES `item` (`item_id`),
  ADD CONSTRAINT `claim_fk_slot` FOREIGN KEY (`scheduled_slot_id`) REFERENCES `pickup_slot` (`slot_id`) ON DELETE SET NULL;

ALTER TABLE `claim_verification_answer`
  ADD CONSTRAINT `claim_verification_answer_fk_claim` FOREIGN KEY (`claim_id`) REFERENCES `claim` (`claim_id`) ON DELETE CASCADE;

--
-- Constraints for table `general_user`
--
ALTER TABLE `general_user`
  ADD CONSTRAINT `general_user_fk1` FOREIGN KEY (`univ_id`) REFERENCES `university` (`univ_id`);

--
-- Constraints for table `item`
--
ALTER TABLE `item`
  ADD CONSTRAINT `item_fk1` FOREIGN KEY (`finder_nim`) REFERENCES `general_user` (`nim`),
  ADD CONSTRAINT `item_fk2` FOREIGN KEY (`manage_nip`) REFERENCES `admin` (`nip`),
  ADD CONSTRAINT `item_fk3` FOREIGN KEY (`category_id`) REFERENCES `category` (`category_id`);

--
-- Constraints for table `found_item`
--
ALTER TABLE `found_item`
  ADD CONSTRAINT `found_item_fk1` FOREIGN KEY (`item_id`) REFERENCES `item` (`item_id`) ON DELETE CASCADE;

--
-- Constraints for table `lost_item`
--
ALTER TABLE `lost_item`
  ADD CONSTRAINT `lost_item_fk1` FOREIGN KEY (`item_id`) REFERENCES `item` (`item_id`) ON DELETE CASCADE;

ALTER TABLE `item_verification_question`
  ADD CONSTRAINT `item_verification_question_fk_item` FOREIGN KEY (`item_id`) REFERENCES `item` (`item_id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
