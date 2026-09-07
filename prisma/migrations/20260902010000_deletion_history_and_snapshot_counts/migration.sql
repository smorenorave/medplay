ALTER TABLE `metricasmensuales`
  ADD COLUMN `pantallasVendidas` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `cuentasVendidas` INTEGER NOT NULL DEFAULT 0;

CREATE TABLE `deletedAccountHistory` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `dedupeKey` VARCHAR(255) NOT NULL,
  `plataformaId` INTEGER NULL,
  `plataforma` VARCHAR(100) NOT NULL,
  `correo` VARCHAR(191) NOT NULL,
  `clave` VARCHAR(255) NULL,
  `proveedor` VARCHAR(100) NULL,
  `tipoRegistro` VARCHAR(32) NOT NULL,
  `tipoEliminacion` VARCHAR(64) NOT NULL,
  `identificadorOriginal` VARCHAR(64) NULL,
  `eliminadoPorAdminId` INTEGER NULL,
  `datosRecuperacion` JSON NULL,
  `cantidadEliminaciones` INTEGER NOT NULL DEFAULT 1,
  `primeraEliminacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `ultimaEliminacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `deletedAccountHistory_dedupeKey_key` (`dedupeKey`),
  INDEX `deletedAccountHistory_plataformaId_correo_idx` (`plataformaId`, `correo`),
  INDEX `deletedAccountHistory_ultimaEliminacion_idx` (`ultimaEliminacion`),
  INDEX `deletedAccountHistory_admin_fecha_idx` (`eliminadoPorAdminId`, `ultimaEliminacion`),
  PRIMARY KEY (`id`),
  CONSTRAINT `deletedAccountHistory_eliminadoPorAdminId_fkey`
    FOREIGN KEY (`eliminadoPorAdminId`) REFERENCES `admin` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
