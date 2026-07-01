-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: db-server
-- Generation Time: Jun 21, 2026 at 07:32 AM
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
  `role` enum('super_admin','admin','satpam') NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `admin`
--

INSERT INTO `admin` (`nip`, `univ_id`, `full_name`, `password`, `email`, `role`) VALUES
(2314, 1231, 'Budi Santoso', '$2a$10$nJHeZLrizT1fSnZcl0I8GOVOJMjzUdHp6cwI8xqGppJGUQO2Ijz5u', 'budi@bakrie.ac.id', 'satpam'),
(1231001056, 1231, 'Rahul Nafta', '$2a$10$w5JFv105prJkIJc3wcphYu.NjEvMGc7N1J6siJu9QiNTd6YOd.fD6', 'awan@bakrie.ac.id', 'admin');

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
  `status` enum('pending','verified','rejected') NOT NULL,
  `qr_token` varchar(255) DEFAULT NULL,
  `qr_expires_at` datetime DEFAULT NULL,
  `processed_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `claim`
--

INSERT INTO `claim` (`claim_id`, `claimer_nim`, `validator_nip`, `item_id`, `create_at`, `challange_answer`, `status`, `qr_token`, `qr_expires_at`, `processed_at`) VALUES
(8, 1232001033, 2314, 10, '2026-01-09 13:14:09', 'Lecet dibagian tutup.', 'verified', NULL, NULL, '2026-01-09 13:15:05'),
(9, 1232001011, 2314, 11, '2026-01-09 13:54:50', '-', 'verified', NULL, NULL, '2026-01-09 14:03:10'),
(10, 1232001035, 2314, 12, '2026-01-09 14:25:44', 'Tumbler berwana hitam dengan merk Stanley.', 'verified', NULL, NULL, '2026-01-09 14:28:00'),
(13, 1232001022, 1231001056, 13, '2026-01-10 08:54:37', 'Terdapat KTP Bernama Thariq Rahman', 'verified', NULL, NULL, '2026-01-10 08:56:02'),
(16, 1232001011, NULL, 16, '2026-06-11 16:53:25', 'Saya Lapar', 'pending', NULL, NULL, NULL);

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
(1232001011, 1231, 'Thariq Rahman', '1232001011@student.bakrie.ac.id', '0881024468406', '$2a$10$.9UN9srmhYdx90U.2tE5heh8vOcdTMr4ve3HFJRsVVbm4ekqgf6V2', 'active'),
(1232001022, 1231, 'Muhammad Alfi Anfahsa', '1232001022@student.bakrie.ac.id', '08561022054', '$2a$10$zHcwcKGUDrXMHUvck95o5eVzLSoHDbPKZyOEcCOSmBVNBfBSEoFb.', 'active'),
(1232001032, 1231, 'Egbert Felica Wibianto', '1232001032@student.bakrie.ac.id', '085799335009', '$2a$10$T/Vtp/STML0ol/JfvV0Luehb/p9BfOHbFX2kgImCFNsdkHKck5LE2', 'active'),
(1232001033, 1231, 'Daffa Ibnu Abdillah', '1232001033@student.bakrie.ac.id', '089636315277', '$2a$10$VOFhliIgMP1KDAki.J3k6u3qwkKKnMfgc4jWlA6Qe6O/uXBnwXLju', 'active'),
(1232001035, 1231, 'Ghefa Marva Raka Putra', '1232001035@student.bakrie.ac.id', '081382703685', '$2a$10$Q/IBO5EzFNm7enlc2zgHxuaZdE4Gy0sO3NKSXjYyRT3Kq8b5.sWVy', 'active'),
(1232001041, 1231, 'Muhammad Faalih', '1232001041@student.bakrie.ac.id', '083167282880', '$2a$10$w3cn9/iWcSFXDsQLz4ecY.mWyddnLoJjiPHjHEWkiUASNcipmK/qq', 'active'),
(1232001044, 1231, 'Aditya Novadianto Pratama', '1232001044@student.bakrie.ac.id', '081292193758', '$2a$10$ObbloBrnMFP3AI4LYeycrO/Cx6wr3DmPWiuiop3QwE35FykCH7pgG', 'active'),
(1232001046, 1231, 'Dinda Nuraini', '1232001046@student.bakrie.ac.id', '085710201820', '$2a$10$lzV33qvrQpiiixPT6q0U/OB7tEOCv4sGnrSpfnt2RjmherXzU7b2.', 'active');

-- --------------------------------------------------------

--
-- Table structure for table `item`
--

CREATE TABLE `item` (
  `item_id` int(11) NOT NULL,
  `finder_nim` int(11) DEFAULT NULL,
  `manage_nip` int(11) DEFAULT NULL,
  `category_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `found_location` varchar(255) NOT NULL,
  `is_sensitive` tinyint(1) NOT NULL,
  `found_date` date NOT NULL,
  `image_path` varchar(255) NOT NULL,
  `status` enum('pending','secured','claimed','donated') NOT NULL
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
(16, 1232001011, 2314, 3, 'Indomie', 'Indomie Goreng rasa sate', 'Kost Toriq', 0, '2026-06-11', 'public/uploads/1781196640680-658356379.jpg', 'secured');

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
-- Indexes for table `university`
--
ALTER TABLE `university`
  ADD PRIMARY KEY (`univ_id`),
  ADD UNIQUE KEY `univ_id` (`univ_id`);

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
  MODIFY `claim_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `general_user`
--
ALTER TABLE `general_user`
  MODIFY `nim` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1232001047;

--
-- AUTO_INCREMENT for table `item`
--
ALTER TABLE `item`
  MODIFY `item_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

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
  ADD CONSTRAINT `claim_fk3` FOREIGN KEY (`item_id`) REFERENCES `item` (`item_id`);

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
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
