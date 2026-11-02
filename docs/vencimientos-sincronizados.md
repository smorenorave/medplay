# Pantallas, cuentas completas y vencimientos

## Causa corregida

Vencimientos combinaba los listados operativos con `/api/password-managed-records`.
Estos últimos sobrescribían las filas con fechas ISO y luego se excluían por
`passwordManagedAt`. El cambio de contraseña conservaba las pantallas en la BD,
pero las retiraba del listado y los contadores de vencimientos. La validación
de fecha del listado también rechazaba los valores ISO.

## Comportamiento

- `GET /api/cuentasvencidas` lee las tablas operativas `pantallas` y
  `cuentascompletas`, con sus relaciones, en una transacción `RepeatableRead`.
- No utiliza el historial ni las marcas de gestión de contraseñas para decidir
  si existe una asignación. No hay límite de páginas que recorte los vencidos.
- Las columnas SQL `DATE` se serializan como `YYYY-MM-DD`; los IDs se conservan
  como cadenas para evitar pérdida de precisión en cuentas completas.
- La fecha civil se calcula con `America/Bogota`. Los grupos son anteriores,
  hoy, mañana y posteriores a mañana. Se actualizan al cambiar el día.
- Búsqueda, tipo y plataforma se aplican tanto a contadores como a filas. El
  selector de grupo sólo cambia el listado visible.
- Renovaciones y ediciones incrementan `accountDataRevision` en la misma
  transacción. Los avisos locales y entre pestañas invalidan las cachés; otras
  sesiones reciben el cambio mediante el sondeo de revisión existente.
- Las respuestas antiguas no pueden sobrescribir una actualización más reciente.

## Eliminación y finanzas

Ambas vistas utilizan `RecordDeletionDialog`, `/api/record-deletions` y la misma
eliminación transaccional por ID. Para pantallas, `pantallaDeletion` bloquea la
cuenta, verifica las dependencias, conserva una copia en el historial de
eliminados, borra únicamente la pantalla seleccionada e incrementa la revisión.
La cuenta padre sólo se elimina si se confirma ese destino y no tiene pantallas.
Enviar a inventario es una opción explícita diferente.

Cambiar contraseña no cancela ni elimina el servicio. Gestionar una contraseña
no equivale a descartar una alerta ni a eliminar definitivamente una pantalla.
La eliminación definitiva requiere la confirmación del diálogo y borra la fila
operativa, no sólo su alerta. No escribe ni elimina las tablas financieras
permanentes ni los cierres mensuales.

No hace falta migrar ni borrar datos para que reaparezcan las filas ocultadas:
la consulta corregida lee los registros existentes. Se conserva `passwordManagedAt`
como metadato de contraseña. Se debe desplegar servidor y cliente juntos.

## Verificación

Regresiones aisladas, sin utilizar datos de clientes:

```powershell
node --test tests/expiryStatus.test.cjs tests/pantallaDeletion.test.cjs tests/recordDeletion.test.cjs tests/passwordExpiryCleanup.test.cjs tests/accountDataChanges.test.cjs tests/monthlyFinance.test.cjs tests/expirationsSync.test.cjs
```

Prueba de navegador con API simulada, zona del navegador Tokio y fecha fija de
Bogotá: contadores, vencidos gestionados, próximos, cancelación del diálogo,
eliminación, cambio a Pantallas y recarga sin reaparición del registro.

```powershell
$env:MEDPLAY_NEXT_DIST_DIR = '.next-verify'
npm run build
node tests/expirationsSync.browser.cjs
```

Estas pruebas no constituyen una auditoría de los datos ni una ejecución contra
la base de producción. No se modificó la base de producción durante la corrección.
