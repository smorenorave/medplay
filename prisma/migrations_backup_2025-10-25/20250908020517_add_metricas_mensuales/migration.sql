/*
  Warnings:

  - You are about to drop the `monthlydaily` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `monthlydailyplatform` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `monthlymetric` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `monthlyplatform` table. If the table is not empty, all the data it contains will be lost.

  Note: This migration file was adjusted to be idempotent (safe to run even if old tables or foreign keys are missing),
  fixing Prisma shadow DB errors like P3006 / P3018 during migration.
*/

-- ============================================================
-- SAFE DROPS (avoid errors if old tables or FKs are missing)
-- ============================================================

-- Drop old tables if they exist (with cascade of their internal FKs)
DROP TABLE IF EXISTS `monthlydaily`;
DROP TABLE IF EXISTS `monthlydailyplatform`;
DROP TABLE IF EXISTS `monthlymetric`;
DROP TABLE IF EXISTS `monthlyplatform`;

-- ============================================================
-- CREATE NEW TABLE
-- ============================================================

CREATE TABLE `MetricasMensuales` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `year` INTEGER NOT NULL,
    `month` INTEGER NOT NULL,
    `periodLabel` VARCHAR(191) NOT NULL,
    `totalGeneral` DECIMAL(16, 2) NOT NULL,
    `totalPantallas` DECIMAL(16, 2) NOT NULL,
    `totalCuentas` DECIMAL(16, 2) NOT NULL,
    `ventasCantidad` INTEGER NOT NULL,
    `clientesActivos` INTEGER NOT NULL,
    `ranking` JSON NOT NULL,
    `ventasDias` JSON NOT NULL,
    `payload` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MetricasMensuales_periodLabel_idx`(`periodLabel`),
    UNIQUE INDEX `MetricasMensuales_year_month_key`(`year`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

