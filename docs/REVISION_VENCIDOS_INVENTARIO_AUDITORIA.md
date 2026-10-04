# Revisión de Vencidos, Inventario y Auditoría

## Hallazgos

- La eliminación definitiva ya usaba `deleteEmails` para borrar las relaciones del correo en pantallas, cuentas compartidas, cuentas completas e inventario, y limpiar clientes sin relaciones.
- El envío a Inventario y el borrado por ID eran peticiones separadas. El borrado por ID además llamaba a `archiveDeletedAccount`, incluso cuando la cuenta se conservaba en Inventario.
- La auditoría definitiva tenía una identidad por correo: acumulaba distintas claves en una fila y mostraba una sola clave principal.
- El prechequeo individual del borrado masivo no detectaba que la selección podía contener todas las relaciones restantes.

## Corrección

Vencidos usa `/api/cuentasvencidas/delete` tanto individualmente como para selecciones. El servidor consulta los datos actuales y resuelve el destino dentro de una transacción SERIALIZABLE; la decisión no depende del chequeo previo del navegador. El criterio de último registro sigue siendo correo normalizado + plataforma + tipo (pantalla o cuenta completa).

La selección que contiene la última relación conserva una existencia de Inventario por plataforma y correo, con la clave original. Se eliminan las demás relaciones del correo y los clientes que ya no tienen relaciones. Las combinaciones correo + clave conservadas en Inventario no producen una nueva auditoría. Las demás combinaciones eliminadas definitivamente conservan plataforma, identificadores, fecha, actor y datos originales.

La auditoría usa una identidad SHA-256 del correo normalizado y la clave exacta, protegida por un índice único. Repetir una petición no crea un segundo registro. Una cuenta recreada con otra clave tiene una identidad diferente. Si se recrea con la misma clave, conserva la fila de auditoría y añade el evento real de la nueva eliminación.

La actualización de caches y la revisión persistente se aplican también al envío a Inventario. En la misma sesión y entre pestañas se avisa tras la confirmación del servidor; otros dispositivos consultan la revisión cada 15 segundos o al recuperar el foco. Por tanto, no hay una garantía de actualización instantánea entre dispositivos.

## Historial y aplicación

La migración `20261004020000_audit_email_password` modifica únicamente el esquema: agrega la identidad y su índice único y permite varias claves por correo. No borra ni separa las filas históricas. Las filas anteriores mantienen una identidad NULL hasta que la aplicación encuentra una nueva eliminación de su misma clave principal y les asigna su identidad, conservando sus instantáneas. Los registros históricos agregados no se convierten retrospectivamente en una fila por clave.

No se ha ejecutado ninguna migración ni consultado una base real en esta revisión. Antes de desplegar este código deben aplicarse las migraciones pendientes con `npx prisma migrate deploy` y comprobarse el flujo en una base de pruebas.

## Validación

- 42 pruebas automatizadas aprobadas: eliminación global, último registro de ambos tipos, selección de todas las relaciones, claves exactas, reintentos, historial anterior y rollback ante fallos.
- TypeScript y lint de los archivos nuevos aprobados; el build termina correctamente con advertencias existentes del proyecto.
- Esquema Prisma válido y cliente regenerado.
- Prueba de navegador aprobada: eliminación definitiva desde Vencidos, vistas con caches, segunda pestaña, filtros y detalles de Auditoría, vista móvil y conservación de la última cuenta en Inventario sin nueva auditoría.
- Las pruebas utilizan adaptadores o APIs simuladas; no sustituyen la validación de las migraciones y bloqueos en MySQL real.
