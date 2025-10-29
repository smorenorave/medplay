-- CreateTable
CREATE TABLE `inventario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `plataforma_id` INTEGER NOT NULL,
    `correo` VARCHAR(191) NOT NULL,
    `clave` VARCHAR(191) NULL,

    INDEX `inventario_plataforma_id_idx`(`plataforma_id`),
    UNIQUE INDEX `inventario_plataforma_id_correo_key`(`plataforma_id`, `correo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `inventario` ADD CONSTRAINT `inventario_plataforma_id_fkey` FOREIGN KEY (`plataforma_id`) REFERENCES `plataformas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
