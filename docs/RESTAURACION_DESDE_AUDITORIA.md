# Restaurar registros desde Historial de eliminaciones

1. En el historial, pulsa **Restaurar** en el correo correspondiente.
2. Elige **Restaurar pantalla** o **Restaurar cuenta completa**.
3. Revisa el cliente y confirma la restauración.

La operación recupera un registro de la última eliminación de esa auditoría, conservando su identificador, fechas, estado, PIN, comentarios e importes. Para una pantalla, recupera también su cuenta compartida si falta. Recupera el cliente original si fue eliminado; si el cliente aún existe, conserva sus datos actuales. Una pantalla que ya estaba vencida vuelve a aparecer tanto en Pantallas como en Vencimientos.

La restauración se ejecuta en una transacción SERIALIZABLE autenticada. No sobrescribe registros existentes ni cuentas con credenciales cambiadas. Si una plataforma falta, un identificador o número de pantalla está ocupado, o el respaldo está incompleto, devuelve un mensaje y revierte toda la operación. Repetir la misma restauración no crea duplicados.

La auditoría de eliminación permanece. Su JSON añade fecha, administrador y registro restaurado; conserva los eventos de eliminación y restauración cuando se vuelve a eliminar la cuenta. La revisión de datos y las métricas se actualizan para refrescar las vistas y otras pestañas.

No cambia la regla de Inventario, no restaura automáticamente otras ventas o pantallas del correo y no modifica sus existencias. Solo recupera el registro seleccionado y sus dependencias necesarias.

API: `POST /api/admin/deletions/restore`, con `auditId`, `evento`, `tipo` (`pantalla` o `completa`) e `id`. El servidor obtiene todos los datos recuperables del respaldo; el navegador no puede enviar credenciales ni datos de venta para reemplazarlos.

No requiere una nueva migración: usa las tablas y el JSON de auditoría existentes. Deben estar aplicadas las migraciones previas de Auditoría. No se han restaurado datos en producción durante el desarrollo.
