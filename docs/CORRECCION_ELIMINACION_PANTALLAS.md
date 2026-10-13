# Eliminación individual de pantallas — 13 de octubre de 2026

## Origen verificado

El commit `1001aeddf21542aeafa00c943edac8eb5932a5ec` (4 de octubre de 2026,
“Fix expired account deletion, inventory preservation and credential audit”)
introdujo `deleteEmailsGlobally([victimCorreo], ...)` en `doDelete(false)` y la
misma operación por correos en `runBulk(false)` de `PantallasViewer.tsx`.
Antes, la papelera llamaba a `DELETE /api/pantallas/{id}`. El commit `7b63e79`
añadió la revisión y confirmación global, pero no originó el cambio de alcance.
Esto se verificó con `git log` y `git show`; no permite atribuir una intención
distinta de la descrita en los commits.

## Corrección

- `src/components/viewers/PantallasViewer.tsx`: papelera conserva ID de asignación;
  consulta al servidor por ID, muestra la decisión apropiada y envía ID de cuenta
  y acción. Eliminación múltiple procesa exclusivamente los IDs seleccionados,
  vuelve a comprobar su pertenencia y comunica fallos por operación. No importa
  ni invoca la eliminación global. Cancelar no envía DELETE.
- `src/app/api/pantallas/[id]/route.ts`: autenticación de administrador en consulta
  de eliminación y DELETE; cuerpo estricto `{cuentaId, action}`; las solicitudes
  antiguas sin decisión fallan sin modificar datos.
- `lib/pantallaDeletion.ts`: consulta y eliminación transaccionales con aislamiento
  Serializable, bloqueo del padre por ID y reintentos limitados ante conflictos.
  Cuenta TODAS las asignaciones de ese padre, no solo filas visibles, activas o
  agrupadas por correo. El DELETE exige ID de pantalla y cuenta_id. Una decisión
  obsoleta se rechaza y exige volver a revisar.
- Pantalla intermedia: retira solo esa asignación, liberando su posición.
- Última asignación, inventario: retira la asignación y conserva padre, plataforma
  y credenciales; crea inventario dentro de la misma transacción, sin duplicarlo.
- Última asignación, definitivo: exige confirmación explícita en interfaz; elimina
  solo el padre por ID si no quedan pantallas. Nunca elimina usuarios ni cuentas
  completas ni inventario independiente.
- Conserva una copia completa de la pantalla y sus importes en un nuevo registro
  de `deletedAccountHistory`, sin sobrescribir auditorías anteriores. No cambia
  cálculos ni snapshots de métricas. Publica revisión para invalidar cachés y
  actualizar pantallas, cuentas y disponibilidad.

## Base de datos y límites

Se revisaron `prisma/schema.prisma` y las migraciones versionadas. La relación
cuentascompartidas → pantallas y usuarios → pantallas tiene ON DELETE CASCADE.
Este flujo nunca borra usuarios y solo borra el padre con `pantallas: {none: {}}`
bajo la transacción, evitando depender de la cascada. No se encontraron triggers
ni procedimientos almacenados de eliminación en esas migraciones. No se inspeccionó
el esquema de producción ni se ejecutaron operaciones sobre datos reales.

No requiere migración. Inventario conserva su restricción única de plataforma y
correo y no tiene cuenta_id. Si otra cuenta comparte esa combinación o un registro
de inventario tiene otra clave, la transferencia se rechaza sin cambios. No se
sobrescriben credenciales para resolver esa ambigüedad.

La eliminación múltiple mantiene transacciones independientes por fila; un fallo
no revierte las filas previas exitosas y se muestra en el resumen de resultados.

## Verificación

- `tests/pantallaDeletion.test.cjs`: 15 pruebas, incluidos los handlers reales con
  adaptador aislado, seis pantallas, mismo correo/teléfono, dos padres con mismo
  correo, última pantalla en ambos destinos, cancelación/consulta, conteos,
  concurrencia simulada, repetición, rollback y conservación financiera/histórica.
- Con `emailDeletion`, `accountDataChanges`, `inventoryConsumption` y
  `restoreDeletedRecord`: **113 pruebas aprobadas**. La expectativa antigua de
  global DELETE para pantallas se actualizó a validación del contrato individual.
- `tests/pantallaDeletion.ui.cjs`: navegador Edge con API simulada y URL de base
  aislada no operativa. Verifica papelera, cancelación, listado de seis a cinco,
  inventario, confirmación definitiva y selección múltiple. **Cero llamadas globales**.
- `npm run typecheck`: aprobado. `npm run build`: aprobado.
- ESLint sobre archivos modificados: sin errores; advertencias existentes.
  `npm run lint` general falla por errores ajenos en artefactos de `.logs` y otros
  archivos existentes; no se modificaron para ampliar el alcance.

Los tests de transacción usan un adaptador en memoria con rollback y serialización.
No sustituyen una prueba de bloqueos/concurrencia contra MySQL real. Pendiente esa
validación en una base desechable y el despliegue. No se borraron clientes reales.
