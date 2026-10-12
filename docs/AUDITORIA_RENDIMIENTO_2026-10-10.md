# Auditoría técnica de rendimiento — Medplay

Fecha: 10 de octubre de 2026, Bogotá. Estado: optimizaciones locales implementadas y verificadas; diagnóstico de producción **incompleto por falta de conexión al servidor/MySQL**. No se han desplegado cambios ni aplicado migraciones.

## Dictamen

Hay problemas demostrados en **código y frontend**: trabajo repetido al filtrar, recorridos cuadráticos para indicadores por correo, exceso de elementos DOM, paginación con valor predeterminado incorrecto, solicitudes de escritura sin límite y lecturas redundantes. Se corrigieron los casos que pueden verificarse en este entorno conservando validaciones, permisos, auditorías y transacciones.

También hay problemas estructurales pendientes: descarga completa de datasets, generación de métricas durante consultas GET, borrados con cientos de operaciones secuenciales y consultas de correo normalizado que requieren revisar sus planes de ejecución. Estos patrones existen en el código; **su contribución a la latencia real de producción no está medida**.

No hay evidencia suficiente para atribuir la lentitud principal a CPU, RAM, disco, red o MySQL, ni para recomendar comprar una máquina más potente. La configuración versionada arrancaba Next en desarrollo; se corrigió, pero no se verificó que esa configuración estuviera activa en el servidor del usuario.

## Alcance y evidencia

- Next.js 15.5.27, React 19, Prisma 6.19.2, MySQL; versiones obtenidas del repositorio. Un proceso Next contiene rutas API, interfaz y scheduler de snapshots.
- Inventario estático de todos los archivos propios de `src`, `lib` y scripts JavaScript/TypeScript: [inventario por archivo y endpoint](performance-source-inventory.md). Excluye dependencias, binarios y cliente Prisma generado. El inventario permite localizar llamadas, pero no constituye una prueba dinámica de cada rama.
- Inspección de esquema, relaciones, índices, migraciones/configuración de arranque, rutas CRUD, autenticación, cachés, eventos, formularios, listados, métricas y scripts de notificación. No se ejecutaron notificaciones ni envíos de correo reales.
- Pruebas del código real con adaptadores transaccionales en memoria. **No son pruebas de MySQL**, de su optimizador ni de bloqueo real.
- Navegador Edge headless, build de producción, 2.000 filas sintéticas, escritorio 1500×1000 y comprobación móvil 390×844. API interceptadas en el navegador: no se incluyó red de producción ni SQL.
- Microbenchmark de funciones reales de `PantallasViewer`, 10.000 registros y 2.000 correos; una ejecución de calentamiento y mediana de cinco muestras. La compilación TypeScript de los fragmentos queda fuera del tiempo medido. El caso de filtro usa búsqueda vacía para aislar fechas y recorrido; la búsqueda con texto se midió también en navegador.
- No existe `DATABASE_URL` en el entorno cargado de este checkout. No se pudieron ejecutar `EXPLAIN`, `EXPLAIN ANALYZE`, lectura de índices reales, estadísticas de consultas, pruebas de carga con usuarios reales o mediciones de SMTP/Cloudflare/MySQL.

## Resultados antes/después

**No mezclar las tres clases de medición**: cálculo aislado, navegador con API simulada y adaptador CRUD con latencia artificial. Los números siguientes no representan tiempos del servidor del usuario.

| Prueba | Antes | Después | Interpretación |
|---|---:|---:|---|
| Filtro de pantallas, 10.000 filas | 43,091 ms | 0,127 ms | Mediana; fecha y horizonte se calculan una vez por filtro |
| Indicadores de 2.000 correos, 10.000 filas | 454,333 ms | 4,651 ms | Mediana; índice por correo/plataforma en vez de recorrer todas las filas por grupo |
| DOM cuentas completas, 2.000 filas | 122.212 elementos | 6.317 | 100 registros renderizados por página; búsqueda/selección conservan el dataset |
| DOM pantallas, 2.000 filas | 136.213 elementos | 7.018 | 100 registros; en este fixture son 100 encabezados de grupo + 100 filas |
| Buscar `user1999`, cuentas completas | 264,3 ms | 36,1 ms | Una muestra de navegador; no es p95 ni SLO |
| Buscar `user1999`, pantallas | 409,3 ms | 33,1 ms | Una muestra de navegador; no es p95 ni SLO |
| Abrir cuentas completas | 588,7 ms | 593,2 ms | **Sin mejora demostrada**; incluye espera del navegador y descarga simulada de todas las páginas |
| Abrir pantallas | 591,4 ms | 447,2 ms | Muestra orientativa; repetir bajo carga real |
| Inicio hasta navegación disponible, contexto cuentas | 183,9 ms | 177,1 ms | Muestra local con sesión simulada; variación pequeña |
| Inicio hasta navegación disponible, contexto pantallas | 128,0 ms | 122,1 ms | Muestra local con sesión simulada; variación pequeña |
| Peticiones de listado para 2.000 filas en fixture navegador | 4 | 4 | La paginación visual no reduce todavía la descarga global |
| GET pantallas sin `limit` | 1 fila | 300 filas | Error funcional/performance corregido; no representa aceleración de una consulta individual |
| GET completas sin `limit` | 1 fila | 200 filas | Error funcional/performance corregido |
| Listado de 6 filas con página de 3, handlers reales | 3 solicitudes por algoritmo anterior | 2 verificadas | Se usa una fila de anticipación para saber si existe otra página |
| Guardado de 100 elementos | Hasta 100 solicitudes simultáneas por código | Máximo 4 verificado | Contención controlada; no se promete menor duración total del lote |

Archivos originales: [cálculo anterior](performance-before.json), [cálculo posterior](performance-after.json), [navegador anterior](performance-browser-before.json), [navegador posterior](performance-browser-after.json).

### CRUD medido por operación

Fixture: usuario existente, consumo explícito de inventario, creación/edición con correo de destino nuevo. Se ejecutaron los handlers reales. El adaptador solicita una espera de 2 ms por llamada, pero Windows puede despertar el temporizador bastante después: **estos tiempos son una simulación de coste por operación, nunca una medición de latencia SQL**. No se cuentan operaciones internas del adaptador como nuevas llamadas ORM. Las relaciones de Prisma pueden generar más de una sentencia SQL por llamada.

| Operación | Llamadas antes → después | Mediana antes → después | Estado |
|---|---:|---:|---|
| Crear completa | 3 → 3 | 46,659 → 45,566 ms | Sin modificación de lógica; diferencia temporal es ruido |
| Editar completa | 8 → 8 | 93,598 → 93,529 ms | Sin modificación de lógica; conserva sincronización de credenciales |
| Crear pantalla | 7 → 6 | 109,316 → 93,725 ms | `create` devuelve relaciones; se elimina `findUniqueOrThrow` posterior |
| Editar pantalla con reasignación | 15 → 14 | 203,344 → 186,821 ms | Reutiliza cuenta ya actualizada/conectada para sincronizar credenciales |

Trazas con cada método: [CRUD anterior](performance-crud-before.json), [CRUD posterior](performance-crud-after.json). Las otras ramas —cambio de contacto, usuario inexistente, conflicto, sin inventario— pueden tener otros conteos. No extrapolar el cuadro a todas las peticiones.

Las eliminaciones se midieron por separado, **sin latencia artificial**, usando funciones reales y transacciones simuladas:

| Operación | Llamadas ORM/raw antes → después | Mediana CPU/adaptador antes → después | Interpretación |
|---|---:|---:|---|
| Un correo global, seis identidades de credencial | 34 → 29 | 0,556 → 0,850 ms | Se eliminan 5 consultas redundantes; el ruido submilisegundo no prueba mejora temporal local |
| 100 cuentas completas vencidas | 303 → 303 | 5,559 → 7,055 ms | Sin cambio; coste MySQL pendiente; 100 lecturas, 100 borrados, 100 auditorías, 3 operaciones comunes |
| 100 pantallas vencidas, un padre | 305 → 305 | 5,146 → 6,444 ms | Sin cambio; suma lectura y eliminación del padre sin referencias |

Trazas: [eliminación anterior](performance-deletion-before.json), [eliminación posterior](performance-deletion-after.json). Los tests de concurrencia verifican cuatro consumos sobre un mismo inventario y reintentos/restauraciones simultáneas; **el adaptador serializa transacciones y no reproduce los locks de InnoDB**.

## Hallazgos, causas y tratamiento

En la tabla, «no verificado» significa que falta medición del entorno real. «Corregido» se refiere al código local; no implica despliegue.

| Problema detectado | Ubicación / función | Causa raíz | Evidencia | Solución implementada o recomendada | Tiempo anterior | Tiempo posterior | Estado |
|---|---|---|---|---|---|---|---|
| Cálculo repetido de fechas | `src/components/viewers/PantallasViewer.tsx`, `filtered` | `todayYMDBogota` y `addDaysYMD` dentro de `rows.filter` | 10.000 cálculos por evaluación | Calcular ambas fechas fuera del bucle | 43,091 ms | 0,127 ms | Corregido |
| Recorrido cuadrático | Mismo archivo, `getPerPlatformForEmail` | Para cada correo recorre las N filas y busca plataformas | 2.000 × 10.000 inspecciones en fixture | `platformsByEmail` memoizado y mapa de nombres | 454,333 ms | 4,651 ms | Corregido |
| Renderizado masivo duplicado | `PantallasViewer`, `CuentasCompletasViewer` | Todas las filas en tarjetas y tabla, aunque una vista esté oculta | Más de 120.000 elementos con 2.000 registros | Ventana de 100 registros y controles; conserva selección global, filtros, contadores y edición | Búsqueda 264–409 ms | 33–36 ms | Corregido parcialmente: descarga global pendiente |
| Recargas duplicadas por broadcast | `PantallasViewer`, efectos de montaje | Dos `BroadcastChannel` para el mismo mensaje | Inspección de ambos listeners | Un listener; conserva refresco forzado explícito porque cambios en cuenta compartida no siempre alteran stamp | Hasta dos cargas si cambia stamp | Una por evento | Corregido |
| Valor predeterminado de página incorrecto | `src/app/api/pantallas/route.ts`, `cuentascompletas/route.ts`, GET | `Number(null)` produce 0 y clamp lo convierte en 1 | Handler real con solicitud sin limit devuelve 1 fila | `lib/pagination.ts`: predeterminado, entero y límites | 1 registro/página | 300 / 200 | Corregido |
| Petición final vacía | Mismos GET | `nextCursor` inferido por página llena sin comprobar más filas | Test 6 filas / tamaño 3 | `take=limit+1`, devolver sólo limit | Una petición extra en múltiplos exactos | Ninguna extra | Corregido |
| Escrituras simultáneas sin límite | Formularios `FormPantallas` y `FormCuentasCompletas`, `confirmAndSave` | `Promise.allSettled(toSend.map(fetch))` lanza todo el lote | Prueba de 100 trabajos, fallos síncronos y asíncronos | `settleWithConcurrency`, 4 trabajadores, mantiene orden y éxitos parciales | Hasta N simultáneas | Máximo 4 por lote/pestaña | Corregido; capacidad global no verificada |
| Un broadcast por inserción de pantalla | `FormPantallas`, bucle de resultados exitosos | Notificación repetida después de guardar el mismo lote | N inserciones generan N eventos | Notificar una vez después de actualizar caché de todas las filas | N eventos | 1 si hubo éxitos | Corregido |
| Relectura tras creación | POST pantallas | Create sólo devuelve ID y luego vuelve a consultar con relaciones | Traza de fixture | Retornar relaciones desde create en la misma transacción | 7 llamadas; 109,316 ms simulados | 6; 93,725 ms simulados | Corregido |
| Relectura de cuenta destino | PATCH pantallas | Cuenta relacionada ya está en `updated` | Traza del flujo de movimiento | Reutilizar relación; en applyCorreoCuenta asignar el resultado del update | 15; 203,344 ms simulados | 14; 186,821 ms simulados | Corregido |
| Repetición de auditorías antiguas | `lib/emailDeletion.ts`, `deleteEmails` | Consulta idéntica de `dedupeKey:null` por cada contraseña | 6 búsquedas iguales en un correo con seis claves | Carga perezosa una vez por correo dentro de transacción | 34 llamadas | 29 llamadas | Corregido; no se afirma ganancia temporal submilisegundo |
| Dependencia pesada en JSON/CSV | API métricas, `exportSnapshot` | Import estático de ExcelJS al cargar módulo | Inspección del grafo de importación | Import dinámico sólo para exportación XLSX | No verificado | No verificado | Corregido estructuralmente; ganancia no cuantificada |
| Arranque de desarrollo versionado | `ecosystem.config.js`, `scripts/pm2-next.js`, `start-medplay.bat` | `npm run dev`; compilación/HMR en servidor si se usan esos scripts | Código, no estado de servidor | `npm run start`, modo producción en PM2, raíz relativa; build previo obligatorio | No verificado | No verificado | Configuración corregida; despliegue pendiente |
| Descarga de toda la base al abrir | Viewers, `lib/cuentasAll.ts`, formularios y admin | Bucles de fetch de páginas antes de presentar el conjunto | Cuatro solicitudes para 2.000 filas en prueba; listas siguen completas | Separar página visible, contadores SQL, disponibilidad y exportación; mantener semántica de búsquedas y selección antes de migrar | Apertura completas 588,7 ms | 593,2 ms | Pendiente; sin mejora demostrada de red |
| Truncamiento silencioso | `cuentascompartidas.GET`, `inventario.GET`, `usuarios.GET`; bucles de viewers | Límites fijos 200/500 sin cursor; guardas de 50 páginas | Inspección: parámetros grandes enviados por UI no se honran | Diseñar contrato paginado para estos consumidores y evitar declarar resultados parciales como completos | No verificado | No verificado | Pendiente funcional y de escalabilidad |
| Cálculo redundante de métricas | `src/app/admin/page.tsx`, `lib/dashboardData.ts` | Admin descarga ventas y calcula métricas además de snapshot; dashboard lee ventas mensuales individuales | `loadDashboardData`: 11 llamadas ORM por carga, dos devuelven filas del mes | Agregación SQL por plataforma/día; endpoint de años disponibles; exportación bajo demanda | No verificado | No verificado | Pendiente de integración con MySQL |
| GET con escritura y concurrencia de snapshots | `lib/monthlySnapshots.ts`, `instrumentation.ts` | Mes actual regenera; año genera hasta 12 meses en paralelo; scheduler por proceso | Código: serializable, 30 s y Promise.all anual | Worker/scheduler único, generación coordinada y agregación; probar invalidación por borrados | No verificado | No verificado | Pendiente |
| Invalidación de todo el histórico | `emailDeletion`, `expiredBulkDeletion`, `restoreDeletedRecord` | `metricasmensuales.deleteMany({})` tras mutación | Código confirma regeneración posterior de todos los meses | Dependencias por período, teniendo en cuenta clientes activos históricos; no reducir invalidación sin modelar impacto | No verificado | No verificado | Pendiente; se preservó consistencia |
| Borrado masivo secuencial | `lib/expiredBulkDeletion.ts` | Lectura+borrado+auditoría por registro; limpieza por padre | 303/305 llamadas en 100 registros | Lectura agrupada y escrituras por lote con misma validación, auditoría y serialización; probar deadlocks y rollback en MySQL antes de implantar | 5–6 ms adaptador; SQL no verificado | Sin cambio | Pendiente |
| Prevalidación masiva saturable | `CuentasVencidasViewer`, `askBulkDelete` | Hasta 100 GET de seguridad simultáneos antes del DELETE | `Promise.all(list.map(serverCheckIsLast))` | Endpoint de verificación por lote o límite de concurrencia; mantener confirmaciones por estado | No verificado | No verificado | Pendiente |
| Lecturas con función sobre correo | `emailDeletion`, restauración y vencimientos | `LOWER(TRIM(correo))` en búsqueda, algunas con FOR UPDATE | SQL explícito; no EXPLAIN disponible | Evaluar columna/index de normalización compatible con datos históricos y collation | No verificado | No verificado | Pendiente; no se sustituyó por igualdad que perdería registros históricos |
| Stamps costosos/incompletos | APIs `/pantallas/stamp`, `/cuentascompletas/stamp` | Varias lecturas COUNT/MAX; cambios en relaciones no siempre reflejados | Pantallas ejecuta 6 operaciones ORM; no updatedAt en usuarios/compartidas | Revisión de datos común actualizada por toda mutación; conservar invalidación explícita actual | No verificado | No verificado | Pendiente |
| Crecimiento de memoria de rate limit | Login y recuperación, `attempts` | Maps conservan claves únicas vencidas hasta reutilización | Inspección del ciclo de vida | TTL con purga y store compartido si hay varios procesos; conservar límites de seguridad | No verificado | No verificado | Riesgo pendiente; fuga bajo carga no medida |
| Procesos externos y correo | `enviar_vencidos.js`, `notify-password-changes.js`, mailer, hours-report | Automatización Edge, esperas de servicio y SMTP | Código contiene esperas/reintentos y procesos separados | Medir por etapa; cola durable si el volumen lo exige; no acortar esperas a ciegas | No verificado | No verificado | Pendiente; no se enviaron mensajes |

## Base de datos: estructura, índices y concurrencia

Se verificó el esquema **versionado**, no el desplegado. Las relaciones principales son usuario→ventas por `contacto`, plataforma→compartidas/completas/inventario y compartida→pantallas. Hay índices en claves foráneas, updatedAt, estado+vencimiento, plataforma+vencimiento de completas, revisión/auditoría, y unicidad de inventario por plataforma/correo. No se eliminó ninguno.

Los candidatos siguientes requieren comparar `EXPLAIN`, cardinalidad, tamaño y coste de escritura con datos representativos antes de crear migraciones:

| Consulta | Situación del esquema | Candidato a evaluar |
|---|---|---|
| Filtro mensual por fecha_compra de ambas ventas | Sin índice con esa columna inicial | `fecha_compra`; ampliar sólo si la selectividad/cobertura lo justifica |
| Vencidas/global y orden pantalla por fecha,id | Índice existente empieza por estado, consulta no siempre filtra estado | `(fecha_vencimiento,id)` |
| Credenciales por plataforma/correo + último registro | Índice plataforma solo en compartidas/completas | `(plataforma_id,correo,id)` o updatedAt según consulta |
| Correo normalizado global, con y sin lock | Función sobre columna; índices actuales no garantizan acceso selectivo | Columna generada o índice funcional según versión/collation; respetar LOWER(TRIM) exacto |
| Búsqueda contiene en varios campos | LIKE `%texto%` con OR | No añadir B-tree esperando resolverlo; evaluar búsqueda especializada manteniendo la semántica |

**No se aplicaron índices a ciegas.** No hay base conectada para demostrar reducción de filas examinadas ni medir penalización de INSERT/UPDATE. Tampoco se afirmó N+1 por el simple uso de `include`: Prisma puede usar varias consultas por relación sin que el número crezca por cada fila. El N+1 demostrado aquí es el bucle explícito de eliminación.

Las transacciones de consumo de inventario, sincronización de claves, eliminación y restauración siguen intactas. No se redujo aislamiento, se quitó una validación, ni se sacó la auditoría fuera del commit. Los retries de `serializable` y sus límites permanecen: la frecuencia real de P2034/P2002, los tiempos de espera y los deadlocks están no verificados. El pool no tiene configuración específica en `lib/db.ts`; parámetros externos de DATABASE_URL y MySQL no están disponibles.

## Cobertura por módulos

| Grupo | Resultado de revisión |
|---|---|
| Pantallas/completas GET, POST, PATCH, DELETE y stamps | Pruebas de contratos, inventario, cambios de contacto, conflictos, auditorías; optimizaciones descritas arriba. SQL real pendiente |
| Compartidas, plataformas, usuarios, inventario | Validaciones y FK presentes; límites fijos sin cursor en algunos listados. Eliminar plataforma archiva inventario en bucle antes de DELETE. Prueba de gran inventario pendiente |
| Vencimientos y eliminación global | Lecturas de seguridad, serialización, revisiones y auditorías preservadas. Coste lineal alto en lotes; regresiones de seguridad/rollback pasan |
| Auditoría de eliminaciones y restauración | Lista de auditoría usa select acotado, count y paginación; detalle se consulta por ID. OFFSET muy profundo y búsquedas requieren medir. Restauración conserva conflictos y referencias |
| Dashboard, métricas mensuales y exportación | Puntos de agregación redundante/GET con escritura documentados; ExcelJS diferido. No se sustituyó la definición de ventas/ganancias |
| Login, logout, sesión y middleware | JWT, cookies, roles, inactividad y bcrypt preservados. `/session/me` no consulta BD; polling cada 10 s sigue presente. `/account-data-revision` cada 15 s sí consulta admin/revisión/auditoría |
| Recuperación de clave, correo de recuperación, mail-status | Coste bcrypt/SMTP esperado; respuesta mínima de 350 ms en recuperación es deliberada y se conserva; no es un error a eliminar por rendimiento |
| Timers, hours-report, WhatsApp, Cloudflare | Procesos/servicios externos no medidos. Automatización no ejecutada. No hay prueba de fuga de procesos ni de saturación atribuible a ellos |
| Recursos estáticos | `public` contiene cinco SVG pequeños; no se encontró una colección de imágenes pesadas. Esto no equivale a medir red/CDN |
| Lazy loading y cachés | Viewers/formularios ya usan `next/dynamic`; ExcelJS de admin ya era dinámico. Se mantienen epochs que impiden repoblar cachés tras eliminaciones. Hay cachés y buses independientes que convendría unificar con invalidación correcta |

El build reporta aproximadamente 116 kB de First Load JS en `/`, 117 kB en `/admin` y 103 kB compartidos. Son estimaciones del build, no bytes transferidos medidos en una conexión real. No se midió retención de heap con sesiones largas: **fuga de memoria de frontend no verificada**.

## Máquina, servidor y red

Resultado original: [diagnóstico local](performance-environment.json). Muestra de un segundo, recogida en la máquina de desarrollo, durante esta auditoría:

- Intel Core i7-12800H, 20 procesadores lógicos.
- RAM total 16.847.822.848 bytes; libre 4.744.921.088 bytes en esa muestra.
- CPU ocupada agregada 46,9 %. No es utilización de Next ni de MySQL; no identifica al proceso responsable.
- Disco libre 909.678.989.312 bytes. Capacidad libre no mide IOPS ni latencia de fsync.
- RSS del proceso de diagnóstico: 48.787.456 bytes; p95 de event loop de ese proceso: 16,171 ms. **No extrapolar estos dos números al servidor Next.**

El acceso CIM a métricas Windows fue denegado dentro del aislamiento. Los listados de procesos/conexiones no proporcionaron una medición utilizable del servicio real; no se concluye que no exista MySQL en otra máquina. No se midieron latencias de lectura/escritura del disco, paginación del sistema, CPU/RSS del proceso productivo, memoria de InnoDB, RTT hacia base de datos, CDN/túnel, SMTP ni carga simultánea real.

**No se recomienda una ampliación concreta con esta evidencia.** Evaluar RAM adicional sólo si se verifica paginación/fallos de caché sostenidos; CPU sólo si el perfil del proceso mantiene núcleos saturados tras las optimizaciones; SSD/IOPS si persiste espera de almacenamiento; proximidad app/DB si domina RTT. Evitar multiplicar procesos PM2 antes de coordinar el scheduler y dimensionar el pool por proceso.

## Instrumentación y reproducción

Comandos desde la raíz del proyecto:

```powershell
npm run test:performance
node scripts/benchmark-performance.cjs
node scripts/benchmark-crud.cjs
node scripts/benchmark-deletion.cjs
node scripts/audit-performance-source.cjs
npm run diagnose:performance
npm run build
node scripts/benchmark-browser.cjs
```

`benchmark-crud` y `benchmark-deletion` reutilizan los fixtures existentes; no conectan con MySQL. `benchmark-browser` levanta Next en 127.0.0.1:3124 con credenciales ficticias e intercepta todas las API. Los ficheros `*-before.json` son capturas anteriores a su optimización específica, **no una comparación integral de dos despliegues reales**. Por ejemplo, la primera medición de navegador ya incluía la optimización de cálculo, pero todavía renderizaba todas las filas.

Para recoger datos en el entorno con acceso, el script siguiente sólo ejecuta metadatos, SELECT 1 y EXPLAIN de consultas representativas; nunca CRUD, DDL ni EXPLAIN ANALYZE:

```powershell
node scripts/diagnose-performance.cjs --database --out=diagnostico-local.json
```

Requiere conexión y permisos apropiados. El informe contiene nombres de tablas/índices y estadísticas: mantenerlo en un lugar privado. Los planes son representativos, no el SQL exacto generado por Prisma. Los contadores acumulados de MySQL requieren dos muestras para calcular tasas. SELECT 1 mide viaje cliente/servidor, no red pura. Si se necesita EXPLAIN ANALYZE, hacerlo con consultas SELECT revisadas sobre staging: ejecuta realmente la consulta.

Se añadió `Server-Timing: app;dur=...` a GET/POST de pantallas/completas, GET/PATCH/DELETE de sus rutas por ID y ambos dashboards. Incluye espera ORM y serialización dentro del handler; excluye middleware, red, compilación previa, cola anterior al handler y render del navegador. No cubre los otros endpoints ni respuestas que el middleware rechaza antes del handler.

`MEDPLAY_SQL_TIMING=1`, activado temporalmente al arrancar, registra duración y timestamp de cada evento SQL; no imprime SQL ni parámetros. La duración Prisma incluye el viaje cliente-base, no sólo CPU del motor. No hay correlación por request bajo concurrencia; para medir una operación individual realizar una sesión controlada sin tráfico paralelo, o agregar tracing correlacionado antes de una prueba multiusuario. No restar sin más la suma SQL del total app si hubo consultas paralelas.

Plan pendiente de validación en staging representativo:

1. Recoger por endpoint y rama CRUD p50/p95/p99, errores, número SQL y bytes devueltos, con caché fría/caliente, tablas de 1k/10k/100k y misma distribución de datos.
2. Separar Navigation/Resource Timing, `Server-Timing`, profiler React y trazas SQL. Medir render con API ya resuelta y transferencia con render excluido; medir RTT app→DB por separado.
3. Ejecutar 1/5/20 usuarios con lecturas, búsquedas, creación, edición, borrado individual y lotes de 100 sobre datos desechables. Registrar throughput y colas/pool; no ejecutar borrados de prueba en producción.
4. Revisar EXPLAIN e índices reales; medir cada candidato antes/después, incluyendo coste de escritura y tamaño. Revisar locks/transacciones en `performance_schema`/InnoDB según versión y permisos.
5. Medir CPU/RSS por PID, event loop de Next, IOPS/latencia de disco, memoria InnoDB y RTT/servicios. Recién entonces decidir infraestructura o pool.

## Validación y puesta en servicio

- Suite CommonJS: 175 pruebas aprobadas tras la optimización de auditorías. Incluye consumo concurrente, rollback, duplicados, restauración, revisión/invalidación, permisos y siete pruebas específicas de rendimiento/contratos.
- Suite TypeScript adicional: 9 pruebas aprobadas de credenciales, PIN y sesión/cambios de contraseña.
- `npm run typecheck`: aprobado. Se excluyeron tipos generados obsoletos de `.next-verify` y `.logs`, que provocaban un conflicto inicial ajeno al código de aplicación.
- Build de producción: aprobado; conserva advertencias ESLint existentes, no una ejecución libre de warnings. El primer intento aislado falló porque SWC no podía canonicalizar la ruta Windows; el build fuera del aislamiento pasó.
- Navegador inventario: cuatro flujos aprobados (alta de completa/pantalla, edición de completa/pantalla), cancelación sin escritura, consumo y refresh.
- Navegador eliminación/restauración: aprobado; permisos, ajustes por plataforma, separación de métricas, sincronización entre pestañas, inventario y móvil. API simuladas.
- Navegador paginación: navegación a página 2, selección de los 2.000 resultados, búsqueda de un registro fuera de la página inicial, reinicio a página 1 y tarjeta móvil aprobados.
- **No verificado**: CRUD/SQL real, EXPLAIN, planes e índices desplegados, SMTP/WhatsApp, producción remota, carga concurrente real, heap sostenido y recursos productivos. No se certifica capacidad de usuarios ni SLA.

Los scripts de servicio pasan a producción y requieren `npm run build` antes de reiniciar. `npm run dev` continúa disponible para desarrollo. `npm start` conserva el `prestart` existente que ejecuta migraciones pendientes; revisar el despliegue habitual y disponer de configuración/backup antes de arrancar el servicio real. No se ejecutó ese paso contra una base real. Producción conserva cookies seguras: mantener el acceso HTTPS.

## Cierre de validación local: 12 de octubre de 2026

La repetición final del navegador terminó correctamente y quedó registrada en
`docs/performance-browser-final.json`. Se esperó a que aparecieran los datos reales
del fixture antes de medir. Pasaron paginación, selección global, búsqueda fuera de
la página inicial, móvil y sincronización entre pestañas: una mutación con sello
sin cambios provocó exactamente una recarga completa (cuatro peticiones de lista).
Las siete pruebas específicas de rendimiento también se repitieron con éxito.

En esta repetición, apertura/búsqueda fueron 887,1/53,1 ms para completas y
665,5/69,8 ms para pantallas. Se mantuvieron 6.317/7.018 elementos DOM y 100
tarjetas móviles por módulo. La variabilidad frente a las muestras anteriores
impide interpretar estos tiempos aislados como una mejora uniforme de apertura.
Las API siguen simuladas; no son mediciones de producción.

El usuario indica que otro computador descarga Git periódicamente. No se ha
verificado si ese actualizador compila y reinicia. Las instrucciones de
`docs/ARRANQUE_MIGRACIONES.md` explican los pasos necesarios para activar estos
cambios en modo producción; subirlos a Git no certifica su puesta en servicio.

## Referencias técnicas

- [Next.js: build y arranque en producción](https://nextjs.org/docs/app/getting-started/deploying).
- [Prisma v6: QueryEvent y significado de duration](https://docs.prisma.io/docs/orm/v6/reference/prisma-client-reference).
- [Prisma v6: diagnóstico de consultas y múltiples SQL por llamada](https://www.prisma.io/docs/orm/v6/prisma-client/queries/query-optimization-performance).
- [MySQL 8.0: EXPLAIN y EXPLAIN ANALYZE](https://dev.mysql.com/doc/refman/8.0/en/explain.html).
- [MySQL 8.0: índices, incluidos funcionales según versión](https://dev.mysql.com/doc/refman/8.0/en/create-index.html).

La evidencia actual demuestra una combinación de **frontend ineficiente y trabajo redundante en código CRUD**, con configuración de arranque corregida. La participación de MySQL, red e infraestructura permanece **no verificada**. Los pendientes están identificados para continuar con acceso al entorno real, sin presentar las simulaciones como prueba de rendimiento productivo.
