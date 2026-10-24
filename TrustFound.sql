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

--
-- Dumping data for table `claim`
--

INSERT INTO `claim` (`claim_id`, `claimer_nim`, `validator_nip`, `item_id`, `create_at`, `challange_answer`, `status`, `qr_token`, `qr_expires_at`, `processed_at`) VALUES
(8, 1232001033, 2314, 10, '2026-01-09 13:14:09', 'Lecet dibagian tutup.', 'verified', NULL, NULL, '2026-01-09 13:15:05'),
(9, 1232001011, 2314, 11, '2026-01-09 13:54:50', '-', 'verified', '3d903698ca45977d3f5a8484ad116d8eca8d711335c452e9dc9c3ecf1a9f9c05', '2026-07-07 15:35:10', '2026-01-09 14:03:10'),
(10, 1232001035, 2314, 12, '2026-01-09 14:25:44', 'Tumbler berwana hitam dengan merk Stanley.', 'verified', NULL, NULL, '2026-01-09 14:28:00'),
(13, 1232001022, 1231001056, 13, '2026-01-10 08:54:37', 'Terdapat KTP Bernama Thariq Rahman', 'verified', NULL, NULL, '2026-01-10 08:56:02'),
(16, 1232001011, 2314, 16, '2026-06-11 16:53:25', 'Saya Lapar', 'verified', 'a19844298cef05ad24829638a81d16e0c9291357d07dab06cafc74cb31dbce2a', '2026-07-08 05:36:54', '2026-07-05 12:10:30'),
(17, 1232001011, 2314, 17, '2026-07-07 05:36:36', 'warna coklat', 'claimed', NULL, NULL, '2026-07-07 11:59:15'),
(18, 1232001011, 2314, 18, '2026-07-07 11:02:38', 'Isi ID card ada KTP, E-Money, dan Kartu akses centennial tower.\nNIK 3201112105050004', 'claimed', NULL, NULL, '2026-07-07 11:52:19'),
(19, 1232001033, 1231001056, 25, '2026-07-14 12:16:09', 'Laptop Asus Vivobook 14X M1403QA dan ada Stiker Toriq di dalam laptopnya', 'claimed', NULL, NULL, '2026-07-14 12:26:36'),
(20, 1232001011, NULL, 22, '2026-07-14 12:54:31', 'Smart Watch Merk Itel', 'pending', NULL, NULL, NULL),
(21, 1232001033, 2314, 23, '2026-07-23 18:13:09', 'Terdapat goresan di bagian left side tws', 'claimed', NULL, NULL, '2026-07-23 18:21:46'),
(22, 1232001011, NULL, 29, '2026-09-13 18:15:13', '-', 'pending', NULL, NULL, NULL),
(23, 1232001011, NULL, 26, '2026-09-14 02:04:49', '-', 'pending', NULL, NULL, NULL);

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
(1232001059, 1231, 'Kayla El-Raudhia De Nato', '1232001059@student.bakrie.ac.id', '0821989321', '$2a$12$/ThwIb/nYaeLrsOE7T7VMucPMDQvXPhycA67Son4sM5IRTmqczlgm', 'active');

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
-- Dumping data for table `item`
--

INSERT INTO `item` (`item_id`, `finder_nim`, `manage_nip`, `category_id`, `name`, `description`, `found_location`, `is_sensitive`, `found_date`, `image_path`, `status`) VALUES
(10, 1232001033, 2314, 3, 'Tumbler', 'Tumbler Hitam, Merk Stanley', 'BT 90', 0, '2026-01-01', 'public/uploads/1767964244351-966310646.jpg', 'claimed'),
(11, 1232001011, 2314, 3, 'Mouse Wireless', 'Mouse Hitam Merk Fantech serius Raigor III WG12R', 'Student Lounge Kampus Plaza Festival', 0, '2026-01-09', 'public/uploads/1767964355266-668940178.jpeg', 'claimed'),
(12, 1232001035, 2314, 3, 'Tumbler', 'Tumbler berwana hitam, merk Stanley.', 'BT-90 Universitas Bakrie', 0, '2026-01-01', 'public/uploads/1767968199578-418582704.jpg', 'claimed'),
(13, 1232001011, 1231001056, 2, 'Dompet', 'Dompet Hitam dengan KTP inisial TR', 'Student Lounge Kampus Bakrie Tower Lantai 90', 1, '2026-01-03', 'public/uploads/blur-1768034553495-212307680.jpeg', 'claimed'),
(14, NULL, 2314, 3, 'Tumbler', 'Tumbler Putih Merk Corcircle', 'Lab B Kampus Plaza Festival', 0, '2025-01-05', 'public/uploads/1768034738738-395316710.jpeg', 'donated'),
(15, 1232001011, 2314, 3, 'Tumbler Merah', 'Tumbler Lock&amp;Lock Warna Merah', 'Student Lounge Lobby Belakang Kampus Plaza Festival', 0, '2026-01-13', 'public/uploads/1768292810049-452765826.jpg', 'donated'),
(16, 1232001011, 2314, 3, 'Indomie', 'Indomie Goreng rasa sate', 'Kost Toriq', 0, '2026-06-11', 'public/uploads/1781196640680-658356379.jpg', 'donated'),
(17, 1232001011, 2314, 3, 'Kotak Bekel', 'Bekel Warna Krem Bentuk Tabung', 'Ruang 2 Kampus Plaza Festival', 0, '2026-07-01', 'public/uploads/1782883399365-479986345.jpeg', 'claimed'),
(18, 1232001046, 2314, 2, 'ID Card', 'ID Card beserta Kartu Identitas Lainnya', 'Lab ICH&#x2F;Cisco Universitas Bakrie Kampus Plaza Festival', 1, '2026-07-07', 'public/uploads/blur-1783421975736-503784796.jpg', 'claimed'),
(19, NULL, 2314, 1, 'Komputer', 'Test', 'Lobi', 1, '2026-07-06', 'public/uploads/blur-1783426581083-868400644.png', 'secured'),
(20, 1232001011, 2314, 1, 'Komputer', 'Detail barang ini ditemukan di lobi UBakrie', 'Lobi', 1, '2026-07-02', 'public/uploads/blur-1783426725353-583292545.png', 'secured'),
(21, 1232001011, 2314, 1, 'Server', 'jahdjxhshshsusyssy', 'Ruang 09', 1, '2026-07-07', 'public/uploads/blur-1783426729436-755724623.jpg', 'secured'),
(22, 1232001011, 2314, 1, 'Smart Watch', 'Smart Watch Warna Hitam &#x2F; Biru Dongker dengan Merk Itel', 'Ruang 2 Universitas Bakrie Kampus Plaza Festival', 1, '2026-07-08', 'public/uploads/blur-1783874542985-408399125.jpeg', 'secured'),
(23, 1232001022, 2314, 1, 'TWS', 'TWS Warna Hitam Merk SoundCore r50i', 'Student Lounge Universitas Bakrie Kampus Plaza Festival', 1, '2026-07-09', 'public/uploads/blur-1783874704173-105762848.jpeg', 'claimed'),
(24, 1232001032, 1231001056, 1, 'laptop', 'Laptop Dell beserta chargernya', 'Ruang 8 Universitas Bakrie Kampus Plaza Festival', 1, '2026-07-06', 'public/uploads/blur-1783874775192-516355987.jpeg', 'secured'),
(25, 1232001033, 2314, 1, 'Laptop', 'Laptop Asus Vivobook 14x M1403QA', 'Ruang 4 Universitas Bakrie Kampus Plaza Festival', 1, '2026-07-07', 'public/uploads/blur-1783874834122-177695238.jpeg', 'claimed'),
(26, 1232001046, 1231001056, 3, 'Sisir', 'Sisir Warna Hitam dan Hijau', 'Student Lounge Universitas Bakrie Kampus Bakrie Tower', 0, '2026-07-02', 'public/uploads/1783874909485-823066411.jpeg', 'secured'),
(27, 1232001059, 1231001056, 3, 'Tumbler', 'Tumbler dengan motif stiker astronot', 'Student Lounge Universitas Bakrie Kampus Bakrie Tower', 0, '2026-07-03', 'public/uploads/1783875010282-992180945.jpeg', 'secured'),
(28, 1232001035, 1231001056, 3, 'tumbler corkcicle', 'Tumbler Putih', 'Lobby Depan Universitas Bakrie Kampus Plaza Festival', 0, '2026-07-01', 'public/uploads/1783875294476-824505447.jpeg', 'secured'),
(29, 1232001044, 2314, 3, 'Kotak Bekal', 'Kotak Bekal dengan Warna Crem dan terdapat tas untuk kotaknya', 'Student Lounge Universitas Bakrie Kampus Bakrie Tower Lantai 42', 0, '2026-07-04', 'public/uploads/1784030852451-695501778.jpg', 'secured'),
(30, 1232001059, 2314, 1, 'HandPhone', 'IPhone 13, warna biru dengan wallpaper juga biru', 'Ruang 10 Universitas Bakrie Kampus Plaza Festival', 1, '2026-07-09', 'public/uploads/blur-1784031084974-780533294.jpg', 'secured'),
(31, 1232001033, 2314, 1, 'Handphone', 'Iphone 17 Pro Max', 'Lobby Depan', 1, '2026-07-23', 'public/uploads/blur-1784830290971-135545449.jpg', 'secured'),
(32, NULL, 2314, 2, 'Larparch', 'naniiii', 'Rumah Ireng', 1, '2026-09-11', 'public/uploads/blur-1789222803734-557373192.png', 'secured');

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
