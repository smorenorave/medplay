-- CreateTable
CREATE TABLE `cuentascompartidas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `correo` VARCHAR(100) NOT NULL,
    `contrasena` VARCHAR(100) NOT NULL,
    `proveedor` VARCHAR(50) NULL,
    `plataforma_id` INTEGER NULL,

    UNIQUE INDEX `correo`(`correo`),
    INDEX `fk_plataforma`(`plataforma_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cuentascompletas` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `contacto` VARCHAR(50) NOT NULL,
    `plataforma_id` INTEGER NOT NULL,
    `proveedor` VARCHAR(64) NULL,
    `fecha_compra` DATE NULL,
    `fecha_vencimiento` DATE NULL,
    `meses_pagados` INTEGER NULL,
    `total_pagado` DECIMAL(12, 2) NULL,
    `estado` VARCHAR(20) NULL,
    `comentario` TEXT NULL,

    INDEX `idx_contacto`(`contacto`),
    INDEX `idx_plataforma_id`(`plataforma_id`),
    INDEX `idx_proveedor`(`proveedor`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pantallas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cuenta_id` INTEGER NOT NULL,
    `contacto` VARCHAR(50) NOT NULL,
    `nro_pantalla` INTEGER NULL,
    `fecha_compra` DATE NOT NULL,
    `fecha_vencimiento` DATE NOT NULL,
    `meses_pagados` INTEGER NULL DEFAULT 0,
    `total_pagado` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `estado` VARCHAR(20) NOT NULL,
    `comentario` TEXT NULL,

    INDEX `fk_pantalla_contacto`(`contacto`),
    INDEX `fk_pantalla_cuenta`(`cuenta_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plataformas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,

    UNIQUE INDEX `nombre`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usuarios` (
    `contacto` VARCHAR(50) NOT NULL,
    `nombre` VARCHAR(100) NULL,

    UNIQUE INDEX `contacto_UNIQUE`(`contacto`),
    PRIMARY KEY (`contacto`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `cuentascompartidas` ADD CONSTRAINT `fk_plataforma` FOREIGN KEY (`plataforma_id`) REFERENCES `plataformas`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `cuentascompletas` ADD CONSTRAINT `fk_cc_plataformas_id` FOREIGN KEY (`plataforma_id`) REFERENCES `plataformas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cuentascompletas` ADD CONSTRAINT `fk_cc_usuarios_contacto` FOREIGN KEY (`contacto`) REFERENCES `usuarios`(`contacto`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pantallas` ADD CONSTRAINT `fk_pantalla_contacto` FOREIGN KEY (`contacto`) REFERENCES `usuarios`(`contacto`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pantallas` ADD CONSTRAINT `fk_pantalla_cuenta` FOREIGN KEY (`cuenta_id`) REFERENCES `cuentascompartidas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
