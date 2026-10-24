USE trustfound;

-- Migration: Generalize all admin roles into Admin_BEM and remove other admin roles
-- Author: Backend Engineer
-- Date: 2026-10-20

-- 1. Modify column temporarily to VARCHAR to allow updating existing records without ENUM truncation error
ALTER TABLE `admin` 
  MODIFY COLUMN `role` VARCHAR(50) NOT NULL DEFAULT 'Admin_BEM';

-- 2. Update existing admin records with legacy roles ('super_admin', 'admin', 'satpam', 'Admin_BEM') to 'Admin_BEM'
UPDATE `admin` 
SET `role` = 'Admin_BEM' 
WHERE `role` IN ('super_admin', 'admin', 'satpam', 'Admin_BEM') OR `role` IS NULL;

-- 3. Alter role column to ENUM strictly containing only 'Admin_BEM'
ALTER TABLE `admin` 
  MODIFY COLUMN `role` ENUM('Admin_BEM') NOT NULL DEFAULT 'Admin_BEM';
