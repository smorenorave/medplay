# Corrección del historial financiero mensual

Fecha: 2 de noviembre de 2026 (America/Bogota).

## Estado de entrega

Implementación en el repositorio y pruebas en una base MariaDB aislada. No se ha desplegado ni migrado la base de producción. En este entorno no hay DATABASE_URL de producción ni archivos de respaldo financiero completos disponibles. No se modificaron registros reales. El usuario confirmó que la configuración `.env` está únicamente en el servidor y autorizó simular una base local para las pruebas.

La auditoría real de julio, agosto, septiembre y octubre de 2026 queda pendiente del acceso autorizado al servidor o respaldo. No se puede afirmar que esos meses estén guardados, perdidos o recuperados sin consultar esa fuente.

Las capturas muestran julio $6.900, agosto $175.900 y septiembre $320.200. Son referencias visuales, no evidencia suficiente para reconstruir ventas, costos, clientes y días completos. Además, el código anterior sumaba ganancias como si fueran ingresos. No se insertaron esas cifras en la base.

## Causas comprobadas en el código

- `deleteEmails`, `deleteExpiredBulk` y `restoreDeletedRecord` ejecutaban `metricasmensuales.deleteMany({})`. Una eliminación o restauración invalidaba todos los meses.
- `generateSnapshot` consultaba cuentas operativas y hacía `upsert`, sobrescribiendo resultados anteriores.
- Consultar un mes faltante o el año generaba supuestos históricos desde las cuentas que aún existían. El backfill de unidades también recalculaba dinero y clientes.
- La tarea refrescaba el mes actual y el anterior; el primer día podía recalcular repetidamente el cierre. No recuperaba todas las interrupciones.
- El panel permitía volver a datos operativos para meses anteriores y exportaba registros actuales independientemente del snapshot.
- Se sumaba `total_ganado` para presentar ingresos. Ese campo corresponde a ganancia, según las propias rutas de venta.

## Archivos y funciones

- `prisma/migrations/20261102000000_permanent_monthly_finance/migration.sql`: crea el registro permanente, cobertura, bitácora y revisiones; instala triggers de captura y protección. No elimina ni actualiza las cuentas o snapshots existentes. Si una instalación conserva los nombres antiguos de las columnas de cuentas completas de la migración inicial, los alinea conservando valores y precisión.
- `prisma/schema.prisma`: documenta las cuatro tablas nuevas sin relaciones en cascada a cuentas.
- `lib/monthlySnapshots.ts`: `buildMonthlyData`, `ensureMonthlySnapshot`, `generateMonthlySnapshot`, `ensureYearSnapshots`, `refreshAutomaticSnapshots` y `serializeMonthlySnapshot` separan el presente del historial y ejecutan el cierre transaccional.
- `instrumentation.ts`: inicia recuperación al arrancar Next en Node y registra la tarea cada cinco minutos en America/Bogota. No se ejecuta durante el build.
- `lib/emailDeletion.ts`, `lib/expiredBulkDeletion.ts`, `lib/restoreDeletedRecord.ts`: dejan de borrar snapshots.
- `src/app/api/metricas-mensuales/route.ts`: consulta administrativa protegida, exportaciones del mismo período, comparación anual desde cierres guardados y rechazo del POST que antes podía sobrescribir cierres.
- `src/app/admin/page.tsx`: el Panel de Información ya no descarga ni agrega cuentas actuales. Usa una única fuente por período para indicadores, ranking, gráficas y exportaciones; diferencia datos en vivo, histórico y meses no disponibles. Conserva `AdminSalesSummary` como resumen independiente.
- `lib/monthlySnapshotRevisions.ts`: validación y aplicación de recuperaciones/correcciones verificadas conservando el original.
- `scripts/monthly-finance.cjs`: auditoría de solo lectura y aplicación explícita de revisiones.
- `lib/db.ts`: importación relativa del cliente para compartir el mismo código con las herramientas operativas.
- `tests/monthlyFinance.test.cjs`, `tests/monthlyFinance.integration.cjs`: pruebas nuevas. Se actualizan las regresiones de eliminación/restauración para exigir preservación del historial.

## Registro y cierre

Los triggers SQL guardan cada venta en la misma transacción que crea la pantalla/cuenta. Capturan tipo, identificador original, fecha, vencimiento, cliente, plataforma, ingreso y costo. Una renovación con nueva fecha de compra conserva la venta anterior y añade otra. Restaurar el mismo identificador y fecha no duplica la venta. Los cambios de importes de una venta del mes abierto añaden ajustes con cero unidades; no reemplazan el original. Editar una cuenta de un mes cerrado no modifica su venta registrada.

La identidad comercial es tipo + identificador de cuenta + fecha de compra. Una renovación debe registrar su nueva fecha de compra; cambiar únicamente el vencimiento no declara otra venta. Los registros financieros no tienen claves foráneas a las cuentas y sobreviven a eliminaciones directas o en cascada.

Ingresos = importe pagado por el cliente (`total_pagado` / `total_pagado_completa`). Costos = pago al proveedor. Ganancia neta = ingresos menos costos. Los agregados monetarios se acumulan en centavos. Los snapshots anteriores se conservan tal como estaban; sus costos desconocidos aparecen como no disponibles.

Clientes activos = contactos únicos con un servicio vendido vigente al último día del mes, usando vencimiento exclusivo, coherente con la regla existente que considera vencido un servicio el día de su vencimiento. Se conserva la vigencia comercial vendida, independientemente de que después se borre la cuenta operativa.

Cada cinco minutos el servidor compara el período actual de Bogotá y busca todos los meses completos pendientes desde el inicio de cobertura. En el primer día del mes, la primera ejecución de las 00:00 cierra el anterior. Si estaba apagado, al arrancar recupera todos los cierres cubiertos; no depende del navegador. PM2 debe mantener el proceso Next activo.

El cierre bloquea la fila de cobertura dentro de una transacción Serializable, comprueba el cierre existente, agrega exclusivamente el registro permanente y confirma snapshot + bitácora juntos. La restricción existente `year_month` evita duplicados. Los conflictos transaccionales se reintentan hasta tres veces; otros errores quedan registrados y se vuelven a intentar en la siguiente ejecución. La bitácora guarda período, estado, resultado y fecha/hora. Una caída abrupta antes del commit revierte el cierre; el siguiente arranque lo vuelve a intentar.

Triggers BEFORE UPDATE/DELETE protegen snapshots, ventas, cobertura, revisiones y bitácora. La corrección usa una revisión nueva y conserva el snapshot original. La comparación anual usa la última revisión auditada de cada cierre.

## Cobertura y recuperación

La migración copia a la tabla nueva las ventas de las cuentas sobrevivientes como `baseline-partial`. Esto preserva evidencia disponible, pero no demuestra que no existan ventas previamente borradas o renovadas. Por esa razón, la cobertura automática comienza en el primer mes íntegro posterior a la instalación. El mes de instalación se muestra en vivo con advertencia de posible cobertura parcial; su cierre requiere conciliación verificable. No se fabrican cierres de meses anteriores ni meses futuros.

Un mes histórico sin snapshot devuelve 404 y se muestra como no disponible. Los cierres anteriores existentes se muestran sin recalcular, señalando que requieren cotejo. Las cachés de meses abiertos o futuros que dejó la versión anterior se identifican en la migración y no se presentan como cierres definitivos. Si corresponden a un mes con cobertura completa, el servidor añade su cierre definitivo como una revisión, conservando la caché original; si no existe cobertura completa, requieren conciliación verificable. Las unidades antiguas no se rellenan desde cuentas actuales. En la gráfica anual un mes ausente queda vacío, sin tratarlo como cero.

Para recuperar julio-octubre se necesita, por período, un respaldo o registro financiero completo que permita verificar importes, costos, ventas por tipo/plataforma/día y clientes vigentes al cierre. Los historiales de eliminación pueden aportar evidencia parcial; por sí solos no prueban la totalidad del mes. No hay suficiente evidencia local para aplicarlos como cierres completos.

## Operación

Antes del despliegue, conservar un respaldo de producción y la salida de la auditoría. Coordinar la parada de todos los workers anteriores durante la migración para que ningún proceso viejo escriba mientras se instala la captura.

Con el entorno del servidor configurado, ejecutar:

```powershell
npm run finance:audit -- --year 2026
npx prisma generate
npm run build
npm run start
```

El `prestart` existente ejecuta `prisma migrate deploy` antes de servir tráfico. El usuario SQL de migraciones necesita permisos para crear tablas y triggers. No usar reset, db push ni borrar migraciones. No ejecutar la aplicación nueva contra una base sin esta migración.

En instalaciones donde PM2 ya controla Next, iniciar/reiniciar el proceso con el procedimiento habitual del servidor después de preparar el build y las migraciones. Este repositorio usa un proceso persistente; un alojamiento que suspenda Node necesita ejecutar `refreshAutomaticSnapshots` mediante un worker persistente equivalente.

Consultar nuevamente `npm run finance:audit -- --year 2026` y la bitácora para comprobar los cierres y la cobertura reales. La herramienta sin `--apply` es de solo lectura y funciona también antes de instalar las tablas nuevas.

### Recuperación o corrección auditada

Preparar un JSON verificado con los campos de `VerifiedSnapshot` en `lib/monthlySnapshotRevisions.ts`: año, mes, totales, unidades, clientes, ranking completo, todos los días ordenados y payload con costos/ganancia neta. `payload.registros` es opcional para respaldos que conservan agregados pero no detalle; la exportación no inventa registros ausentes. La procedencia del archivo debe quedar identificada mediante una referencia de respaldo/transacción y su hash en la evidencia.

Revisar primero el reporte y el último identificador de revisión. Ejecutar deliberadamente en el servidor:

```powershell
node scripts/monthly-finance.cjs --apply --file C:/ruta/cierre-verificado.json --actor operador --reason "Conciliación con respaldo completo" --evidence "Respaldo identificado y SHA256 verificado" --expected-revision 0 --confirm-period 2026-08
```

`0` corresponde a un período sin revisiones. Para una corrección posterior se exige el último ID real, evitando aplicar una revisión sobre otra que cambió concurrentemente. La herramienta valida consistencia de importes, costos, unidades, ranking y días. La autenticidad/completitud del respaldo debe verificarse operativamente antes de ejecutarla; ninguna validación matemática puede demostrarla.

Si falta el snapshot crea el cierre verificado; si existe conserva el original y añade una revisión. Siempre registra operador, razón, evidencia, contenido y fecha. No hay un endpoint HTTP que permita sobrescribir cierres.

## Verificación

- Pruebas unitarias: frontera de mes de Bogotá a las 05:00 UTC, arranque sin navegador, ejecución única por worker, reintento tras error y exclusión de build/Edge.
- MariaDB real en puerto aislado 3318, bases nuevas `medplay_finance_test_*`: cadena completa de migraciones, captura transaccional, rollback, preservación de un snapshot preexistente, diferencias ingreso/costo/ganancia, dos cierres concurrentes, renovación, eliminación en cascada, protección SQL y recuperación de varios meses después de interrupción.
- Exportaciones: se abren CSV y XLSX reales y se cotejan indicadores, ranking y registros con el snapshot; también se comprueba el endpoint anual y el rechazo de consultas sin administrador.
- Revisiones: conservación del original, evidencia persistente y rechazo de una corrección concurrente con ID obsoleto.
- Se ejecutan regresiones de eliminación de cuentas, restauración e inicio de base de datos.
- Navegador Edge con Playwright y build de producción local: cambio de mes/año, indicador en vivo/histórico, ranking, gráficas, crecimiento anual, descarga CSV y rechazo visual del fallback a datos actuales cuando falta el cierre.
- Resultado: 153 pruebas unitarias/integración/regresión aprobadas, comprobación del navegador aprobada, typecheck correcto y build de producción correcto. El build conserva advertencias preexistentes en componentes ajenos a esta corrección.

Comandos reproducibles:

```powershell
npm run test:monthly-finance
$env:FINANCE_TEST_SERVER_URL='mysql://usuario:clave@127.0.0.1:3318'
npm run test:monthly-finance:db
npm run test:email-deletion
npm run test:account-restoration
npm run test:database-startup
npm run typecheck
```

Las pruebas SQL rechazan cualquier host diferente de 127.0.0.1 o puerto diferente de 3318 y crean bases nuevas. No reutilizan ni limpian una base existente.

Para repetir la prueba del navegador, compilar con `MEDPLAY_NEXT_DIST_DIR=.logs/finance-build-verified`, configurar `FINANCE_UI_DATABASE_URL` con una de las bases nuevas de la prueba SQL y ejecutar `npm run test:monthly-finance:ui`. La prueba usa únicamente localhost:3318/3319 y añade un cierre sintético identificado para septiembre de 2025.
