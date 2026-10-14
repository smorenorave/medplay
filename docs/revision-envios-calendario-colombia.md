# Revisión de envíos y calendario — 13 de octubre de 2026

## Resultado y alcance

Se trabajó sobre los archivos existentes, conservando los cambios locales encontrados al iniciar. No se añadieron dependencias, migraciones ni cambios a registros reales.

El script principal completo sigue siendo `scripts/enviar_vencidos.js`. Ya contenía la integración compartida de teléfonos y usuarios; se inspeccionó y se ejecutaron sus pruebas, sin volver a escribirlo. Inicialmente se corrigió --usuarios para registrar las omisiones en el filtro común. Con la autorización posterior del usuario también se corrigieron los dos controles telefónicos pendientes: lectura del historial archivado del día y aplicación de bajas a teléfonos del modo de base de datos. `scripts/enviar_vencidos_local.cjs` delega en ese mismo principal. `scripts/whatsapp-contact.js` detecta el tipo de contacto, y `scripts/whatsapp-username.cjs` y `scripts/whatsapp-delivery.cjs` resuelven usuarios, verifican su identidad, registran resultados y reservan intentos para evitar reenvíos inciertos.

La documentación previa describe envíos anteriores por usuario. Esta intervención no los verificó de manera independiente: las pruebas de envío de esta revisión emplearon dobles de prueba, no destinatarios reales.

## Diagnóstico del calendario

Los campos nativos `input[type=date]` tomaban la presentación y el calendario del navegador/sistema. `lang` por sí solo no garantiza su orden visual ni el comportamiento de su botón Hoy. Además, `lib/dates.ts`, `lib/dailyCache.ts` y el visor de cuentas completas calculaban el día del equipo; algunos tickets convertían fechas ISO de medianoche UTC a hora local, desplazándolas al día anterior. Había también operaciones de calendario que terminaban en `toISOString()` después de construir una fecha local.

Se conserva el contrato interno YYYY-MM-DD y la representación de fechas civiles en medianoche UTC usada por las rutas existentes. No se aplica America/Bogota a una fecha civil almacenada como si fuera un instante: esa zona se usa para decidir el día actual. La aritmética UTC del calendario es únicamente un soporte para calcular componentes sin cambios de zona.

## Archivos modificados en esta intervención

| Archivo | Cambio necesario |
| --- | --- |
| `scripts/enviar_vencidos.js` | El filtro --usuarios registra omisiones mediante el filtro común. Tras autorización: consulta historial activo y archivado del día, aplica exclusiones a todos los destinatarios y detiene el lote si el historial no puede leerse. Conserva el método de envío. |
| `lib/bogotaDate.ts` | Locale es-CO; análisis estricto dd/MM/yyyy, formato civil, validación y suma de meses sin zona del equipo. |
| `lib/dates.ts` | Hoy y próximo mes parten del día de Bogotá, conservando el ajuste al último día del mes. |
| `lib/dailyCache.ts` | El identificador diario usa Bogotá; se conserva el nombre público de la función para sus consumidores. |
| `src/components/ui/ColombiaDateInput.tsx` | Selector compartido sin dependencias: texto dd/MM/yyyy, calendario español, lunes primero y Hoy de Bogotá; emite YYYY-MM-DD. Conserva ref/showPicker para los botones existentes. |
| `src/components/ui/Field.tsx` y `FieldPantallas.tsx` | Usan el selector común únicamente para campos de fecha. |
| `src/components/forms/FormCuentasCompletas.tsx` y `FormPantallas.tsx` | Los tickets presentan la fecha civil sin convertirla a la zona local. Los campos reciben el calendario a través de Field. |
| `src/components/viewers/CuentasCompletasViewer.tsx` | Calendario común, Hoy/filtros de Bogotá, suma de meses sin conversión local a UTC y presentación colombiana en tablas/tarjetas. |
| `src/components/viewers/PantallasViewer.tsx` | Calendario común, suma de meses civil y presentación colombiana; conserva el Hoy de Bogotá ya existente. |
| `src/components/viewers/CuentasVencidasViewer.tsx` | Calendario y presentación colombianos; recibe Hoy desde dailyCache. Se conserva su regla de suma de meses existente. |
| `src/app/admin/deletions/page.tsx` | Los filtros Desde/Hasta usan el calendario común, conservando los parámetros YYYY-MM-DD. |
| `src/app/admin/page.tsx` | Año/mes iniciales de Bogotá y nombres de mes es-CO. |
| `src/app/api/cuentascompletas/route.ts` y `src/app/api/pantallas/route.ts` | Cuando no llegan fechas explícitas de filtro, la referencia es el día de Bogotá; la serialización/persistencia no cambia. |
| `src/app/layout.tsx` | Idioma explícito es-CO. |
| `tests/colombiaDate.test.cjs` | Fechas ambiguas, medianoche, años bisiestos, cambio de mes, validación y conservación de fechas civiles. |
| `tests/colombiaCalendar.ui.cjs` | Pruebas reales del navegador con API simulada y reloj controlado. |

## Pruebas ejecutadas

- TypeScript: `npm run typecheck`, sin errores.
- ESLint sobre el componente nuevo, helpers y pruebas nuevas: sin errores ni advertencias.
- Envío y listado local: 13 pruebas aprobadas. Incluyen lote mixto, rutas telefónicas, redirección de usuario, identidad, restricciones, exclusiones, continuación tras omisión, reservas concurrentes y protección de funciones existentes mediante huellas.
- Fechas: 3 pruebas aprobadas; procesos con TZ America/Bogota, America/New_York, America/Los_Angeles y Pacific/Honolulu. Se recorren 1.461 fechas entre 2024 y 2027 para verificar ida y vuelta sin modificación.
- Navegador Edge headless con locale en-US: pruebas aprobadas en America/Los_Angeles, America/Bogota y America/New_York. Formularios de cuenta completa y pantalla: fecha manual 05/08/2026, calendario, lunes primero, Hoy y rechazo de 31/02/2026. Editores de cuentas/pantallas: Hoy, guardado de 2026-08-05/2026-09-05 y recarga mediante API simulada. Comprobados ambos lados de medianoche colombiana (02:30Z y 05:30Z).
- Regresión: 104 pruebas aprobadas de `expiredDeletion.regression.test.cjs`, `emailDeletion.test.cjs` y `restoreDeletedRecord.test.cjs`.
- El primer intento de navegador falló al arrancar Next por un permiso del sandbox. Tras ejecutar la misma prueba con permisos de proceso adecuados, pasó en las tres zonas indicadas.

No se cambió la zona del sistema operativo: se configuró explícitamente la zona en cada contexto del navegador y mediante TZ en procesos de prueba. No hubo envíos reales, ni prueba contra MySQL real, ni migración de históricos. La prueba de guardar/recuperar en interfaz verifica el contrato con una API simulada. No se afirma cobertura visual completa del panel administrativo ni del editor de vencidas.

## Corrección posterior autorizada y verificación

El usuario autorizó resolver los dos controles telefónicos pendientes. Ahora loadSentPhones une el archivo activo y el archivado del día, incluso si el activo falta o está vacío. Se conserva el criterio diario UTC existente y la elegibilidad del día siguiente. El modo local conserva su historial sin límite de fecha. Los errores de lectura y JSON corrupto detienen el lote antes de enviar, en lugar de tratarlo como un historial vacío.

Las listas no-contactar.json y usuarios-excluidos.json se aplican mediante el mismo filtro a teléfonos y usuarios, también en modo base de datos. Cada omisión registra su motivo. Se corrigieron los mensajes de resumen para no confundir una baja con un envío previo.

Se añadieron seis regresiones en tests/vencidosControls.test.cjs: dos archivados sucesivos; unión, normalización y cambio de día; archivos ausentes/corruptos/inaccesibles; conservación del modo local; exclusiones de teléfonos/usuarios con continuación del lote; y rechazo de una lista de bajas inválida. Las seis y las trece pruebas previas de envío/listado local pasaron (19/19). La prueba real de renombrado falló inicialmente por permisos en la carpeta temporal del sandbox; pasó usando una carpeta temporal dentro de .logs, eliminada al finalizar.

Limitaciones restantes: no se añadieron bloqueos entre procesos telefónicos simultáneos. ENVIADO sigue basándose en el editor vacío tras Enter y no demuestra entrega al destinatario. No se enviaron mensajes reales ni se consultó MySQL durante las pruebas. Las restricciones solo pueden registrarse cuando WhatsApp las revela.

## Elementos preservados

Se conservan las consultas, textos, fechas, selección de servicios y condiciones de vencimiento de los scripts de envío. Se corrigieron el registro de omisiones y los dos controles autorizados; el método telefónico no cambió. Sin cambios en `scripts/notify-password-changes.js`, esquema Prisma, rutas de persistencia por ID, autenticación, inventario ni dependencias. Los cambios de envío y archivos no registrados en Git que existían antes de esta intervención se conservaron.

El calendario implementado utiliza explícitamente es-CO, muestra dd/MM/yyyy y toma el día actual de America/Bogota; este comportamiento fue comprobado en los formularios y editores indicados con el navegador configurado en Estados Unidos.
