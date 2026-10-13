# Migraciones al iniciar con PM2

Los comandos existentes `npm run dev` y `npm start` ejecutan ahora
`scripts/prepare-database.cjs` antes de iniciar Next. Tanto `ecosystem.config.js`
como `scripts/pm2-next.js` y `scripts/start-medplay.bat` utilizan estos comandos.
Después de descargar los cambios de GitHub, el reinicio habitual de PM2 aplica
las migraciones pendientes con `prisma migrate deploy` usando el CLI instalado.
Un `git pull` sin reiniciar el proceso no ejecuta este paso.

## Compilación antes del reinicio

Los lanzadores del servicio usan ahora `npm start` en modo producción. El
actualizador del computador que descarga Git debe completar `npm ci` (incluidas
las dependencias de desarrollo) y `npm run build` antes de reiniciar el servicio.
Sólo debe reiniciarlo si ambos comandos terminan correctamente. Descargar cambios
cada uno o cinco minutos, por sí solo, no publica una nueva compilación.

Si se administra mediante el archivo de PM2 de este repositorio, después del build
se puede aplicar `pm2 startOrRestart ecosystem.config.js --update-env`. Conservar
la configuración de entorno del servidor y verificar sus registros y acceso HTTPS.
No ejecutar dos actualizaciones simultáneas: el actualizador debe impedir que una
nueva ejecución se solape con una compilación todavía en curso.

El actualizador remoto no está incluido en este repositorio y su secuencia no se
ha verificado desde el entorno de auditoría.

## Compatibilidad temporal de eliminación

La eliminación que usa `deleteEmails` reconoce exclusivamente el error P2022 de
`plataformas.auditarEliminaciones`. Tras revertir la transacción fallida, reintenta
en una nueva transacción sin consultar esa columna y conserva la auditoría
activada (el valor por defecto de la migración). Cuando la columna existe se
respetan sus valores, incluido `false`. No ejecuta DDL ni marca migraciones como
aplicadas; cualquier otra columna faltante o fallo de auditoría sigue bloqueando
la operación y revierte sus cambios. Esto no repara el esquema ni habilita la
configuración de auditoría por plataforma en una base sin esa columna.

Validación local: 105 pruebas de eliminación aprobadas, incluidas compatibilidad,
rollback al fallar la auditoría y rechazo de errores de esquema distintos; revisión
TypeScript aprobada. Base de producción no accesible para verificación directa.

El script carga los mismos archivos de entorno que Next para el modo de inicio,
incluido `.env.local`, y respeta las variables ya configuradas por PM2.
La cuenta de `DATABASE_URL` debe tener permisos para aplicar las migraciones.
Prisma debe estar instalado en el servidor (actualmente es una devDependency).
El cliente Prisma generado ya está versionado en este repositorio.

Si no hay migraciones pendientes, el inicio continúa normalmente. Prisma utiliza
su historial y bloqueo de migraciones para coordinar los despliegues. Si falla,
el comando termina con error y Next no inicia con un esquema incompatible.
El detalle de Prisma aparece en los registros de PM2; no se intenta resolver
automáticamente un historial fallido ni marcar migraciones como aplicadas.
No se ejecutan `db push`, `migrate reset` ni borrados de datos para reparar el esquema.

Verificación en el servidor: comprobar el mensaje `[database] Migraciones al día`
en PM2 y repetir la operación que devolvía P2022. La validación local cubre el
arranque y sus errores con un ejecutor simulado; no prueba una base de producción.
