# Verificación de eliminación múltiple

El diálogo lanzaba todas las consultas previas mediante `Promise.all`.
Las consultas de cuentas completas toman primero el bloqueo de su ID y después
ejecutan un recorrido con `LOWER(TRIM(correo)) ... FOR UPDATE`. Ejecutarlas
simultáneamente puede producir bloqueos cruzados o presión sobre el pool; basta
un fallo para que la preparación del lote deje los botones deshabilitados.
Esto es compatible con el síntoma de que una fila funciona y varias no, aunque
no se dispuso del log del servidor remoto para confirmar su error MySQL exacto.

`RecordDeletionDialog` verifica ahora en secuencia y coordina reinicios del efecto
de React para evitar verificaciones superpuestas. Cancelar detiene el resto de
las verificaciones pendientes. La eliminación sigue procesando los IDs elegidos,
revalidando cada uno y mostrando resultados y fallos por registro. No cambia el
alcance de los borrados ni utiliza la eliminación global.

La prueba de navegador introduce demora y rechaza verificaciones superpuestas;
valida lotes de cinco para inventario y eliminación definitiva en Cuentas completas,
Pantallas y ambos tipos en Vencimientos. También mantiene cancelación y eliminación
individual. Las API son simuladas: no se eliminaron clientes reales.
