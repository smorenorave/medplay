# Gestión persistente por cambio de clave

Esta implementación sustituye el borrado automático de los commits anteriores.

## Regla actual

Cambiar realmente una contraseña marca TODOS los registros existentes de cuentas
completas y pantallas del mismo correo normalizado y plataforma como gestionados.
No se limita por vencimiento. Se conserva cada ID, contacto, fechas, comentarios,
importes y demás datos. Se actualiza la contraseña compartida con el alcance de
correo + plataforma. Otro correo o plataforma no cambia. Guardar sin cambiar
contraseña no marca registros.

La contraseña y el estado passwordManagedAt se guardan en una transacción
Serializable. Un fallo revierte todo. No hay DELETE ni creación de copias en el
flujo de contraseña; repetir el cambio actualiza las mismas filas.

## Lectura e interfaz

GET /api/password-managed-records requiere administrador y consulta filas reales,
con todos sus campos y relaciones. Vencimientos combina esa respuesta con sus
consultas habituales. Los gestionados van a la sección existente Correos con
cambio de clave; los demás permanecen en pendientes. Al entrar se consulta el
servidor; no se restaura esa clasificación desde localStorage.

La lista superior muestra una fila por registro, con plataforma, tipo, contacto,
nombre, correo, clave, pantalla, PIN, proveedor, fechas, meses, importes, estado,
comentarios y fecha de gestión. Ver todos los datos permite consultar campos
adicionales. Sustituye la antigua lista local de correo/clave, sus entradas
manuales y Limpiar lista: estas acciones no correspondían a registros persistidos.
Copiar correos se conserva. No se envía ningún mensaje automáticamente.

Eliminar reutiliza RecordDeletionDialog y /api/record-deletions, con la acción
assignment. El servidor solo acepta esa acción para un registro gestionado y
valida ID y cuenta. Elimina esa fila, conserva las demás, clientes e inventario;
para la última pantalla conserva también el padre. La auditoría existente guarda
el registro eliminado. Los flujos de eliminación normales conservan sus decisiones.

## Causa anterior

La versión original guardaba marcas locales en __pw_resolved_expirations_v1 y
filtraba el listado sin cambiar la base. Después se implementó el borrado automático
por correo. Ambos comportamientos quedan sustituidos por el estado de gestión
persistido por registro y por la combinación correo + plataforma. El refresco ya
no compara solo IDs: debe aceptar cambios de estado aunque sean las mismas filas.

## Instalación

Aplicar la migración 20261014000000_password_managed_records antes de servir la
nueva versión. Añade una columna nullable en cuentascompletas y otra en pantallas;
las filas existentes comienzan pendientes. El cliente Prisma actualizado está
incluido. El arranque configurado ejecuta migrate deploy, pero descargar Git por
sí solo no aplica la migración ni publica el build: compilar y reiniciar el proceso.

No se reconstruyen registros borrados por versiones anteriores ni se convierten
marcas locales históricas en estados de base de datos. Cualquier recuperación
necesita revisión independiente del historial existente.

## Verificación

68 pruebas aprobadas de gestión, listado autenticado, borrado individual e
inventario; incluye separación entre plataformas/correos, preservación de datos,
IDs grandes, cambios repetidos y rollback. Pruebas de navegador A–E aprobadas
para cuentas completas y pantallas: tres gestionados, controles no afectados,
recarga y eliminación de uno. API y transacciones simuladas; no se borraron clientes
reales. La migración y los bloqueos deben validarse en MySQL de pruebas antes del
despliegue; no se aplicaron cambios al servidor remoto desde este equipo.
