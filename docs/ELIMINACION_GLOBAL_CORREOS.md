# Eliminación definitiva de correos

## Causa identificada

Vencimientos combinaba registros de `pantallas` y `cuentascompletas`, pero borraba exclusivamente la fila seleccionada por ID. La API de pantallas eliminaba su cuenta compartida solo cuando no quedaban más pantallas; la de cuentas completas eliminaba únicamente esa venta. Inventario era una tabla independiente. Por tanto, un correo con varias ventas, pantallas, cuentas compartidas o existencias permanecía en otros módulos.

Además, las vistas tenían cachés en memoria y localStorage, distintos canales de actualización y una caché diaria de vencimientos. El stamp de cuentas completas usaba el máximo de `updatedAt`/ID: borrar una fila que no era la máxima podía dejar el stamp intacto.

## Tablas y relaciones revisadas

| Tabla | Relación y tratamiento |
| --- | --- |
| `cuentascompartidas` | Almacena correo y clave; puede haber varias filas del mismo correo. La FK de `pantallas.cuenta_id` utiliza CASCADE. Se eliminan todas las cuentas del correo. |
| `pantallas` | Correo mediante la cuenta compartida; FK hacia `usuarios.contacto`. Se eliminan primero todas las pantallas asociadas. |
| `cuentascompletas` | Correo en cada venta; pueden existir ventas del mismo correo para clientes distintos. Se eliminan todas las coincidencias. |
| `inventario` | UNIQUE(plataforma_id, correo), que permite el mismo correo en distintas plataformas. Se eliminan todas sus existencias. |
| `usuarios` | Identificador interno `contacto`, sin ID numérico. Se eliminan solamente los clientes afectados que no conservan pantallas ni cuentas completas. |
| `metricasmensuales` | Agregados derivados. Se invalidan y regeneran a partir de los registros vigentes. |
| `deletedAccountHistory` | Archivo recuperable anterior, independiente de datos activos. Se conserva como historial; no constituye la nueva auditoría. |
| `admin`, `plataformas`, logs de WhatsApp y notificaciones | Identidades/configuración/historial independientes. No se eliminan por coincidir el correo de una cuenta. |
| `emailDeletionAudit` | Nueva tabla independiente, UNIQUE(correo normalizado). Conserva identificadores, claves, clientes, plataformas y los datos originales. |
| `accountDataRevision` | Revisión persistente para invalidar vistas y cachés en otras pestañas/dispositivos. |

No se añade UNIQUE(correo) a ventas o cuentas compartidas: su multiplicidad puede ser válida. No se hace soft delete: la operación solicitada es definitiva y la trazabilidad reside en una tabla independiente. No se añade una FK desde la auditoría hacia registros eliminados. Su FK hacia Admin utiliza SET NULL y conserva el nombre del actor.

La investigación del código confirma que el esquema permite registros repetidos. **No se ha consultado una base real para cuantificar duplicados ni comprobar su estructura desplegada.**

## Operación implementada

`lib/emailDeletion.ts` normaliza con trim/lowercase, consulta coincidencias mediante SQL parametrizado y bloqueo de filas, conserva una instantánea y elimina todos los registros en una transacción SERIALIZABLE. La auditoría, la limpieza de clientes, la invalidación de métricas y el incremento de revisión pertenecen a esa misma transacción. Un fallo revierte todo. Los conflictos de serialización/unicidad tienen hasta tres reintentos.

Un lote de hasta 100 correos es una sola transacción, no una secuencia de eliminaciones parcialmente confirmadas. La eliminación abarca todas las plataformas del correo, incluyendo filas no seleccionadas en la pantalla.

La unicidad se garantiza por `emailDeletionAudit.correo`, no solamente mediante una consulta previa. Si el correo ya no tiene registros activos, repetir la eliminación no crea ni modifica la auditoría. Si posteriormente se crea una cuenta nueva con el mismo correo y se elimina, se conserva el mismo ID de auditoría y se añade la nueva instantánea al JSON de eventos. Las claves, plataformas y contactos anteriores siguen siendo consultables.

La generación de métricas utiliza transacciones SERIALIZABLE para evitar que una generación iniciada antes del borrado vuelva a guardar agregados anteriores tras la invalidación.

## APIs y módulos

- `DELETE /api/account-deletions`: `{ correos: string[], motivo?: string }`; requiere Admin autenticado y existente.
- Los DELETE por ID de pantallas, cuentas completas, cuentas compartidas e inventario ejecutan la misma eliminación global por defecto. Resuelven el correo dentro de la transacción.
- `?scope=record` expresa una retirada de fila, utilizada por los flujos existentes de traslado y consumo de inventario. No equivale a una eliminación definitiva del correo. Las ventas desde inventario se han actualizado para usar este alcance.
- Vencimientos, Pantallas, Cuentas completas, Inventario y la eliminación de cuenta compartida desde Nueva pantalla usan la operación global. Sus confirmaciones indican el alcance.
- `GET /api/account-data-revision?since=N` permite detectar borrados confirmados. Las pestañas reciben una señal mediante storage y los dispositivos visibles consultan la revisión cada 15 segundos y al recuperar el foco. Se invalidan los módulos de caché y las colas locales de cambio de clave para esos correos.
- Listados, filtros, disponibilidad de correos, búsquedas, credenciales, dashboard, exportaciones y scripts que consultan las tablas activas reciben datos sin los registros eliminados. Las respuestas de listados iniciadas antes de una eliminación se vuelven a consultar; las cachés no son el mecanismo de borrado.
- `GET /api/admin/deletions` admite correo, clave, plataforma, fechas inclusivas en Bogotá, orden y paginación. `?id=N` devuelve los detalles originales.
- `/admin/deletions` contiene la vista de auditoría. Se accede desde el Admin y desde la navegación principal.

El archivo recuperable anterior y la nueva auditoría son intencionadamente consultables como historial, no como cuentas vigentes. No se inventan auditorías históricas a partir de un archivo que no conserva todos los registros originales.

## Validación sin MySQL

Por indicación del usuario, las pruebas utilizan un adaptador transaccional en memoria; no consultan ni modifican datos reales.

`npm run test:email-deletion` cubre múltiples tablas/plataformas, duplicados con espacios y mayúsculas, clientes compartidos, auditoría única, reintentos, recreación posterior, rollback en cada etapa, lotes atómicos, SQL parametrizado, autorización/validación de los handlers reales, consumo de inventario, filtros de Admin, sincronización y respuestas en vuelo.

Se comprueban además el esquema Prisma, TypeScript, lint y la compilación Next. Estos controles no sustituyen la ejecución de las migraciones y los bloqueos en MySQL.

Resultados: 30 pruebas automatizadas pasan. La prueba de navegador `npm run test:email-deletion:ui` (requiere `npm run build` previo y Edge instalado) usa APIs simuladas y verifica eliminación desde Vencimientos, regreso a vistas con caché, actualización de una segunda pestaña, inventario, filtros por correo/clave/plataforma/fechas/orden, detalles y presentación móvil. También verifica que los endpoints protegidos rechazan peticiones sin sesión contra el servidor Next real. La migración se ha comparado con el diff generado por Prisma entre los esquemas anterior y nuevo, sin conexión a MySQL.

## Aplicación en el entorno real

1. Aplicar las migraciones con `npx prisma migrate deploy` antes de iniciar la nueva versión. El cliente Prisma generado se incluye actualizado.
2. En una base de pruebas, crear el mismo correo con varias plataformas, ventas, pantallas y existencias, incluyendo variantes de capitalización/espacios.
3. Eliminarlo desde Vencimientos y consultar directamente las cuatro tablas activas y los clientes afectados; revisar los endpoints de búsqueda, listados y métricas.
4. Repetir desde otros módulos y verificar que existe una sola fila de auditoría sin eventos duplicados.
5. Inyectar un fallo SQL antes del commit y comprobar la reversión completa. Ejecutar dos eliminaciones concurrentes y generación de métricas concurrente.
6. Verificar FKs/CASCADE/SET NULL y planes de ejecución en la versión real de MySQL. Las consultas normalizadas pueden recorrer las tablas: revisar rendimiento y límites de transacción con el volumen real.

La migración no se ha ejecutado en ninguna base de datos en esta sesión.
