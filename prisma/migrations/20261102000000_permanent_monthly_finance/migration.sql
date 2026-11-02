-- Align legacy baseline column names only if canonical columns are absent. Values are preserved.
SET @finance_ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='cuentascompletas' AND COLUMN_NAME='total_pagado_completa') = 0, 'ALTER TABLE cuentascompletas CHANGE COLUMN total_pagado total_pagado_completa DECIMAL(18,2) NULL', 'SELECT 1');
PREPARE finance_stmt FROM @finance_ddl;
EXECUTE finance_stmt;
DEALLOCATE PREPARE finance_stmt;
SET @finance_ddl = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='cuentascompletas' AND COLUMN_NAME='total_pagado_proveedor_completa') = 0, 'ALTER TABLE cuentascompletas CHANGE COLUMN total_pagado_proveedor total_pagado_proveedor_completa DECIMAL(18,2) NULL', 'SELECT 1');
PREPARE finance_stmt FROM @finance_ddl;
EXECUTE finance_stmt;
DEALLOCATE PREPARE finance_stmt;
-- Additive migration: no current accounts or existing snapshots are modified.
CREATE TABLE financialCoverage (id INT PRIMARY KEY, startedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), firstCompleteMonth CHAR(7) NOT NULL);
INSERT INTO financialCoverage (id, firstCompleteMonth) VALUES (1, DATE_FORMAT(DATE_ADD(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-05:00'), INTERVAL 1 MONTH), '%Y-%m'));
CREATE TABLE financialSale (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 tipo CHAR(1) NOT NULL, sourceId VARCHAR(64) NOT NULL, fecha DATE NOT NULL,
 vence DATE NULL, contacto VARCHAR(191) NOT NULL, plataformaId INT NULL,
 plataforma VARCHAR(100) NOT NULL, ingreso DECIMAL(18,2) NOT NULL, costo DECIMAL(18,2) NOT NULL,
 unidades INT NOT NULL DEFAULT 1, provenance VARCHAR(32) NOT NULL DEFAULT 'trigger',
 saleKey VARCHAR(128) NULL UNIQUE, createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 INDEX financialSale_fecha (fecha), INDEX financialSale_contacto (contacto, vence)
);
CREATE TABLE monthlyCloseLog (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, periodLabel CHAR(7) NOT NULL,
 status VARCHAR(24) NOT NULL, result TEXT NOT NULL,
 createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), INDEX monthlyCloseLog_period (periodLabel, createdAt)
);
CREATE TABLE monthlySnapshotRevision (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, periodLabel CHAR(7) NOT NULL,
 actor VARCHAR(100) NOT NULL, reason TEXT NOT NULL, evidence TEXT NOT NULL,
 replacement JSON NOT NULL, createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 INDEX monthlySnapshotRevision_period (periodLabel, id)
);
-- The previous application persisted caches for open/future months. Keep their
-- rows intact but never misrepresent them as completed historical closes.
INSERT INTO monthlyCloseLog (periodLabel,status,result)
 SELECT periodLabel,'unclosed_legacy','Cache de período abierto conservado; requiere cierre íntegro o conciliación verificable'
 FROM metricasmensuales
 WHERE periodLabel >= DATE_FORMAT(CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','-05:00'),'%Y-%m');
INSERT INTO financialSale (tipo,sourceId,fecha,vence,contacto,plataformaId,plataforma,ingreso,costo,provenance,saleKey)
 SELECT 'P',r.id,r.fecha_compra,r.fecha_vencimiento,r.contacto,c.plataforma_id,COALESCE(p.nombre,'Sin plataforma'),COALESCE(r.total_pagado,0),COALESCE(r.total_pagado_proveedor,0),'baseline-partial',CONCAT('P:',r.id,':',r.fecha_compra)
 FROM pantallas r JOIN cuentascompartidas c ON c.id = r.cuenta_id LEFT JOIN plataformas p ON p.id = c.plataforma_id WHERE r.fecha_compra IS NOT NULL;
CREATE TRIGGER finance_P_insert AFTER INSERT ON pantallas FOR EACH ROW
BEGIN
 DECLARE v_pid INT DEFAULT NULL;
 DECLARE v_name VARCHAR(100) DEFAULT 'Sin plataforma';
 SELECT p.id,p.nombre INTO v_pid,v_name FROM cuentascompartidas c LEFT JOIN plataformas p ON p.id=c.plataforma_id WHERE c.id=NEW.cuenta_id;
 IF NEW.fecha_compra IS NOT NULL THEN
  INSERT IGNORE INTO financialSale (tipo,sourceId,fecha,vence,contacto,plataformaId,plataforma,ingreso,costo,saleKey)
  VALUES ('P',NEW.id,NEW.fecha_compra,NEW.fecha_vencimiento,NEW.contacto,v_pid,COALESCE(v_name,'Sin plataforma'),COALESCE(NEW.total_pagado,0),COALESCE(NEW.total_pagado_proveedor,0),CONCAT('P:',NEW.id,':',NEW.fecha_compra));
 END IF;
END;
CREATE TRIGGER finance_P_update AFTER UPDATE ON pantallas FOR EACH ROW
BEGIN
 DECLARE v_pid INT DEFAULT NULL;
 DECLARE v_name VARCHAR(100) DEFAULT 'Sin plataforma';
 SELECT p.id,p.nombre INTO v_pid,v_name FROM cuentascompartidas c LEFT JOIN plataformas p ON p.id=c.plataforma_id WHERE c.id=NEW.cuenta_id;
 IF NEW.fecha_compra IS NOT NULL AND NOT (OLD.fecha_compra <=> NEW.fecha_compra) THEN
  INSERT IGNORE INTO financialSale (tipo,sourceId,fecha,vence,contacto,plataformaId,plataforma,ingreso,costo,saleKey)
  VALUES ('P',NEW.id,NEW.fecha_compra,NEW.fecha_vencimiento,NEW.contacto,v_pid,COALESCE(v_name,'Sin plataforma'),COALESCE(NEW.total_pagado,0),COALESCE(NEW.total_pagado_proveedor,0),CONCAT('P:',NEW.id,':',NEW.fecha_compra));
 END IF;
IF (OLD.fecha_compra <=> NEW.fecha_compra) AND DATE_FORMAT(NEW.fecha_compra,'%Y-%m') = DATE_FORMAT(CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','-05:00'),'%Y-%m')
 AND (NOT (OLD.total_pagado <=> NEW.total_pagado) OR NOT (OLD.total_pagado_proveedor <=> NEW.total_pagado_proveedor)) THEN
  INSERT INTO financialSale (tipo,sourceId,fecha,vence,contacto,plataformaId,plataforma,ingreso,costo,unidades,provenance)
  VALUES ('P',NEW.id,NEW.fecha_compra,NEW.fecha_vencimiento,NEW.contacto,v_pid,COALESCE(v_name,'Sin plataforma'),COALESCE(NEW.total_pagado,0)-COALESCE(OLD.total_pagado,0),COALESCE(NEW.total_pagado_proveedor,0)-COALESCE(OLD.total_pagado_proveedor,0),0,'adjustment');
 END IF;
END;
INSERT INTO financialSale (tipo,sourceId,fecha,vence,contacto,plataformaId,plataforma,ingreso,costo,provenance,saleKey)
 SELECT 'C',r.id,r.fecha_compra,r.fecha_vencimiento,r.contacto,r.plataforma_id,COALESCE(p.nombre,'Sin plataforma'),COALESCE(r.total_pagado_completa,0),COALESCE(r.total_pagado_proveedor_completa,0),'baseline-partial',CONCAT('C:',r.id,':',r.fecha_compra)
 FROM cuentascompletas r LEFT JOIN plataformas p ON p.id = r.plataforma_id WHERE r.fecha_compra IS NOT NULL;
CREATE TRIGGER finance_C_insert AFTER INSERT ON cuentascompletas FOR EACH ROW
BEGIN
 DECLARE v_pid INT DEFAULT NULL;
 DECLARE v_name VARCHAR(100) DEFAULT 'Sin plataforma';
 SELECT id,nombre INTO v_pid,v_name FROM plataformas WHERE id=NEW.plataforma_id;
 IF NEW.fecha_compra IS NOT NULL THEN
  INSERT IGNORE INTO financialSale (tipo,sourceId,fecha,vence,contacto,plataformaId,plataforma,ingreso,costo,saleKey)
  VALUES ('C',NEW.id,NEW.fecha_compra,NEW.fecha_vencimiento,NEW.contacto,v_pid,COALESCE(v_name,'Sin plataforma'),COALESCE(NEW.total_pagado_completa,0),COALESCE(NEW.total_pagado_proveedor_completa,0),CONCAT('C:',NEW.id,':',NEW.fecha_compra));
 END IF;
END;
CREATE TRIGGER finance_C_update AFTER UPDATE ON cuentascompletas FOR EACH ROW
BEGIN
 DECLARE v_pid INT DEFAULT NULL;
 DECLARE v_name VARCHAR(100) DEFAULT 'Sin plataforma';
 SELECT id,nombre INTO v_pid,v_name FROM plataformas WHERE id=NEW.plataforma_id;
 IF NEW.fecha_compra IS NOT NULL AND NOT (OLD.fecha_compra <=> NEW.fecha_compra) THEN
  INSERT IGNORE INTO financialSale (tipo,sourceId,fecha,vence,contacto,plataformaId,plataforma,ingreso,costo,saleKey)
  VALUES ('C',NEW.id,NEW.fecha_compra,NEW.fecha_vencimiento,NEW.contacto,v_pid,COALESCE(v_name,'Sin plataforma'),COALESCE(NEW.total_pagado_completa,0),COALESCE(NEW.total_pagado_proveedor_completa,0),CONCAT('C:',NEW.id,':',NEW.fecha_compra));
 END IF;
IF (OLD.fecha_compra <=> NEW.fecha_compra) AND DATE_FORMAT(NEW.fecha_compra,'%Y-%m') = DATE_FORMAT(CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','-05:00'),'%Y-%m')
 AND (NOT (OLD.total_pagado_completa <=> NEW.total_pagado_completa) OR NOT (OLD.total_pagado_proveedor_completa <=> NEW.total_pagado_proveedor_completa)) THEN
  INSERT INTO financialSale (tipo,sourceId,fecha,vence,contacto,plataformaId,plataforma,ingreso,costo,unidades,provenance)
  VALUES ('C',NEW.id,NEW.fecha_compra,NEW.fecha_vencimiento,NEW.contacto,v_pid,COALESCE(v_name,'Sin plataforma'),COALESCE(NEW.total_pagado_completa,0)-COALESCE(OLD.total_pagado_completa,0),COALESCE(NEW.total_pagado_proveedor_completa,0)-COALESCE(OLD.total_pagado_proveedor_completa,0),0,'adjustment');
 END IF;
END;
CREATE TRIGGER protect_financialSale_update BEFORE UPDATE ON financialSale FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Permanent financial record: use an audited revision';
CREATE TRIGGER protect_financialSale_delete BEFORE DELETE ON financialSale FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Permanent financial record: use an audited revision';
CREATE TRIGGER protect_monthlySnapshotRevision_update BEFORE UPDATE ON monthlySnapshotRevision FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Permanent financial record: use an audited revision';
CREATE TRIGGER protect_monthlySnapshotRevision_delete BEFORE DELETE ON monthlySnapshotRevision FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Permanent financial record: use an audited revision';
CREATE TRIGGER protect_metricasmensuales_update BEFORE UPDATE ON metricasmensuales FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Permanent financial record: use an audited revision';
CREATE TRIGGER protect_metricasmensuales_delete BEFORE DELETE ON metricasmensuales FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Permanent financial record: use an audited revision';
CREATE TRIGGER protect_monthlyCloseLog_update BEFORE UPDATE ON monthlyCloseLog FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Permanent financial record: use an audited revision';
CREATE TRIGGER protect_monthlyCloseLog_delete BEFORE DELETE ON monthlyCloseLog FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Permanent financial record: use an audited revision';
CREATE TRIGGER protect_financialCoverage_update BEFORE UPDATE ON financialCoverage FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Permanent financial record: use an audited revision';
CREATE TRIGGER protect_financialCoverage_delete BEFORE DELETE ON financialCoverage FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Permanent financial record: use an audited revision';
