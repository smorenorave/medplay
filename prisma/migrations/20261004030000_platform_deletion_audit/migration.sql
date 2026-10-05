-- Preserve the existing audit behavior until an administrator changes a platform.
ALTER TABLE `plataformas` ADD COLUMN `auditarEliminaciones` BOOLEAN NOT NULL DEFAULT true;
