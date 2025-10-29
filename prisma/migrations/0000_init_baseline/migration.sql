-- CreateTable
CREATE TABLE `cuentascompartidas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `correo` VARCHAR(100) NOT NULL,
    `contrasena` VARCHAR(100) NOT NULL,
    `proveedor` VARCHAR(50) NULL,
    `plataforma_id` INTEGER NULL,
    `cuenta_caida` BOOLEAN NOT NULL DEFAULT false,

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
    `total_pagado` DECIMAL(18, 2) NULL,
    `estado` VARCHAR(20) NULL,
    `comentario` TEXT NULL,
    `contrasena` VARCHAR(100) NOT NULL,
    `correo` VARCHAR(100) NOT NULL,
    `total_ganado` DECIMAL(18, 2) NULL,
    `total_pagado_proveedor` DECIMAL(18, 2) NULL,

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
    `nro_pantalla` VARCHAR(50) NOT NULL,
    `fecha_compra` DATE NOT NULL,
    `fecha_vencimiento` DATE NOT NULL,
    `meses_pagados` INTEGER NULL DEFAULT 0,
    `total_pagado` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `estado` VARCHAR(20) NOT NULL,
    `comentario` TEXT NULL,
    `total_ganado` DECIMAL(18, 2) NULL,
    `total_pagado_proveedor` DECIMAL(18, 2) NULL,

    INDEX `fk_pantalla_contacto`(`contacto`),
    INDEX `fk_pantalla_cuenta`(`cuenta_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plataformas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(100) NOT NULL,
    `cantidad_pantallas` INTEGER NOT NULL DEFAULT 0,

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

-- CreateTable
CREATE TABLE `wa_notificaciones` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `phone` VARCHAR(20) NOT NULL,
    `fecha` DATE NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `wa_notificaciones_phone_fecha_key`(`phone`, `fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wa_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `phone` VARCHAR(20) NOT NULL,
    `status` ENUM('OK', 'FALLBACK', 'ERROR') NOT NULL,
    `message` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

-- CreateTable
CREATE TABLE `metricasmensuales` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `year` INTEGER NOT NULL,
    `month` INTEGER NOT NULL,
    `periodLabel` VARCHAR(191) NOT NULL,
    `totalGeneral` DECIMAL(18, 2) NOT NULL,
    `totalPantallas` DECIMAL(18, 2) NOT NULL,
    `totalCuentas` DECIMAL(18, 2) NOT NULL,
    `ventasCantidad` INTEGER NOT NULL,
    `clientesActivos` INTEGER NOT NULL,
    `ranking` JSON NOT NULL,
    `ventasDias` JSON NOT NULL,
    `payload` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `metricasmensuales_year_month_key`(`year`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario` VARCHAR(100) NOT NULL,
    `contrasena` VARCHAR(255) NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `admin_usuario_key`(`usuario`),
    PRIMARY KEY (`id`)
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

-- AddForeignKey
ALTER TABLE `inventario` ADD CONSTRAINT `inventario_plataforma_id_fkey` FOREIGN KEY (`plataforma_id`) REFERENCES `plataformas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

