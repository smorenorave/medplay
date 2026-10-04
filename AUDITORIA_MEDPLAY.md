# Auditoría técnica y de producto de Medplay

## Actualización de dependencias — 3 de octubre de 2026

- La auditoría completa pasó de 27 alertas (23 altas, 4 moderadas) a 5 altas. `npm audit --omit=dev` reporta 0 vulnerabilidades.
- Next.js y su configuración ESLint se actualizaron a 15.5.27; Nodemailer a 10.0.14. El archivo de bloqueo incluye Sharp 0.35.5 y las actualizaciones compatibles de las demás dependencias afectadas.
- Los overrides de `package.json` fuerzan PostCSS >=8.5.28, DeepmergeTS >=8.0.2 dentro de Prisma y UUID >=11.1.1 dentro de ExcelJS. Revisarlos al actualizar esas dependencias para retirarlos cuando sus versiones originales incorporen las correcciones.
- Se retiró Puppeteer, sin usos en el código; la automatización WhatsApp conserva Playwright. La exportación de registros reemplaza SheetJS (`xlsx`) por ExcelJS, manteniendo las hojas de registros y ranking, los valores numéricos y la alternativa CSV.
- La versión mínima de Node.js es 20.9.0, por los requisitos de las dependencias actualizadas.
- Las cinco alertas restantes corresponden a una única cadena de desarrollo: `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces`. El [aviso GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) no tiene versión corregida publicada. Los patrones de lint deben mantenerse como configuración confiable. No se rebajó ESLint a una configuración de Next.js 14 para ocultar estas alertas; siguen pendientes de corrección upstream.
- Validación: TypeScript, lint (0 errores y 61 advertencias), compilación de producción, 9 pruebas existentes, escritura/lectura Excel de ambas hojas, validación del esquema Prisma con URL ficticia, transporte local de Nodemailer sin envío y biblioteca nativa Sharp. La compilación conserva avisos de JOSE sobre APIs de compresión en Edge. No se probaron conexiones MySQL ni entregas SMTP reales.

Fecha: 2 de septiembre de 2026.

## Hallazgos y tratamiento

| Prioridad | Problema | Archivo o módulo | Recomendación / estado |
|---|---|---|---|
| Crítico | La recuperación generaba el token, pero el entorno no tenía SMTP ni remitente configurados; el error quedaba oculto por la respuesta genérica. | `.env`, `lib/mailer.ts`, `src/app/api/admin/password-recovery/request/route.ts` | Se añadió validación central, timeouts, comprobación SMTP administrativa y logs correlacionados. Aún se deben suministrar credenciales reales en producción. |
| Alto | Al seleccionar otro correo en Pantallas, la clave anterior permanecía en el formulario. | `src/components/viewers/PantallasViewer.tsx` | Corregido: la opción conserva cuenta y clave asociadas; la clave es derivada y de solo lectura. |
| Alto | El panel de métricas existente cargaba conjuntos completos en el navegador y no era el inicio operativo. | `src/app/admin/page.tsx`, `src/app/api/dashboard/route.ts` | Se creó un resumen inicial agregado en servidor. Mantener paginados los reportes detallados. |
| Alto | El secreto de autenticación y las credenciales de infraestructura podían terminar en un archivo versionado. | `.env`, `.gitignore` | `.env` fue retirado del índice y se conserva `.env.example` sin secretos. Rotar cualquier secreto que haya estado en el historial. |
| Alto | Varias mutaciones administrativas no tenían una frontera de autorización uniforme. | `src/middleware.ts`, rutas `src/app/api/**` | Corregido mediante protección central; conservar una lista mínima de rutas públicas. |
| Medio | La navegación horizontal crecía sin jerarquía y obligaba a recorrer la página. | `src/app/page.tsx` | Reorganizada como navegación lateral adaptable, con inicio operativo. |
| Medio | Pantallas no ofrecía priorización por estado, vencimiento o anotaciones. | `src/components/viewers/PantallasViewer.tsx` | Añadido Centro de operaciones con accesos rápidos interactivos. |
| Medio | Los viewers todavía descargan hasta 25.000 registros para búsqueda, agrupación y exportación. | `PantallasViewer.tsx`, `CuentasCompletasViewer.tsx` | Migrar progresivamente búsqueda, filtros y exportaciones a consultas paginadas del servidor. |
| Medio | `page.tsx` y los viewers concentran presentación, caché, red y reglas de negocio. | `src/app/page.tsx`, `src/components/viewers/*` | Extraer módulos por dominio y hooks de consulta/mutación en iteraciones pequeñas con pruebas de regresión. |
| Medio | El rate limit de recuperación vive en memoria y se reinicia o diverge entre instancias. | `password-recovery/request/route.ts` | Para múltiples instancias, moverlo a Redis o tabla con TTL. |
| Bajo | Existen dos implementaciones de transporte SMTP. | `lib/mailer.ts`, `src/app/api/hours-report/route.ts` | Reutilizar el mailer central en el reporte de horas para unificar timeouts y diagnóstico. |
| Bajo | No existe una suite automatizada de regresión visible para los flujos críticos. | Proyecto | Añadir pruebas de integración para login, recuperación de un solo uso, reasignación de cuentas y vencimientos. |

## Arquitectura y preparación para crecimiento

La aplicación tiene separación básica entre rutas, componentes y utilidades, pero los viewers principales siguen siendo módulos monolíticos. Los índices recientes sobre estado, vencimiento y fecha de actualización mejoran las consultas operativas. Para crecer, la siguiente prioridad debe ser paginación y filtrado en servidor, seguida por pruebas de integración y un rate limit compartido.

## Seguridad de recuperación

El flujo usa un token aleatorio de 256 bits; solo persiste su hash SHA-256, expira en 30 minutos, invalida solicitudes anteriores y queda marcado como usado tras el cambio. Las respuestas no permiten enumerar correos registrados. Los eventos de solicitud, fallo de entrega y restablecimiento quedan auditados sin guardar el token ni la contraseña.

## Proton

No quedan módulos, endpoints, componentes ni referencias activas de Proton. Los archivos eliminados pueden seguir apareciendo con estado `D` en Git hasta confirmar el commit, lo cual es normal y no representa una referencia ejecutable.
