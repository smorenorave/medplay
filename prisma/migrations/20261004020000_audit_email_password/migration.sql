-- Schema only: preserve all historical rows and snapshots without rewriting data.
-- Legacy rows keep NULL; the application claims their key on the next matching deletion.
-- New audits always supply an identity for normalized email + exact password.
ALTER TABLE `emailDeletionAudit`
  ADD COLUMN `dedupeKey` CHAR(64) NULL,
  ADD UNIQUE INDEX `emailDeletionAudit_dedupeKey_key` (`dedupeKey`),
  ADD INDEX `emailDeletionAudit_correo_idx` (`correo`),
  DROP INDEX `emailDeletionAudit_correo_key`;
