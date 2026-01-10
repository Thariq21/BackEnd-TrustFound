-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Jan 07, 2026 at 03:40 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

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
  `processed_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `claim`
--



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
(1232001011, 1231, 'Thariq Rahman', '1232001011@student.bakrie.ac.id', '0881024468406', '$2a$10$wnDg/2pKqyaBz0AK79y7lu3F3vIBwF9xCblpriKRTYraAzo9q0b/C', 'active'),
(1232001022, 1231, 'Muhammad Alfi Anfahsa', '1232001022@student.bakrie.ac.id', '08561022054', '$2a$10$zHcwcKGUDrXMHUvck95o5eVzLSoHDbPKZyOEcCOSmBVNBfBSEoFb.', 'active'),
(1232001032, 1231, 'Egbert Felica Wibianto', '1232001032@student.bakrie.ac.id', '085799335009', '$2a$10$T/Vtp/STML0ol/JfvV0Luehb/p9BfOHbFX2kgImCFNsdkHKck5LE2', 'active'),
(1232001033, 1231, 'Daffa Ibnu Abdillah', '1232001033@student.bakrie.ac.id', '089636315277', '$2a$10$VOFhliIgMP1KDAki.J3k6u3qwkKKnMfgc4jWlA6Qe6O/uXBnwXLju', 'active'),
(1232001041, 1231, 'Muhammad Faalih', '1232001041@student.bakrie.ac.id', '083167282880', '$2a$10$w3cn9/iWcSFXDsQLz4ecY.mWyddnLoJjiPHjHEWkiUASNcipmK/qq', 'active'),
(1232001044, 1231, 'Aditya Novadianto Pratama', '1232001044@student.bakrie.ac.id', '081292193758', '$2a$10$ObbloBrnMFP3AI4LYeycrO/Cx6wr3DmPWiuiop3QwE35FykCH7pgG', 'active');

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
  MODIFY `claim_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `general_user`
--
ALTER TABLE `general_user`
  MODIFY `nim` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1232001045;

--
-- AUTO_INCREMENT for table `item`
--
ALTER TABLE `item`
  MODIFY `item_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

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
