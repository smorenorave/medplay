# Eliminación compartida: Pantallas, Cuentas completas y Vencimientos

Implementado por solicitud expresa del usuario. Las tres vistas utilizan `RecordDeletionDialog`, `recordDeletionClient` y `/api/record-deletions`, con una sola entrada de servidor `recordDeletion`.

## Comportamiento

- Un registro que no es el último se elimina por su ID. No se borran otros registros por compartir el correo.
- El último ofrece Inventario o eliminación definitiva. Basta pulsar el botón de la opción; no hay prompt ELIMINAR TODO, confirm adicional ni segundo modal de confirmación.
- En Pantallas se conserva el método transaccional existente `pantallaDeletion`. Último significa la última pantalla de su cuenta compartida. Inventario conserva el padre sin asignaciones, como antes; eliminación definitiva elimina el padre solo si queda vacío.
- En Cuentas completas, último significa la última cuenta completa con ese correo normalizado y plataforma. Se eliminan únicamente los IDs seleccionados. No se borran usuarios, inventario existente ni cuentas de otras plataformas.
- El traslado de una cuenta completa a inventario, su historial y su eliminación son ahora una sola transacción. Un fallo revierte todos esos cambios.
- El estado ACTIVA/VENCIDA no interviene. Se iguala la eliminación manual de las tres vistas al comportamiento de Pantallas: no hay una restricción adicional de vencimiento en la acción de borrado. La vista Vencimientos sigue seleccionando y mostrando registros según fechas.
- Inventario nunca sobrescribe credenciales distintas; una asociación ambigua con otra cuenta debe resolverse antes de transferir.
- La fecha, identidad y contenido de registros ajenos a la selección no se modifican.

## Lotes

El mismo diálogo permite elegir eliminar definitivamente o enviar a inventario cuando corresponda. Antes de cada elemento consulta nuevamente si es el último, porque una eliminación anterior del lote puede cambiar esa condición. Los fallos individuales se muestran y se continúa con el resto. Cada registro es una transacción independiente; los éxitos anteriores permanecen si un registro posterior falla. El resultado informa eliminados, enviados a inventario y fallidos.

Las comprobaciones del servidor siguen activas: autenticación, ID/tipo, identidad de la cuenta, condición de último, conflictos y concurrencia. Se elimina la confirmación escrita, no las validaciones de integridad.

## Archivos

- `lib/recordDeletion.ts`: entrada común, reutiliza Pantallas y añade transacción equivalente para cuentas completas.
- `src/app/api/record-deletions/route.ts`: previsualización y eliminación autenticadas y limitadas al registro.
- `lib/recordDeletionClient.ts`: acceso común a la API e invalidación de caché/inventario.
- `src/components/RecordDeletionDialog.tsx`: diálogo único individual y masivo.
- Los tres archivos de `src/components/viewers`: sustituyen sus flujos y modales duplicados por el componente compartido. Ya no invocan el borrado global por correo.
- `tests/recordDeletion.test.cjs`, `tests/recordDeletion.ui.cjs`, `tests/pantallaDeletion.test.cjs`: regresiones y pruebas de interfaz actualizadas.

Los endpoints heredados permanecen disponibles para sus otros consumidores; estas tres vistas ya no utilizan esas rutas de eliminación. El borrado global de otros módulos no se modificó.

## Verificación

- 27 pruebas unitarias/regresión aprobadas: alcance por ID, conservar otros registros, cancelación, último/intermedio, inventario, rollback, conflictos, concurrencia de pantallas y autenticación/API.
- Navegador Edge con APIs simuladas: aprobado para Cuentas completas, Pantallas y Vencimientos con ambos tipos. Se comprueba cancelar, borrar intermedio, enviar último a inventario, eliminar último definitivamente y lote que pasa de intermedios al último; cero prompts/confirm del navegador en estos flujos.
- TypeScript sin errores; ESLint de módulos nuevos y pruebas sin errores.
- No se enviaron solicitudes de eliminación a la base real. Las pruebas de transacciones usan un adaptador en memoria; los bloqueos de MySQL requieren una prueba de integración en un entorno dedicado.
- Cambios locales: no se desplegó ni reinició la aplicación publicada.
