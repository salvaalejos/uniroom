import React, { useState, useEffect } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, SafeAreaView, Alert
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { socketService } from '../services/websocketService';
import { obtenerMisCitas, actualizarEstadoCita } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Definir tipos de notificaciones (se amplía para incluir datos de cita)
type Notificacion = {
  id: string;
  tipo: 'mensaje' | 'solicitud_cita' | 'respuesta_cita';
  titulo: string;
  mensaje: string;
  leida: boolean;
  remitente: string;
  fecha: string;
  datosExtra?: any;
};

export default function NotificationScreen() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [notificacionSeleccionada, setNotificacionSeleccionada] = useState<Notificacion | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [userRole, setUserRole] = useState<"estudiante" | "anfitrion">("estudiante");

  // Cargar usuario y notificaciones iniciales
  useEffect(() => {
    const init = async () => {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;
      const payload = JSON.parse(atob(token.split('.')[1]));
      const id = payload.sub;
      const rol = payload.rol === 'ESTUDIANTE' ? 'estudiante' : 'anfitrion';
      setUserId(id);
      setUserRole(rol);
      socketService.connect(id, rol);
      await cargarCitasComoNotificaciones();
    };
    init();

    // Escuchar eventos WebSocket
    socketService.on('solicitud_cita', (data) => {
      if (userRole === 'anfitrion') {
        const nuevaNotif: Notificacion = {
          id: data.id,
          tipo: 'solicitud_cita',
          titulo: 'Nueva solicitud de visita',
          mensaje: `${data.estudianteNombre} quiere visitar tu propiedad ${data.propiedadTitulo} el ${new Date(data.fecha).toLocaleString()}`,
          leida: false,
          remitente: data.estudianteNombre,
          fecha: new Date().toLocaleString(),
          datosExtra: data,
        };
        setNotificaciones(prev => [nuevaNotif, ...prev]);
        cargarCitasComoNotificaciones(); // refrescar desde BD
      }
    });

    socketService.on('respuesta_cita', (data) => {
      if (userRole === 'estudiante') {
        const nuevaNotif: Notificacion = {
          id: data.id,
          tipo: 'respuesta_cita',
          titulo: data.aceptada ? 'Cita aceptada' : 'Cita rechazada',
          mensaje: data.aceptada
            ? `Tu solicitud para visitar ${data.propiedadTitulo} ha sido ACEPTADA. Fecha: ${new Date(data.fecha).toLocaleString()}`
            : `Tu solicitud para visitar ${data.propiedadTitulo} fue RECHAZADA. Motivo: ${data.motivo || 'No especificado'}. Puedes reagendar.`,
          leida: false,
          remitente: data.anfitrionNombre,
          fecha: new Date().toLocaleString(),
          datosExtra: data,
        };
        setNotificaciones(prev => [nuevaNotif, ...prev]);
        cargarCitasComoNotificaciones();
      }
    });

    return () => {
      socketService.off('solicitud_cita');
      socketService.off('respuesta_cita');
    };
  }, [userRole]);

  // Cargar citas desde el backend y convertirlas a notificaciones (sincronización inicial)
  const cargarCitasComoNotificaciones = async () => {
    try {
      const citas = await obtenerMisCitas();
      const notifs: Notificacion[] = citas.map((cita: any) => {
        const esEstudiante = userRole === 'estudiante';
        const titular = esEstudiante ? cita.anfitrion?.nombre : cita.estudiante?.nombre;
        let titulo = '';
        let mensaje = '';
        if (cita.estado === 'PENDIENTE') {
          titulo = esEstudiante ? 'Cita pendiente' : 'Nueva solicitud de visita';
          mensaje = esEstudiante
            ? `Tienes una cita pendiente con ${cita.anfitrion?.nombre} para ${cita.inmueble.titulo} el ${new Date(cita.fecha_hora).toLocaleString()}`
            : `${cita.estudiante?.nombre} solicitó visitar ${cita.inmueble.titulo} el ${new Date(cita.fecha_hora).toLocaleString()}`;
        } else if (cita.estado === 'ACEPTADA') {
          titulo = 'Cita aceptada';
          mensaje = `Tu cita para ${cita.inmueble.titulo} ha sido ACEPTADA para el ${new Date(cita.fecha_hora).toLocaleString()}`;
        } else if (cita.estado === 'RECHAZADA') {
          titulo = 'Cita rechazada';
          mensaje = `Tu cita para ${cita.inmueble.titulo} fue RECHAZADA. Motivo: ${cita.motivo_rechazo || 'No especificado'}`;
        } else {
          titulo = 'Cita reagendada';
          mensaje = `La cita para ${cita.inmueble.titulo} ha sido reagendada para ${new Date(cita.fecha_hora).toLocaleString()}`;
        }
        return {
          id: cita.id_cita,
          tipo: cita.estado === 'PENDIENTE' ? 'solicitud_cita' : 'respuesta_cita',
          titulo,
          mensaje,
          leida: false,
          remitente: titular || 'Sistema',
          fecha: new Date(cita.fecha_hora).toLocaleString(),
          datosExtra: cita,
        };
      });
      // Combinar con notificaciones existentes (sin duplicados)
      setNotificaciones(prev => {
        const idsExistentes = new Set(prev.map(n => n.id));
        const nuevas = notifs.filter(n => !idsExistentes.has(n.id));
        return [...nuevas, ...prev];
      });
    } catch (error) {
      console.error("Error cargando citas:", error);
    }
  };

  const abrirDetalle = (item: Notificacion) => {
    setNotificacionSeleccionada(item);
    setModalVisible(true);
    // Marcar como leída
    setNotificaciones(prev => prev.map(n => n.id === item.id ? { ...n, leida: true } : n));
  };

  const responderSolicitud = async (notif: Notificacion, aceptar: boolean, motivoRechazo?: string) => {
    const data = notif.datosExtra;
    if (!data) return;

    try {
      const nuevoEstado = aceptar ? 'ACEPTADA' : 'RECHAZADA';
      await actualizarEstadoCita(data.id_cita, nuevoEstado, motivoRechazo);
      Alert.alert(aceptar ? 'Cita aceptada' : 'Cita rechazada', 'Se ha notificado al solicitante.');
      setModalVisible(false);
      cargarCitasComoNotificaciones(); // refrescar
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const renderNotificacion = ({ item }: { item: Notificacion }) => (
    <TouchableOpacity
      style={[styles.tarjeta, !item.leida && styles.tarjetaNoLeida]}
      onPress={() => abrirDetalle(item)}
    >
      <View style={styles.encabezadoTarjeta}>
        <Text style={[styles.titulo, !item.leida && styles.textoNegrita]} numberOfLines={1}>{item.titulo}</Text>
        <Text style={styles.fecha}>{item.fecha}</Text>
      </View>
      <Text style={styles.remitenteLista}>{item.remitente}</Text>
      <Text style={styles.mensajeResumen} numberOfLines={1}>{item.mensaje}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.contenedor}>
      <Text style={styles.encabezadoPrincipal}>Bandeja de Entrada</Text>

      <FlatList
        data={notificaciones}
        keyExtractor={(item) => item.id}
        renderItem={renderNotificacion}
        showsVerticalScrollIndicator={false}
      />

      <Modal visible={modalVisible} animationType="slide" transparent={false} onRequestClose={() => setModalVisible(false)}>
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

              {/* Si es solicitud de cita y el usuario es anfitrión, mostrar botones aceptar/rechazar */}
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
            </View>
          </SafeAreaView>
        )}
      </Modal>
    </View>
  );
}

// Los estilos son exactamente los mismos que proporcionaste, no es necesario repetirlos.
// Inclúyelos tal cual están en tu archivo original.
const styles = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: "#f8f9fa", paddingHorizontal: 16, paddingTop: 40 },
  encabezadoPrincipal: { fontSize: 24, fontWeight: "bold", marginBottom: 16, color: "#1a1a1a" },
  tarjeta: { backgroundColor: "#fff", padding: 14, borderRadius: 8, marginBottom: 10, borderBottomWidth: 1, borderColor: "#eee" },
  tarjetaNoLeida: { backgroundColor: "#f0f7ff", borderLeftWidth: 3, borderLeftColor: "#205EA6" },
  encabezadoTarjeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  titulo: { fontSize: 16, color: "#212529", flex: 1, paddingRight: 8 },
  textoNegrita: { fontWeight: "600" },
  fecha: { fontSize: 12, color: "#6c757d", marginLeft: 8 },
  remitenteLista: { fontSize: 14, color: "#495057", marginTop: 2 },
  mensajeResumen: { fontSize: 14, color: "#6c757d", marginTop: 6 },
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
  botonesRespuesta: { flexDirection: "row", justifyContent: "space-around", marginTop: 24 },
  botonAceptar: { backgroundColor: "#2B9348", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 30 },
  textoBotonAceptar: { color: "#fff", fontWeight: "bold" },
  botonRechazar: { backgroundColor: "#DC2F02", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 30 },
  textoBotonRechazar: { color: "#fff", fontWeight: "bold" },
});