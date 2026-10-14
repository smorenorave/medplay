-- Logical management state; original records and all financial data stay intact.
ALTER TABLE `cuentascompletas` ADD COLUMN `passwordManagedAt` DATETIME(3) NULL;
ALTER TABLE `pantallas` ADD COLUMN `passwordManagedAt` DATETIME(3) NULL;
