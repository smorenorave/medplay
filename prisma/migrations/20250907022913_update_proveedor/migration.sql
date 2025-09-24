/*
  Warnings:

  - You are about to drop the column `total_pagado_proovedor` on the `cuentascompletas` table. All the data in the column will be lost.
  - You are about to drop the column `total_pagado_proovedor` on the `pantallas` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `cuentascompletas` DROP COLUMN `total_pagado_proovedor`,
    ADD COLUMN `total_pagado_proveedor` DECIMAL(18, 2) NULL;

-- AlterTable
ALTER TABLE `pantallas` DROP COLUMN `total_pagado_proovedor`,
    ADD COLUMN `total_pagado_proveedor` DECIMAL(18, 2) NULL;
