ALTER TABLE `admin`
  ADD COLUMN `email` VARCHAR(191) NULL,
  ADD UNIQUE INDEX `admin_email_key` (`email`);

UPDATE `admin`
SET `email` = LOWER(TRIM(`usuario`))
WHERE `usuario` REGEXP '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$';

CREATE TABLE `adminPasswordResetToken` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `adminId` INTEGER NOT NULL,
  `tokenHash` CHAR(64) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `usedAt` DATETIME(3) NULL,
  `requestedIp` VARCHAR(64) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `adminPasswordResetToken_tokenHash_key` (`tokenHash`),
  INDEX `adminPasswordResetToken_adminId_expiresAt_idx` (`adminId`, `expiresAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `adminPasswordResetToken_adminId_fkey`
    FOREIGN KEY (`adminId`) REFERENCES `admin` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `adminSecurityEvent` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `adminId` INTEGER NULL,
  `eventType` VARCHAR(64) NOT NULL,
  `success` BOOLEAN NOT NULL,
  `ip` VARCHAR(64) NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `adminSecurityEvent_adminId_createdAt_idx` (`adminId`, `createdAt`),
  INDEX `adminSecurityEvent_eventType_createdAt_idx` (`eventType`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `adminSecurityEvent_adminId_fkey`
    FOREIGN KEY (`adminId`) REFERENCES `admin` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
