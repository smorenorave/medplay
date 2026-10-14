# Eliminación de vencidos al cambiar contraseña

## Regla

En los editores de Vencimientos, Pantallas y Cuentas completas, cambiar realmente la contraseña de una asignación vencida elimina de `pantallas` y `cuentascompletas` todas las asignaciones vencidas del mismo correo normalizado (`LOWER(TRIM(correo))`), incluyendo otras plataformas. No se compara la contraseña anterior para seleccionar los asociados.

Vencido significa fecha anterior al día actual de Bogotá, no el campo `estado`. Hoy, fechas futuras y fechas nulas se conservan. Si el mismo guardado renueva el registro o lo cambia de correo, no se dispara la limpieza. Guardar sin cambiar contraseña tampoco la dispara.

Las contraseñas siguen sincronizándose con el alcance existente de plataforma + correo. La eliminación tiene el alcance por correo solicitado, independientemente de plataforma. Los contactos (`usuarios`), inventario y cuentas compartidas padre se conservan; no se ejecutan cascadas que puedan borrar servicios vigentes. Una cuenta compartida vacía puede seguir existiendo con la nueva contraseña.

## Implementación

- `lib/passwordExpiryCleanup.ts`: envuelve el guardado existente y la limpieza en una transacción Serializable; consultas parametrizadas, fechas de Bogotá, auditoría por registro y revisión de caché. Cualquier error revierte tanto el guardado como los borrados. Un conflicto concurrente puede rechazar el guardado; no queda un lote parcial.
- `src/app/api/cuentascompletas/[id]/route.ts` y `src/app/api/pantallas/[id]/route.ts`: usan esa transacción en PATCH/PUT y comunican el resultado confirmado mediante `X-Expired-Records-Deleted`. Se evita además borrar un contacto que todavía tiene pantallas al reasignar una cuenta completa.
- `lib/passwordExpiryClient.ts` y los tres viewers: invalidan cachés y recargan desde el servidor después de la eliminación; no reinsertan la fila editada.
- `lib/passwordChanges.ts`: mantiene la cola de cambios de contraseña, sin crear marcas de ocultación. Las marcas históricas ya no ocultan filas.

La auditoría de eliminaciones existente conserva una copia recuperable, como en la eliminación manual. Los registros desaparecen físicamente de las tablas operativas; no se trata de un estado oculto.

## Comprobación

En una base de pruebas, crear tres servicios con el mismo correo, dos con vencimiento de ayer y uno futuro. Incluir variantes de mayúsculas y espacios, y otro correo vencido de control. Cambiar la clave de uno de los dos vencidos sin renovar sus fechas. Sólo debe quedar el servicio vigente del mismo correo; el correo de control debe permanecer. Recargar las tres vistas y repetir la consulta SQL. Si los tres servicios están vencidos, ninguno debe quedar en las tablas operativas.

Consulta de lectura antes y después (reemplazar el correo ficticio):

```sql
SET @correo = LOWER(TRIM('prueba@example.com'));
SELECT 'completa' AS tipo, CAST(id AS CHAR) AS id, correo, fecha_vencimiento
FROM cuentascompletas WHERE LOWER(TRIM(correo)) = @correo
UNION ALL
SELECT 'pantalla', CAST(p.id AS CHAR), c.correo, p.fecha_vencimiento
FROM pantallas p JOIN cuentascompartidas c ON c.id = p.cuenta_id
WHERE LOWER(TRIM(c.correo)) = @correo;
```

No se aplicaron migraciones ni se probaron eliminaciones contra una base real. Las pruebas automatizadas transaccionales usan un adaptador en memoria; las pruebas de navegador simulan las API. La semántica de bloqueo de MySQL requiere verificación adicional en una base dedicada.

Verificación automatizada: 41 pruebas de lógica/regresión aprobadas; TypeScript sin errores y ESLint de los módulos nuevos sin errores. Edge: guardado y recarga aprobados en Cuentas completas, Pantallas y Vencimientos (ambos tipos), con APIs simuladas.
