/*
  Warnings:

  - A unique constraint covering the columns `[correo]` on the table `cuentascompletas` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `contrasena` to the `cuentascompletas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `correo` to the `cuentascompletas` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `cuentascompletas` ADD COLUMN `contrasena` VARCHAR(100) NOT NULL,
    ADD COLUMN `correo` VARCHAR(100) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `correo` ON `cuentascompletas`(`correo`);
