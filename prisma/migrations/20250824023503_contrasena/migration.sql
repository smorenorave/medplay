/*
  Warnings:

  - Made the column `nro_pantalla` on table `pantallas` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `pantallas` MODIFY `nro_pantalla` VARCHAR(50) NOT NULL;
