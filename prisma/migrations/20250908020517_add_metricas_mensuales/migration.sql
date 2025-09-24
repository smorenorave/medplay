/*
  Warnings:

  - You are about to drop the `monthlydaily` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `monthlydailyplatform` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `monthlymetric` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `monthlyplatform` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `monthlydaily` DROP FOREIGN KEY `MonthlyDaily_metricId_fkey`;

-- DropForeignKey
ALTER TABLE `monthlydailyplatform` DROP FOREIGN KEY `MonthlyDailyPlatform_metricId_fkey`;

-- DropForeignKey
ALTER TABLE `monthlyplatform` DROP FOREIGN KEY `MonthlyPlatform_metricId_fkey`;

-- DropTable
DROP TABLE `monthlydaily`;

-- DropTable
DROP TABLE `monthlydailyplatform`;

-- DropTable
DROP TABLE `monthlymetric`;

-- DropTable
DROP TABLE `monthlyplatform`;

-- CreateTable
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
