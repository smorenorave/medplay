CREATE TABLE `accountDataRevision` (
  `id` INTEGER NOT NULL,
  `revision` BIGINT NOT NULL DEFAULT 0,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `emailDeletionAudit` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `correo` VARCHAR(191) NOT NULL,
  `clave` VARCHAR(255) NULL,
  `claves` TEXT NOT NULL,
  `plataformas` JSON NOT NULL,
  `contactos` JSON NOT NULL,
  `registros` JSON NOT NULL,
  `identificadorOriginal` VARCHAR(255) NULL,
  `adminId` INTEGER NULL,
  `eliminadoPor` VARCHAR(100) NOT NULL,
  `motivo` TEXT NULL,
  `primeraEliminacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `fechaEliminacion` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `revision` BIGINT NOT NULL,
  UNIQUE INDEX `emailDeletionAudit_correo_key` (`correo`),
  INDEX `emailDeletionAudit_fechaEliminacion_id_idx` (`fechaEliminacion`, `id`),
  INDEX `emailDeletionAudit_revision_idx` (`revision`),
  INDEX `emailDeletionAudit_adminId_idx` (`adminId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `emailDeletionAudit_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
