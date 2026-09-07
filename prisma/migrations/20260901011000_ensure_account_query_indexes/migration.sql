SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'cuentascompletas' AND index_name = 'cuentascompletas_estado_vencimiento_idx') = 0,
  'CREATE INDEX `cuentascompletas_estado_vencimiento_idx` ON `cuentascompletas` (`estado`, `fecha_vencimiento`)',
  'SELECT 1'
);
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'cuentascompletas' AND index_name = 'cuentascompletas_plataforma_vencimiento_idx') = 0,
  'CREATE INDEX `cuentascompletas_plataforma_vencimiento_idx` ON `cuentascompletas` (`plataforma_id`, `fecha_vencimiento`)',
  'SELECT 1'
);
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;

SET @sql = IF(
  (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'pantallas' AND index_name = 'pantallas_estado_vencimiento_idx') = 0,
  'CREATE INDEX `pantallas_estado_vencimiento_idx` ON `pantallas` (`estado`, `fecha_vencimiento`)',
  'SELECT 1'
);
PREPARE statement FROM @sql; EXECUTE statement; DEALLOCATE PREPARE statement;
