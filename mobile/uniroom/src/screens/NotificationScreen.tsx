// SI VEN TODO EL ARCHIVO MODIFICADO, SI, LE PEDÍ A GEMINI QUE REEPLAZARÁ TODO EL ARCHIVO. 
// CON CORAJE, PERO LA IA SIEMPRE VA GANANDO 

import React, { useState, useEffect, useRef } from "react";
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, SafeAreaView, TextInput, Alert, ScrollView, RefreshControl, Image, Platform, ActivityIndicator
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { socketService } from '../services/websocketService';
import { obtenerMisCitas, actualizarEstadoCita, marcarCitaRealizada, decisionRenta, crearCalificacionEstudiante, obtenerPerfil } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const hostUri = Constants.expoConfig?.hostUri?.split(':').shift();
const BACKEND_URL = hostUri ? `http://${hostUri}:3000` : 'http://localhost:3000';

// --- TIPOS UNIFICADOS ---
type Notificacion = {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  remitente: string;
  fecha: string;
  relacionado_a?: string;
  datosExtra?: any;
};

interface ContactoType {
  id_usuario: string;
  nombre: string;
}

export default function NotificationScreen() {
  // --- ESTADOS ---
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [notificacionSeleccionada, setNotificacionSeleccionada] = useState<Notificacion | null>(null);
  const [cargando, setCargando] = useState(false);
  
  const [userId, setUserId] = useState<string>("");
  const [userRole, setUserRole] = useState<"estudiante" | "anfitrion">("estudiante");

  const [modalVisible, setModalVisible] = useState(false);
  const [modalFormularioVisible, setModalFormularioVisible] = useState(false);
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [contactos, setContactos] = useState<ContactoType[]>([]);
  const [destinatarioSeleccionado, setDestinatarioSeleccionado] = useState<string | null>(null);

  // Nuevos estados para calificación de estudiante
  const [modalCalificarEstudianteVisible, setModalCalificarEstudianteVisible] = useState(false);
  const [estudianteACalificar, setEstudianteACalificar] = useState<{ id: string; nombre: string } | null>(null);
  const [ratingEstudiante, setRatingEstudiante] = useState(0);
  const [comentarioEstudiante, setComentarioEstudiante] = useState("");
  const [enviandoCalificacion, setEnviandoCalificacion] = useState(false);
  const [ratingEstudianteMap, setRatingEstudianteMap] = useState<Record<string, number>>({});

  // Ref para acceder al userRole actual dentro de los listeners
  const userRoleRef = useRef(userRole);
  useEffect(() => { userRoleRef.current = userRole; }, [userRole]);
  const userIdRef = useRef(userId);
  useEffect(() => { userIdRef.current = userId; }, [userId]);

  // --- INICIALIZACIÓN Y WEBSOCKETS ---
  useEffect(() => {
    const init = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      
      const payload = JSON.parse(atob(token.split('.')[1]));
      const id = payload.sub || payload.id_usuario; 
      const rol = payload.rol === 'ESTUDIANTE' ? 'estudiante' : 'anfitrion';
      
      setUserId(id);
      setUserRole(rol);
      
      socketService.connect(id, rol);
      await cargarTodo(id, rol);

      setContactos([
        { id_usuario: "67012f3e-b644-4c33-ba43-8756632b2508", nombre: "Pati Chapoy" },
        { id_usuario: "5024b108-a41a-4401-9f4b-bc8392ce48b8", nombre: "Administración" },
      ]);
    };

    init();

    // Listeners existentes
    socketService.on('solicitud_cita', (data) => {
      if (userRoleRef.current === 'anfitrion') {
        const nuevaNotif: Notificacion = {
          id: data.id,
          tipo: 'solicitud_cita',
          titulo: 'Nueva solicitud de visita',
          mensaje: `${data.estudianteNombre} quiere visitar tu propiedad ${data.propiedadTitulo} el ${new Date(data.fecha).toLocaleString()}`,
          leida: false,
          remitente: data.estudianteNombre,
          fecha: new Date().toLocaleString(),
          relacionado_a: data.id, // ID de la cita
          datosExtra: data,
        };
        setNotificaciones(prev => [nuevaNotif, ...prev]);
      }
    });

    socketService.on('respuesta_cita', (data) => {
      if (userRoleRef.current === 'estudiante') {
        const nuevaNotif: Notificacion = {
          id: data.id,
          tipo: 'respuesta_cita',
          titulo: data.aceptada ? 'Cita aceptada' : 'Cita rechazada',
          mensaje: data.aceptada
            ? `Tu solicitud para visitar ${data.propiedadTitulo} ha sido ACEPTADA. Fecha: ${new Date(data.fecha).toLocaleString()}`
            : `Tu solicitud para visitar ${data.propiedadTitulo} fue RECHAZADA. Motivo: ${data.motivo || 'No especificado'}.`,
          leida: false,
          remitente: data.anfitrionNombre,
          fecha: new Date().toLocaleString(),
          relacionado_a: data.id, // ID de la cita
          datosExtra: data,
        };
        setNotificaciones(prev => [nuevaNotif, ...prev]);
      }
    });

    // NUEVO: Listener para decisión de renta pendiente (anfitrión)
    socketService.on('decision_renta_pendiente', (data) => {
      if (userRoleRef.current === 'anfitrion') {
        const nuevaNotif: Notificacion = {
          id: `dr_${data.id}`,
          tipo: 'decision_renta_pendiente',
          titulo: 'Decisión de renta requerida',
          mensaje: data.mensaje,
          leida: false,
          remitente: 'Sistema UniRoom',
          fecha: new Date().toLocaleString(),
          relacionado_a: data.id, // ID de la cita
          datosExtra: data,
        };
        setNotificaciones(prev => [nuevaNotif, ...prev]);
      }
    });

    // NUEVO: Listener para decisión de renta (estudiante)
    socketService.on('decision_renta', (data) => {
      if (userRoleRef.current === 'estudiante') {
        const nuevaNotif: Notificacion = {
          id: `dr_resp_${data.id}`,
          tipo: 'decision_renta',
          titulo: data.aceptada ? '¡Renta aprobada!' : 'Renta rechazada',
          mensaje: data.mensaje,
          leida: false,
          remitente: data.anfitrionNombre,
          fecha: new Date().toLocaleString(),
          relacionado_a: data.id, // ID de la cita
          datosExtra: data,
        };
        setNotificaciones(prev => [nuevaNotif, ...prev]);
      }
    });

    // NUEVO: Listener para calificar estudiante (arrendador)
    socketService.on('calificar_estudiante', (data) => {
      if (userRoleRef.current === 'anfitrion') {
        const nuevaNotif: Notificacion = {
          id: `calif_${data.estudianteId}`,
          tipo: 'calificar_estudiante',
          titulo: 'Califica al estudiante',
          mensaje: data.mensaje,
          leida: false,
          remitente: data.estudianteNombre,
          fecha: new Date().toLocaleString(),
          datosExtra: data,
          relacionado_a: data.estudianteId,
        };
        setNotificaciones(prev => [nuevaNotif, ...prev]);
        
        // Cargar rating del estudiante
        cargarRatingEstudiante(data.estudianteId);
      }
    });

    return () => {
      socketService.off('solicitud_cita');
      socketService.off('respuesta_cita');
      socketService.off('decision_renta_pendiente');
      socketService.off('decision_renta');
      socketService.off('calificar_estudiante');
    };
  }, []);

  // --- FUNCIONES DE CARGA DE DATOS ---
  const cargarTodo = async (idActual: string, rolActual: string) => {
    setCargando(true);
    await Promise.all([
      cargarNotificacionesBD(idActual),
      cargarCitasComoNotificaciones(rolActual)
    ]);
    setCargando(false);
  };

  const onRefresh = async () => {
    if(userId) await cargarTodo(userId, userRole);
  };

  // Cargar rating de estudiante
  const cargarRatingEstudiante = async (idEstudiante: string) => {
    try {
      const response = await obtenerPerfil(idEstudiante);
      if (response && response.rating) {
        setRatingEstudianteMap(prev => ({ ...prev, [idEstudiante]: response.rating }));
      }
    } catch (error) {
      console.error("Error cargando rating de estudiante:", error);
    }
  };

  const cargarNotificacionesBD = async (idActual: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const respuesta = await fetch(`${BACKEND_URL}/api/notificaciones/${idActual}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (respuesta.ok) {
        const datos = await respuesta.json();
        const formateadas: Notificacion[] = datos.map((notif: any) => {
          const d = new Date(notif.fecha_creacion);
          return {
            id: notif.id,
            tipo: notif.tipo || 'mensaje',
            titulo: notif.titulo,
            mensaje: notif.mensaje,
            leida: notif.visto,
            remitente: notif.remitente_nombre,
            fecha: `${d.getDate()}/${d.getMonth() + 1} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`,
            relacionado_a: notif.relacionado_a,
            datosExtra: notif
          };
        });
        
        setNotificaciones(prev => {
          const ids = new Set(formateadas.map(n => n.id));
          const resto = prev.filter(n => !ids.has(n.id));
          return [...formateadas, ...resto];
        });
      }
    } catch (error) {
      console.error("Error conectando al backend:", error);
    }
  };

  const cargarCitasComoNotificaciones = async (rolActual: string) => {
    try {
      const citas = await obtenerMisCitas();
      const notifsCitas: Notificacion[] = citas.map((cita: any) => {
        const esEstudiante = rolActual === 'estudiante';
        const titular = esEstudiante ? cita.anfitrion?.nombre : cita.estudiante?.nombre;
        let titulo = '', mensaje = '', tipo = '';
        
        if (cita.estado === 'PENDIENTE') {
          titulo = esEstudiante ? 'Cita pendiente' : 'Nueva solicitud de visita';
          mensaje = esEstudiante
            ? `Tienes una cita pendiente con ${cita.anfitrion?.nombre} para ${cita.inmueble.titulo}`
            : `${cita.estudiante?.nombre} solicitó visitar ${cita.inmueble.titulo}`;
          tipo = 'solicitud_cita';
        } else if (cita.estado === 'ACEPTADA') {
          titulo = 'Cita aceptada';
          mensaje = `Tu cita para ${cita.inmueble.titulo} ha sido ACEPTADA. Recuerda marcarla como realizada después de la visita.`;
          tipo = 'respuesta_cita';
        } else if (cita.estado === 'RECHAZADA') {
          titulo = 'Cita rechazada';
          mensaje = `Tu cita para ${cita.inmueble.titulo} fue RECHAZADA.`;
          tipo = 'respuesta_cita';
        } else if (cita.estado === 'REALIZADA') {
          if (!esEstudiante) {
            titulo = 'Visita realizada — Decisión pendiente';
            mensaje = `La visita de ${cita.estudiante?.nombre} a ${cita.inmueble.titulo} se realizó. ¿Deseas autorizarlo para rentar?`;
            tipo = 'decision_renta_pendiente';
          } else {
            titulo = 'Visita realizada';
            mensaje = `Tu visita a ${cita.inmueble.titulo} se realizó. Espera la decisión del arrendador.`;
            tipo = 'respuesta_cita';
          }
        } else if (cita.estado === 'RENTA_APROBADA') {
          titulo = '¡Renta aprobada!';
          mensaje = `Has sido autorizado para rentar ${cita.inmueble.titulo}. ¡Procede al pago desde el detalle del inmueble!`;
          tipo = 'decision_renta';
        } else if (cita.estado === 'RENTA_RECHAZADA') {
          titulo = 'Renta rechazada';
          mensaje = `El arrendador decidió no autorizarte para rentar ${cita.inmueble.titulo}.`;
          tipo = 'decision_renta';
        }

        return {
          id: cita.id_cita,
          tipo,
          titulo,
          mensaje,
          leida: false,
          remitente: titular || 'Sistema',
          fecha: new Date(cita.fecha_hora).toLocaleString(),
          datosExtra: cita,
        };
      }).filter(n => n.tipo !== '');
      
      setNotificaciones(prev => {
        const idsExistentes = new Set(prev.map(n => n.id));
        const nuevas = notifsCitas.filter(n => !idsExistentes.has(n.id));
        return [...nuevas, ...prev];
      });
    } catch (error) {
      console.error("Error cargando citas:", error);
    }
  };

  // --- INTERACCIONES ---
  const abrirDetalle = async (item: Notificacion) => {
    setNotificacionSeleccionada(item);
    setModalVisible(true);

    if (!item.leida) {
      setNotificaciones(prev => prev.map(n => n.id === item.id ? { ...n, leida: true } : n));
      try {
        const token = await AsyncStorage.getItem('token');
        await fetch(`${BACKEND_URL}/api/notificaciones/${item.id}/visto`, { 
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (e) { /* Ignorar si es una cita local */ }
    }

    // Si es notificación para calificar estudiante, cargar datos
    if (item.tipo === 'calificar_estudiante' && item.relacionado_a) {
      setEstudianteACalificar({ 
        id: item.relacionado_a, 
        nombre: item.remitente 
      });
      // Cargar rating actual
      cargarRatingEstudiante(item.relacionado_a);
    }
  };

  const handleCalificarEstudiante = async () => {
    if (!estudianteACalificar || ratingEstudiante === 0) {
      Alert.alert("Error", "Por favor selecciona una calificación");
      return;
    }

    setEnviandoCalificacion(true);
    try {
      await crearCalificacionEstudiante({
        id_estudiante: estudianteACalificar.id,
        calificacion: ratingEstudiante,
        comentario: comentarioEstudiante || undefined,
      });
      Alert.alert("Éxito", "Has calificado al estudiante correctamente");
      setModalCalificarEstudianteVisible(false);
      setEstudianteACalificar(null);
      setRatingEstudiante(0);
      setComentarioEstudiante("");

      // Recargar notificaciones
      if (userId) await cargarTodo(userId, userRole);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setEnviandoCalificacion(false);
    }
  };

  const responderSolicitud = async (notif: Notificacion, aceptar: boolean, motivoRechazo?: string) => {
    const citaId = notif.relacionado_a || notif.datosExtra?.id_cita || notif.id;
    if (!citaId) return;

    try {
      const nuevoEstado = aceptar ? 'ACEPTADA' : 'RECHAZADA';
      await actualizarEstadoCita(citaId, nuevoEstado, motivoRechazo);
      Alert.alert(aceptar ? 'Cita aceptada' : 'Cita rechazada', 'Se ha notificado al solicitante.');
      setModalVisible(false);
      if(userId) cargarCitasComoNotificaciones(userRole);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  // NUEVO: Marcar cita como realizada
  const marcarRealizada = async (notif: Notificacion) => {
    const citaId = notif.relacionado_a || notif.datosExtra?.id_cita || notif.id;
    if (!citaId) return;
    try {
      await marcarCitaRealizada(citaId);
      Alert.alert('Visita registrada', 'Ahora puedes decidir si autorizas al estudiante para rentar.');
      setModalVisible(false);
      if(userId) cargarCitasComoNotificaciones(userRole);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  // NUEVO: Decisión de renta (aprobar/rechazar)
  const responderDecisionRenta = async (notif: Notificacion, aprobar: boolean) => {
    const citaId = notif.relacionado_a || notif.datosExtra?.id_cita || notif.id;
    if (!citaId) return;
    try {
      await decisionRenta(citaId, aprobar ? 'APROBAR' : 'RECHAZAR');
      Alert.alert(
        aprobar ? 'Renta aprobada' : 'Renta rechazada',
        aprobar
          ? `Has autorizado a ${notif.datosExtra?.estudianteNombre || 'el estudiante'} para rentar ${notif.datosExtra?.propiedadTitulo || 'tu propiedad'}.`
          : `Has rechazado la renta.`
      );
      setModalVisible(false);
      if(userId) cargarCitasComoNotificaciones(userRole);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };
  const enviarReporte = async () => {
    if (!destinatarioSeleccionado || nuevoTitulo.trim() === "" || nuevoMensaje.trim() === "") {
      Alert.alert("Campos incompletos", "Por favor completa todos los campos del reporte.");
      return;
    }
    
    try {
      const token = await AsyncStorage.getItem('token');
      const respuesta = await fetch(`${BACKEND_URL}/api/notificaciones`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          usuario_id: destinatarioSeleccionado,
          titulo: nuevoTitulo,
          mensaje: nuevoMensaje,
          tipo: "REPORTE",
          remitente_nombre: contactos.find((c) => c.id_usuario === userId)?.nombre || "Usuario",
        }),
      });
      
      if (respuesta.ok) {
        Alert.alert("¡Enviado!", "Tu reporte ha sido enviado exitosamente.");
        setNuevoTitulo(""); setNuevoMensaje(""); setDestinatarioSeleccionado(null);
        setModalFormularioVisible(false);
        if(userId) cargarNotificacionesBD(userId);
      }
    } catch (error) {
      Alert.alert("Error de conexión", "No se pudo conectar con el servidor.");
    }
  };

  // --- BORRADO ---
  const vaciarBandeja = () => {
    if (Platform.OS === 'web') {
      if (window.confirm("¿Limpiar mensajes leídos? Esta acción es irreversible. Se mantendrán los mensajes no leídos.")) ejecutarBorrado();
    } else {
      Alert.alert(
        "¿Limpiar mensajes leídos?",
        "Esta acción eliminará permanentemente todas las notificaciones que ya has visto. Las notificaciones no leídas se mantendrán en tu bandeja.",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Sí, limpiar", style: "destructive", onPress: ejecutarBorrado }
        ],
        { cancelable: true }
      );
    }
  };

  const ejecutarBorrado = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      // Usamos el mismo patrón de ID que en marcarTodoVisto
      let currentId = userId;
      if (!currentId) {
        currentId = await AsyncStorage.getItem('userId');
      }

      if (!currentId) {
        Alert.alert("Error", "No se pudo identificar al usuario.");
        return;
      }

      const respuesta = await fetch(`${BACKEND_URL}/api/notificaciones/${currentId}/todas`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (respuesta.ok) {
        const data = await respuesta.json().catch(() => ({}));
        // Solo quitamos de la lista las que ya estaban leídas si el servidor confirmó
        // EXCEPCIÓN: Mantenemos las Citas aunque estén leídas porque no se borran en la BD
        const tiposCitas = ['solicitud_cita', 'respuesta_cita', 'decision_renta_pendiente', 'decision_renta'];
        
        setNotificaciones(prev => prev.filter(n => {
          const esCita = tiposCitas.includes(n.tipo);
          if (esCita) return true; // Las citas se quedan siempre
          return !n.leida; // Las notificaciones normales solo se quedan si no han sido leídas
        }));
        
        const cantidad = data.count !== undefined ? data.count : '';
        mostrarTooltip(`¡Borrados! ${cantidad} eliminados. (Las citas persisten)`);
      } else {
        const errorData = await respuesta.json().catch(() => ({}));
        Alert.alert("Error", errorData.error || "No se pudo limpiar la bandeja en el servidor.");
      }
    } catch (error) { 
      console.error("Error al borrar notificaciones:", error);
      Alert.alert("Error de conexión", "Revisa tu internet.");
    }
  };

  const borrarIndividual = async (id: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const respuesta = await fetch(`${BACKEND_URL}/api/notificaciones/${id}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (respuesta.ok) {
        setNotificaciones(prev => prev.filter(n => n.id !== id));
      }
    } catch (error) { console.error(error); }
  };

  const [tooltip, setTooltip] = useState({ visible: false, message: "" });

  const mostrarTooltip = (mensaje: string) => {
    setTooltip({ visible: true, message: mensaje });
    setTimeout(() => setTooltip({ visible: false, message: "" }), 2000);
  };

  const marcarTodoVisto = async () => {
    try {
      let currentId = userId;
      const token = await AsyncStorage.getItem('token');
      
      if (!currentId && token) {
        // Fallback: extraer de token si el estado no ha cargado
        const parts = token.split('.');
        if (parts.length === 3) {
           // En React Native a veces atob no está disponible
           // Intentamos usar el userId guardado en AsyncStorage si existe
           const savedUserId = await AsyncStorage.getItem('userId');
           if (savedUserId) {
             currentId = savedUserId;
           }
        }
      }

      if (!currentId) {
        Alert.alert("Error", "No se pudo identificar al usuario.");
        return;
      }

      const respuesta = await fetch(`${BACKEND_URL}/api/notificaciones/marcar-todo-leido/${currentId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const contentType = respuesta.headers.get("content-type");
      if (respuesta.ok) {
        const data = await respuesta.json().catch(() => ({}));
        setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
        const cantidad = data.count !== undefined ? data.count : '';
        mostrarTooltip(`¡Hecho! ${cantidad} marcados. (Citas no incluidas)`);
      } else {
        let mensajeError = `Error (${respuesta.status})`;
        if (contentType && contentType.includes("application/json")) {
           const errorData = await respuesta.json();
           mensajeError = errorData.error || mensajeError;
        }
        Alert.alert("Error", mensajeError);
      }
    } catch (error) {
      console.error("Error al marcar todo como visto:", error);
      Alert.alert("Error de conexión", "Asegúrate de tener internet.");
    }
  };
  // --- RENDERIZADOS ---
  const renderLeftActions = (id: string) => (
    <TouchableOpacity style={styles.contenedorEliminarSwipe} onPress={() => borrarIndividual(id)}>
      <Ionicons name="trash" size={28} color="white" />
      <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Borrar</Text>
    </TouchableOpacity>
  );

  const renderNotificacion = ({ item }: { item: Notificacion }) => {
    // Obtener ID del estudiante según el tipo de notificación
    const idEstudiante = 
      item.tipo === 'solicitud_cita' ? item.datosExtra?.estudianteId :
      item.tipo === 'decision_renta_pendiente' ? item.datosExtra?.estudianteId :
      item.tipo === 'calificar_estudiante' ? item.relacionado_a : null;

    const rating = idEstudiante ? ratingEstudianteMap[idEstudiante] || 0 : 0;

    return (
      <Swipeable renderLeftActions={() => renderLeftActions(item.id)} friction={2} rightThreshold={40}>
        <TouchableOpacity 
          style={[styles.tarjeta, !item.leida && styles.tarjetaNoLeida]}
          onPress={() => abrirDetalle(item)}
        >
          <View style={styles.encabezadoTarjeta}>
            <Text style={[styles.titulo, !item.leida && styles.textoNegrita]} numberOfLines={1}>{item.titulo}</Text>
            <Text style={styles.fecha}>{item.fecha}</Text>
          </View>
          <View style={styles.remitenteRow}>
            <Text style={styles.remitenteLista}>{item.remitente}</Text>
            {rating > 0 && (
              <View style={styles.ratingBadgeLista}>
                <Ionicons name="star" size={12} color="#FFD700" />
                <Text style={styles.ratingTextLista}>{rating.toFixed(1)}</Text>
              </View>
            )}
          </View>
          <Text style={styles.mensajeResumen} numberOfLines={1}>{item.mensaje}</Text>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.contenedor}>
        {/* ENCABEZADO */}
        <View style={styles.contenedorEncabezado}>
          <Text style={styles.encabezadoPrincipal}>Bandeja de Entrada</Text>
          <View style={styles.iconosEncabezado}>
            <TouchableOpacity 
              onPress={marcarTodoVisto}
              onLongPress={() => mostrarTooltip("Marcar todo como leído")}
              style={styles.botonIconoHeader}
            >
              <Ionicons name="eye-outline" size={28} color="#205EA6" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={vaciarBandeja}
              onLongPress={() => mostrarTooltip("Limpiar mensajes leídos")}
              style={styles.botonIconoHeader}
            >
              <Image source={require('../../assets/borrarnotificaciones.png')} resizeMode="contain" style={styles.imagenBorrar} /> 
            </TouchableOpacity>
          </View>
        </View>

        {/* TOOLTIP FLOTANTE */}
        {tooltip.visible && (
          <View style={styles.contenedorTooltip}>
            <Text style={styles.textoTooltip}>{tooltip.message}</Text>
          </View>
        )}
      
        {/* LISTA */}
        <FlatList
          data={notificaciones}
          keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
          renderItem={renderNotificacion}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={cargando} onRefresh={onRefresh} colors={["#205EA6"]} />}
          ListEmptyComponent={<Text style={{textAlign: 'center', marginTop: 50, color: '#888'}}>No hay notificaciones aún.</Text>}
        />

        {/* BOTÓN FLOTANTE NUEVO REPORTE */}
        <TouchableOpacity style={styles.botonFlotanteCircular} onPress={() => setModalFormularioVisible(true)}>
          <Ionicons name="add" size={28} color="white" /> 
        </TouchableOpacity>

        {/* ================= MODAL 1: DETALLE ================= */}
        <Modal animationType="slide" transparent={false} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
          {notificacionSeleccionada && (
            <SafeAreaView style={styles.contenedorModal}>
              <View style={styles.barraSuperiorModal}>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Text style={styles.botonCerrar}>← Regresar</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.contenidoDetalle}>
                <Text style={styles.tituloModal}>{notificacionSeleccionada.titulo}</Text>
                <View style={styles.infoRemitente}>
                  <View style={styles.avatarCircular}>
                    <Text style={styles.letraAvatar}>{notificacionSeleccionada.remitente.charAt(0)}</Text>
                  </View>
                  <View>
                    <Text style={styles.nombreRemitente}>{notificacionSeleccionada.remitente}</Text>
                    <Text style={styles.fechaModal}>{notificacionSeleccionada.fecha}</Text>
                  </View>
                </View>
                <View style={styles.separador} />
                <Text style={styles.mensajeCompleto}>{notificacionSeleccionada.mensaje}</Text>

                {/* BOTONES ANFITRIÓN — Aceptar/Rechazar cita */}
                {userRole === 'anfitrion' && notificacionSeleccionada.tipo === 'solicitud_cita' && (
                  <View style={styles.botonesRespuesta}>
                    <TouchableOpacity style={styles.botonAceptar} onPress={() => responderSolicitud(notificacionSeleccionada, true)}>
                      <Text style={styles.textoBotonAceptar}>Aceptar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.botonRechazar} onPress={() => {
                      Alert.prompt('Motivo de rechazo', 'Escribe el motivo (opcional)', (motivo) =>
                        responderSolicitud(notificacionSeleccionada, false, motivo)
                      );
                    }}>
                      <Text style={styles.textoBotonRechazar}>Rechazar</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* BOTONES ANFITRIÓN — Marcar como realizada (cuando cita está ACEPTADA) */}
                {userRole === 'anfitrion' && notificacionSeleccionada.datosExtra?.estado === 'ACEPTADA' && (
                  <View style={styles.botonesRespuesta}>
                    <TouchableOpacity style={styles.botonRentar} onPress={() => marcarRealizada(notificacionSeleccionada)}>
                      <Text style={styles.textoBotonRentar}>Marcar visita realizada</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* BOTONES ANFITRIÓN — Decisión de renta (cuando es decision_renta_pendiente) */}
                {userRole === 'anfitrion' && (notificacionSeleccionada.tipo === 'decision_renta_pendiente' || notificacionSeleccionada.datosExtra?.estado === 'REALIZADA') && (
                  <View style={styles.botonesRespuesta}>
                    <TouchableOpacity style={styles.botonAceptar} onPress={() => responderDecisionRenta(notificacionSeleccionada, true)}>
                      <Text style={styles.textoBotonAceptar}>Aceptar Renta</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.botonRechazar} onPress={() => responderDecisionRenta(notificacionSeleccionada, false)}>
                      <Text style={styles.textoBotonRechazar}>Cancelar Renta</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* BOTONES ESTUDIANTE — Al ver notificación de renta aprobada, navegar al inmueble */}
                {userRole === 'estudiante' && notificacionSeleccionada.tipo === 'decision_renta' && notificacionSeleccionada.datosExtra?.aceptada && (
                  <View style={styles.botonesRespuesta}>
                    <TouchableOpacity
                      style={styles.botonRentar}
                      onPress={() => {
                        setModalVisible(false);
                        // Navegar al inmueble directamente
                        const inmuebleId = notificacionSeleccionada.datosExtra.propiedadId;
                        if (inmuebleId) {
                          fetch(`${BACKEND_URL}/inmuebles/${inmuebleId}`, {
                            headers: { 'Authorization': `Bearer ${AsyncStorage.getItem('token')}` }
                          })
                            .then(resp => resp.json())
                            .then(inmueble => {
                              // Navegar usando el stack de Inmuebles
                              const nav = (globalThis as any).__navigationRef;
                              if (nav) {
                                nav.navigate("Navigator", {
                                  screen: "Inmuebles",
                                  params: {
                                    screen: "InmuebleScreen",
                                    params: { inmueble, token: AsyncStorage.getItem('token') }
                                  }
                                });
                              }
                            })
                            .catch(() => Alert.alert("Info", "Ve al mapa y selecciona el inmueble para rentarlo."));
                        }
                      }}
                    >
                      <Text style={styles.textoBotonRentar}>Ir a Rentar</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* BOTÓN ANFITRIÓN — Calificar estudiante (cuando es calificar_estudiante) */}
                {userRole === 'anfitrion' && notificacionSeleccionada.tipo === 'calificar_estudiante' && (
                  <View style={styles.botonesRespuesta}>
                    <TouchableOpacity 
                      style={styles.botonRentar}
                      onPress={() => {
                        setEstudianteACalificar({ 
                          id: notificacionSeleccionada.relacionado_a || '', 
                          nombre: notificacionSeleccionada.remitente 
                        });
                        setModalCalificarEstudianteVisible(true);
                      }}
                    >
                      <Ionicons name="star" size={20} color="#fff" />
                      <Text style={styles.textoBotonRentar}>Calificar Estudiante</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </SafeAreaView>
          )}
        </Modal>

        {/* ================= MODAL 2: FORMULARIO ================= */}
        <Modal animationType="fade" transparent={true} visible={modalFormularioVisible} onRequestClose={() => setModalFormularioVisible(false)}>
          <View style={styles.fondoOscuroModal}>
            <View style={styles.tarjetaFormulario}>
              <Text style={styles.tituloFormulario}>Nuevo Reporte</Text>
             
              <Text style={styles.labelInput}>Para:</Text>
              <View style={styles.contenedorScrollChips}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {contactos.map((contacto) => (
                    <TouchableOpacity
                      key={contacto.id_usuario}
                      style={[styles.chipContacto, destinatarioSeleccionado === contacto.id_usuario && styles.chipSeleccionado]}
                      onPress={() => setDestinatarioSeleccionado(contacto.id_usuario)}
                    >
                      <Text style={[styles.textoChip, destinatarioSeleccionado === contacto.id_usuario && styles.textoChipSeleccionado]}>
                        {contacto.nombre}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              <Text style={styles.labelInput}>Asunto</Text>
              <TextInput style={styles.inputTexto} placeholder="Ej. Problema con el internet" value={nuevoTitulo} onChangeText={setNuevoTitulo} />
              
              <Text style={styles.labelInput}>Mensaje</Text>
              <TextInput style={[styles.inputTexto, styles.inputMultilinea]} placeholder="Describe los detalles aquí..." multiline={true} numberOfLines={4} textAlignVertical="top" value={nuevoMensaje} onChangeText={setNuevoMensaje} />
              
              <View style={styles.contenedorBotonesForm}>
                <TouchableOpacity style={styles.botonCancelar} onPress={() => { setModalFormularioVisible(false); setDestinatarioSeleccionado(null); }}>
                  <Text style={styles.textoBotonCancelar}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.botonEnviar} onPress={enviarReporte}>
                  <Text style={styles.textoBotonEnviar}>Enviar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ================= MODAL 3: CALIFICAR ESTUDIANTE ================= */}
        <Modal visible={modalCalificarEstudianteVisible} transparent animationType="fade">
          <View style={styles.ratingOverlay}>
            <View style={styles.ratingCard}>
              <TouchableOpacity
                style={styles.ratingSkipBtn}
                onPress={() => {
                  setModalCalificarEstudianteVisible(false);
                  setEstudianteACalificar(null);
                  setRatingEstudiante(0);
                  setComentarioEstudiante("");
                }}
              >
                <Text style={styles.ratingSkipBtnText}>Cerrar</Text>
              </TouchableOpacity>

              <Text style={styles.ratingTitle}>
                Calificar a {estudianteACalificar?.nombre || "Estudiante"}
              </Text>

              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setRatingEstudiante(star)}>
                    <Ionicons
                      name={star <= ratingEstudiante ? "star" : "star-outline"}
                      size={40}
                      color={star <= ratingEstudiante ? "#f39c12" : "#ccc"}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.ratingInput}
                placeholder="Comentario sobre el estudiante (opcional)"
                placeholderTextColor="#aaa"
                value={comentarioEstudiante}
                onChangeText={setComentarioEstudiante}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.ratingSubmitBtn, enviandoCalificacion && { opacity: 0.7 }]}
                onPress={handleCalificarEstudiante}
                disabled={enviandoCalificacion}
              >
                {enviandoCalificacion ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.ratingSubmitBtnText}>Enviar Calificación</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#f8f9fa", paddingHorizontal: 16, paddingTop: 40 },
  encabezadoPrincipal: { fontSize: 25, fontWeight: "bold", marginBottom: 16, color: "#1a1a1a" },
  tarjeta: { backgroundColor: "#ffffff", padding: 14, borderRadius: 8, marginBottom: 10, borderBottomWidth: 1, borderColor: "#eee" },
  tarjetaNoLeida: { backgroundColor: "#f0f7ff", borderLeftWidth: 3, borderLeftColor: "#205EA6" },
  encabezadoTarjeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  titulo: { fontSize: 16, color: "#212529", flex: 1, paddingRight: 8 },
  textoNegrita: { fontWeight: "600" },
  fecha: { fontSize: 12, color: "#6c757d", marginLeft: 8 },
  remitenteLista: { fontSize: 14, color: "#495057", marginTop: 2 },
  remitenteRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  ratingBadgeLista: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF8E1", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, gap: 2 },
  ratingTextLista: { fontSize: 12, color: "#F57F17", fontWeight: "bold" },
  mensajeResumen: { fontSize: 14, color: "#6c757d", marginTop: 6 },
  botonFlotanteCircular: { position: 'absolute', bottom: 90, right: 20, backgroundColor: '#205EA6', padding: 16, borderRadius: 30, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  contenedorEncabezado: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: 6, marginBottom: 10 },
  iconosEncabezado: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  botonIconoHeader: { padding: 4 },
  imagenBorrar: { width: 30, height: 30 },
  contenedorTooltip: {
    position: 'absolute',
    top: 85,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 100,
  },
  textoTooltip: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  contenedorEliminarSwipe: { backgroundColor: '#ff0056', justifyContent: 'center', alignItems: 'center', width: 80, height: '90%', marginTop: 5, borderRadius: 10, marginLeft: 10 },
  contenedorModal: { flex: 1, backgroundColor: "#fff" },
  barraSuperiorModal: { padding: 16, borderBottomWidth: 1, borderColor: "#eee" },
  botonCerrar: { fontSize: 16, color: "#205EA6", fontWeight: "bold" },
  contenidoDetalle: { padding: 20 },
  tituloModal: { fontSize: 22, fontWeight: "bold", color: "#1a1a1a", marginBottom: 16 },
  infoRemitente: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  avatarCircular: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#205EA6", justifyContent: "center", alignItems: "center", marginRight: 12 },
  letraAvatar: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  nombreRemitente: { fontSize: 16, fontWeight: "bold", color: "#212529" },
  fechaModal: { fontSize: 13, color: "#6c757d" },
  separador: { height: 1, backgroundColor: "#eee", marginBottom: 16 },
  mensajeCompleto: { fontSize: 16, lineHeight: 24, color: "#343a40" },
  fondoOscuroModal: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 16 },
  tarjetaFormulario: { backgroundColor: "#fff", width: "100%", borderRadius: 12, padding: 20 },
  tituloFormulario: { fontSize: 20, fontWeight: "bold", color: "#1a1a1a", marginBottom: 20, textAlign: "center" },
  labelInput: { fontSize: 15, fontWeight: "bold", color: "#495057", marginBottom: 6 },
  inputTexto: { borderWidth: 1, borderColor: "#ced4da", borderRadius: 6, padding: 10, fontSize: 16, marginBottom: 16, backgroundColor: "#fff" },
  inputMultilinea: { minHeight: 120 },
  contenedorBotonesForm: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  botonCancelar: { flex: 1, padding: 14, borderRadius: 6, marginRight: 8, backgroundColor: "#f0f0f0", alignItems: "center" },
  textoBotonCancelar: { fontSize: 16, color: "#666", fontWeight: "bold" },
  botonEnviar: { flex: 1, padding: 14, borderRadius: 6, marginLeft: 8, backgroundColor: "#205EA6", alignItems: "center" },
  textoBotonEnviar: { fontSize: 16, color: "#fff", fontWeight: "bold" },
  contenedorScrollChips: { height: 40, marginBottom: 16 },
  chipContacto: { backgroundColor: "#e9ecef", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8, borderWidth: 1, borderColor: "#dee2e6", justifyContent: "center" },
  chipSeleccionado: { backgroundColor: "#205EA6", borderColor: "#205EA6" },
  textoChip: { fontSize: 14, color: "#495057" },
  textoChipSeleccionado: { color: "#fff", fontWeight: "bold" },
  botonesRespuesta: { flexDirection: "row", justifyContent: "space-around", marginTop: 24, flexWrap: "wrap", gap: 12 },
  botonAceptar: { backgroundColor: "#2B9348", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 30 },
  textoBotonAceptar: { color: "#fff", fontWeight: "bold" },
  botonRechazar: { backgroundColor: "#DC2F02", paddingVertical: 12, paddingHorizontal: 24, borderRadius: 30 },
  textoBotonRechazar: { color: "#fff", fontWeight: "bold" },
  botonRentar: { 
    backgroundColor: "#205EA6", 
    paddingVertical: 12, 
    paddingHorizontal: 32, 
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  textoBotonRentar: { color: "#fff", fontWeight: "bold" },
  ratingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  ratingCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "90%",
    alignItems: "center",
    gap: 16,
  },
  ratingSkipBtn: {
    position: "absolute",
    top: 16,
    right: 16,
  },
  ratingSkipBtnText: {
    fontSize: 14,
    color: "#205EA6",
    fontWeight: "600",
  },
  ratingTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1a1a2e",
    textAlign: "center",
  },
  starsRow: {
    flexDirection: "row",
    gap: 10,
  },
  ratingInput: {
    backgroundColor: "#f5f7fa",
    borderRadius: 12,
    padding: 14,
    width: "100%",
    minHeight: 90,
    fontSize: 14,
    color: "#1a1a2e",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  ratingSubmitBtn: {
    backgroundColor: "#205EA6",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: "100%",
    alignItems: "center",
  },
  ratingSubmitBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});
