/*
  Warnings:

  - You are about to alter the column `total_pagado` on the `cuentascompletas` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Decimal(18,2)`.

*/
-- AlterTable
ALTER TABLE `cuentascompletas` ADD COLUMN `total_ganado` DECIMAL(18, 2) NULL,
    ADD COLUMN `total_pagado_proovedor` DECIMAL(18, 2) NULL,
    MODIFY `total_pagado` DECIMAL(18, 2) NULL;

-- AlterTable
ALTER TABLE `pantallas` ADD COLUMN `total_ganado` DECIMAL(18, 2) NULL,
    ADD COLUMN `total_pagado_proovedor` DECIMAL(18, 2) NULL;

-- CreateTable
CREATE TABLE `MonthlyMetric` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `year` INTEGER NOT NULL,
    `month` INTEGER NOT NULL,
    `totalGeneral` DECIMAL(18, 2) NOT NULL,
    `totalPantallas` DECIMAL(18, 2) NOT NULL,
    `totalCompletas` DECIMAL(18, 2) NOT NULL,
    `ventasCantidad` INTEGER NOT NULL,
    `activosTotal` INTEGER NOT NULL,
    `activosPantallas` INTEGER NOT NULL,
    `activosCompletas` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MonthlyMetric_year_month_idx`(`year`, `month`),
    UNIQUE INDEX `MonthlyMetric_year_month_key`(`year`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MonthlyDaily` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `metricId` INTEGER NOT NULL,
    `day` INTEGER NOT NULL,
    `total` DECIMAL(18, 2) NOT NULL,
    `pantallas` DECIMAL(18, 2) NOT NULL,
    `completas` DECIMAL(18, 2) NOT NULL,

    UNIQUE INDEX `MonthlyDaily_metricId_day_key`(`metricId`, `day`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MonthlyPlatform` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `metricId` INTEGER NOT NULL,
    `platformId` INTEGER NOT NULL,
    `platform` VARCHAR(191) NOT NULL,
    `unidades` INTEGER NOT NULL,
    `total` DECIMAL(18, 2) NOT NULL,

    INDEX `MonthlyPlatform_platformId_idx`(`platformId`),
    UNIQUE INDEX `MonthlyPlatform_metricId_platformId_key`(`metricId`, `platformId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MonthlyDailyPlatform` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `metricId` INTEGER NOT NULL,
    `platformId` INTEGER NOT NULL,
    `day` INTEGER NOT NULL,
    `totalPantallas` DECIMAL(18, 2) NOT NULL,
    `totalCompletas` DECIMAL(18, 2) NOT NULL,

    INDEX `MonthlyDailyPlatform_platformId_day_idx`(`platformId`, `day`),
    UNIQUE INDEX `MonthlyDailyPlatform_metricId_platformId_day_key`(`metricId`, `platformId`, `day`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MonthlyDaily` ADD CONSTRAINT `MonthlyDaily_metricId_fkey` FOREIGN KEY (`metricId`) REFERENCES `MonthlyMetric`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MonthlyPlatform` ADD CONSTRAINT `MonthlyPlatform_metricId_fkey` FOREIGN KEY (`metricId`) REFERENCES `MonthlyMetric`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MonthlyDailyPlatform` ADD CONSTRAINT `MonthlyDailyPlatform_metricId_fkey` FOREIGN KEY (`metricId`) REFERENCES `MonthlyMetric`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
