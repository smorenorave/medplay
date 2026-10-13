# Confirmación de eliminación global

El botón «Revisar eliminación global» consulta primero el alcance actual en el
servidor: cuentas completas, cuentas compartidas, pantallas, inventario y clientes
asociados a los correos seleccionados en todas las plataformas. El usuario debe
escribir «ELIMINAR TODO» en una segunda confirmación. Cancelar no envía DELETE.

POST `/api/account-deletions` sólo inspecciona las asociaciones bajo una transacción
serializable. DELETE requiere confirmación y la huella de ese alcance; vuelve a
comprobarla dentro de la transacción que elimina. Si cambió alguna asociación,
rechaza la operación sin cambios. Las rutas antiguas de eliminación global por ID
responden 409; una pestaña antigua no puede omitir la confirmación nueva.

La eliminación por registro explícita y el flujo de vencimientos conservan sus
propias validaciones. La auditoría y el rollback se mantienen. La compatibilidad
con la columna de auditoría ausente también se conserva.

## Recuperación

En Administración → Historial de eliminaciones (`/admin/deletions`), buscar el
correo, abrir Restaurar y elegir cada pantalla o cuenta completa del evento.
La restauración de una pantalla recupera su cuenta compartida y el cliente si
faltan, conservando los datos respaldados y sin sobrescribir registros actuales.
No es una restauración global de inventario. La validación de existencia de la
plataforma sólo consulta su ID para funcionar sin `auditarEliminaciones`.

Las pruebas locales cubren rechazo sin confirmación, inspección sin escrituras,
cancelación sin DELETE, cambios de asociaciones entre inspección y eliminación,
auditoría, rollback y restauración con esquema antiguo. No se ha accedido ni
restaurado la base de producción desde este entorno.
