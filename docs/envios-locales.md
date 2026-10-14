# Recordatorios desde el listado local

Se prepararon los 68 servicios del listado del 13 de octubre de 2026, agrupados
en 61 contactos. No se necesita MySQL ni `.env`. Se incluyen todas las filas
del listado, sin volver a filtrar por fecha. Se usa el mensaje de
`enviar_vencidos.js`, con saludo, servicios, vencimiento, precio cuando existe
y nota de Nequi. No se incluyen contraseñas ni comentarios. El listado no
contiene número de pantalla: no se inventa ese dato.

Desde `C:\Proyectos\medplay`:

```powershell
node scripts/enviar_vencidos_local.cjs --preview
node scripts/enviar_vencidos_local.cjs --enviar
node scripts/enviar_vencidos_local.cjs --archivo "C:\ruta\listado.txt" --preview
```

El primer comando genera `.local-vencidos/vista-previa.txt` sin abrir el
navegador ni enviar. El segundo abre Edge con el perfil de WhatsApp del script
existente; inicia sesión escaneando el QR si hace falta. También puedes ejecutar
`scripts/ejecutar_enviar_vencidos_local.bat` con doble clic para enviar.
Se mantiene la pausa de 18 segundos entre contactos del script original.

Los datos preparados están en `.local-vencidos/datos.json`, excluidos de Git.
El comando principal detecta automáticamente números y usuarios en un mismo
lote. `--usuarios` es un filtro opcional, no un requisito para poder enviarlos.
El lanzador local reutiliza `enviar_vencidos.js` y su módulo compartido de
usuarios; no mantiene una segunda implementación de envío.

`node scripts/enviar_vencidos.js` continúa siendo el comando independiente
para la base de datos: sus consultas, condiciones de vencimiento, formatos,
fechas y ruta telefónica se conservan. La rama nueva se ejecuta exclusivamente
para usuarios. No consulta el listado local al ejecutar el modo de base de datos.

Para los usuarios se reutiliza `wa.me/usuario?text=...` y la redirección
con `username` y `type=username` hacia WhatsApp Web. Se verifica el usuario
exacto en la cabecera antes de escribir. Esta ruta produjo cuatro registros
ENVIADO en el lote anterior; no todos los usuarios fueron accesibles.

El historial `.local-vencidos/envios.jsonl` se conserva entre ejecuciones y
días. Los contactos enviados, intentados, fallidos u omitidos no se repiten.
Los usuarios se procesan mediante el módulo compartido `whatsapp-username.cjs`.
Si un envío
no quedó confirmado, revisa ese chat antes de reintentarlo: que el editor se
vacíe no prueba entrega al destinatario. Para habilitar un reintento, elimina
únicamente los eventos de ese contacto después de comprobar que no se envió;
para usuarios también existe una reserva persistente en `.logs/usuarios-envios/`.
No retires una reserva si otro proceso está activo o el envío es incierto.
No borres todo el historial para continuar un lote interrumpido.

El archivo `envio.lock` impide dos envíos locales simultáneos. Si el proceso
terminó abruptamente y dejó el archivo, comprueba que el script ya no esté
ejecutándose antes de eliminarlo. El navegador queda abierto al finalizar.

Para otro listado con las mismas columnas tabuladas:

```powershell
node scripts/enviar_vencidos.js --archivo "C:\ruta\listado.txt" --preview
node scripts/enviar_vencidos.js --archivo "C:\ruta\listado.txt" --enviar
```

Todos los listados locales comparten el historial: un contacto ya procesado
se omitirá aunque aparezca en otro archivo.

## Exclusiones y errores

`.local-vencidos/usuarios-excluidos.json` conserva los tres usuarios excluidos
por el operador. Para solicitudes de baja, crea `.local-vencidos/no-contactar.json`
como una lista de cadenas, por ejemplo `["@usuario", "+573001234567"]`.
No contiene claves ni contraseñas. Las exclusiones se aplican a todos los destinatarios, incluidos los teléfonos
del modo de base de datos. Cada omisión registra su motivo. Una lista mal
formada detiene el lote antes de abrir WhatsApp.

Los errores y restricciones visibles generan ERROR u OMITIDO y el lote continúa.
No se adivinan claves de usuario ni se intenta eludir privacidad o bloqueos.
Si WhatsApp muestra un límite temporal, se detiene el lote y quedan pendientes
los demás contactos. Se conserva la pausa existente de 18 segundos; esa pausa
no constituye una garantía de cuota autorizada por WhatsApp.

Las reservas de usuarios son atómicas y sobreviven al archivado de logs. En modo
base de datos se separan por fecha UTC, como el control diario ya existente;
en modo local permanecen para el mismo destinatario y mensaje. Una interrupción
después de iniciar un envío se considera incierta y nunca se reintenta sola.

No siempre WhatsApp revela un bloqueo o una restricción. Una solicitud de baja
debe registrarse en la lista: el script no interpreta automáticamente las
conversaciones privadas. ENVIADO indica que el editor quedó vacío tras Enter;
no acredita entrega ni lectura.

## Verificación

```powershell
node --test tests/whatsappDelivery.test.cjs tests/localVencidos.test.cjs tests/vencidosControls.test.cjs
```

Las pruebas no envían mensajes ni consultan MySQL. Cubren el lote mixto,
redirección por usuario, identidad, restricciones, reservas concurrentes,
envíos inciertos, bajas y preservación exacta de las funciones de negocio y
envío telefónico anteriores a esta integración. La prueba de conservación
usa huellas en `tests/vencidos-preserved-functions.json`.

## Corrección autorizada de controles telefónicos

El modo de base de datos consulta tanto `envios_log.jsonl` como el archivo
`envios_log_YYYY-MM-DD.jsonl` del día. Un lote archivado sigue impidiendo
reenvíos confirmados en posteriores ejecuciones de ese mismo día. Se conserva
el día UTC del control histórico; al día siguiente el contacto puede volver
a ser elegible conforme a las consultas existentes. No se cambia el método
telefónico ni las reglas de vencimiento. Si el historial existe pero no se
puede leer o contiene JSON corrupto, el proceso se detiene antes de enviar.
Esto protege ejecuciones consecutivas; no añade un bloqueo entre procesos
telefónicos simultáneos ni acredita entrega real al destinatario.
