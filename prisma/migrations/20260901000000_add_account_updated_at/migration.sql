ALTER TABLE `cuentascompletas`
  ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
  ON UPDATE CURRENT_TIMESTAMP(3),
  ADD INDEX `cuentascompletas_updatedAt_idx` (`updatedAt`);

ALTER TABLE `pantallas`
  ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
  ON UPDATE CURRENT_TIMESTAMP(3),
  ADD INDEX `pantallas_updatedAt_idx` (`updatedAt`);
