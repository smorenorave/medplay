-- `contacto` is both a primary/foreign key and must therefore use the same
-- textual type in all three tables. VARCHAR(191) remains fully indexable with
-- utf8mb4 while allowing phone numbers and WhatsApp usernames.
-- Existing values are preserved verbatim by these widening ALTERs. The
-- foreign keys are recreated because MySQL requires both sides to have an
-- identical type throughout the change.
ALTER TABLE `cuentascompletas`
  DROP FOREIGN KEY `fk_cc_usuarios_contacto`;

ALTER TABLE `pantallas`
  DROP FOREIGN KEY `fk_pantalla_contacto`;

ALTER TABLE `cuentascompletas`
  MODIFY `contacto` VARCHAR(191) NOT NULL;

ALTER TABLE `pantallas`
  MODIFY `contacto` VARCHAR(191) NOT NULL;

ALTER TABLE `usuarios`
  MODIFY `contacto` VARCHAR(191) NOT NULL;

ALTER TABLE `cuentascompletas`
  ADD CONSTRAINT `fk_cc_usuarios_contacto`
  FOREIGN KEY (`contacto`) REFERENCES `usuarios` (`contacto`)
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `pantallas`
  ADD CONSTRAINT `fk_pantalla_contacto`
  FOREIGN KEY (`contacto`) REFERENCES `usuarios` (`contacto`)
  ON DELETE CASCADE ON UPDATE CASCADE;
