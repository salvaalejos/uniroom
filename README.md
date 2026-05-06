# REVISIONES DE PRUEBAS RECIENTES CON MERGE DE TODOS LOS PUNTOS TRATADOS EN WHATSAPP 
## FALLOS INMEDIATOS A RESOLVER (ahorita los resuelv0, que la noche aún es joven como yo 💃): 

- La fotografía y nombre de usuario en la reseña son simulados (mostrar reales). 
- Checar apartado de cuartos al seleccionar una casa. 
- Al agregar casa, los cuartos no se ven reflejados, eliminar por ahora el apartado de casa.
- Si el arrendador ha confirmado la cita en la notificación, si la confirma dos veces, se envía correo nuevamente (cambiar para que si selecciona dos veces, mostrar mensaje "has respondido ya a este mensaje" and no mandar nada). 
- Al recién pagar la renta, el apartado de notificaciones no te deja mandar notificaciones a menos que cierres sesión. 

## Completados:
- ~~Apartado de Guardar Tarjeta no guarda tarjeta.~~ 
- ~~Botón de "Rechazar" visita no funciona correctamente.~~ 
- ~~Notificación duplicada en arrendador al momento de Agendar cita por parte del estudiante (una con hora simulada y otra con hora real [eliminar la simulada]).~~ 
- ~~Lo mismo que arriba pero con vista de estudiante xd.~~ 
- ~~Eliminar botón de Contactar (comentar y guardar para después).~~
- ~~Editar perfil permite eliminar número de teléfono.~~
- ~~La pestaña de Mi Casa solo se actualiza al cerrar sesión.~~
- ~~Falta agregar apartado de "Otro" a los servicios y Restricciones. (Omitir y definir en descripción de inmueble, agregaremos más a la BD más adelante, para evitar poner "Otro").~~
- ~~Falta agregar botón de "Come Back" al Agregar Inmueble o Editar Inmueble Screen.~~
- ~~Falta modo oscuro para pestaña de carga (cargando propiedades).~~
- ~~Falta vinculación de tarjeta de parte del arrendador al crear la cuenta (seguro requerirá una modificación a la BD, ahora si la última) (Chava).~~ 
- ~~Al agendar la cita, debe redirigir a la pestaña de 50 pesos de cobro para la cita. (NO IMPLEMENTADO)~~
- ~~Falta modo oscuro el apartado de notificaciones y pestaña de agregar inmueble (also editar inmueble).~~
- ~~Falta modo oscuro para visualización de inmueble.~~
- ~~Falta modo oscuro para apartado de Agendar Cita.~~
- ~~Agregar modo oscuro al modal de Confirmar Cita y Solicitud enviada (al agendar cita).~~
- ~~Agregar modo oscuro a la vista de notificación.~~
- ~~Agregar modo oscuro para modal de confirmar pago de renta.~~
- ~~Agregar modo oscuro para módulo de pago.~~
- ~~Agregar modo oscuro para mapa de rutas.~~
- ~~Agregar modo oscuro al modal de calificar inmueble.~~
- ~~Agregar modo oscuro para modal de Nuevo Reporte (Notificación).~~
- ~~Al momento de editar perfíl el usuario puede eliminar su correo electrónico pero no recibe algún aviso, solamente dice "perfíl editado" y deja el correo como tal [mostrar aviso de que correo es no editable] (detalle estético).~~


## DETALLES MENORES: 
- Al no seleccionar foto de perfíl al inicio y luego en editar perfil seleccionar una foto, el icono de seleccionar foto de perfíl desaparece. Sin embargo si aparece foto de perfíl (detalle estético). 

- Si el arrendador no cuenta con un estudiante rentando en alguno de sus inmuebles y desea mandar una notificación, mostrar en apartado Para: "Por el momento no tienes residentes". (detalle estético).

- Agregar cambio de color de modo oscuro a botones de precios en mapa (detalle estético). 

- Esconder barra de notificaciones superior al utilizar la aplicación (detalle estético). 

- Al momento de ver notificaciones, el icono de barra de navegación mantiene el número incluso si se vieron las notificaciones (detalle estético). 

- Al ingresar mal las credenciales de usuario, cambiar mensaje por "Correo o contraseña incorrectos". 

- Al pulsar el botón de eliminar notificaciones leídas, se mantienen las notificaciones de citas aunque se especifique que estas se mantienen (detalle estético). 



## PROBLEMAS A LARGO PLAZO: 
- Si un estudiante agenda una cita y el arrendador la acepta, esta debe no estar disponible más tiempo. 