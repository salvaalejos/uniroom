import React, { useState, useEffect } from "react";
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, SafeAreaView, TextInput, Alert, ScrollView
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { socketService } from '../services/websocketService';

// Definir tipos de notificaciones
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
  const [userId] = useState("usuario_demo"); // En producción usar ID real
  const [userRole] = useState<"estudiante" | "anfitrion">("anfitrion"); // Aquí se define el rol del usuario actual

  useEffect(() => {
    // Conectar WebSocket
    socketService.connect(userId, userRole);

    // Escuchar nuevas notificaciones
    socketService.on('nueva_notificacion', (notificacion: Notificacion) => {
      setNotificaciones(prev => [notificacion, ...prev]);
    });

    // Si es anfitrión, escuchar solicitudes de cita
    if (userRole === 'anfitrion') {
      socketService.on('solicitud_cita', (data) => {
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
      });
    } else {
      // Estudiante escucha respuestas a sus citas
      socketService.on('respuesta_cita', (data) => {
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
      });
    }

    // Cargar notificaciones previas (desde API si existe)
    cargarNotificacionesIniciales();

    return () => {
      socketService.off('nueva_notificacion');
      socketService.off('solicitud_cita');
      socketService.off('respuesta_cita');
    };
  }, []);

  const cargarNotificacionesIniciales = async () => {
    // Aquí puedes hacer fetch a tu backend para obtener notificaciones guardadas
    // Por ahora, datos de ejemplo
    const notificacionesEjemplo: Notificacion[] = [
      {
        id: "1",
        tipo: "mensaje",
        titulo: "Bienvenido",
        mensaje: "Gracias por usar la app",
        leida: false,
        remitente: "Sistema",
        fecha: "Hoy",
      },
    ];
    setNotificaciones(notificacionesEjemplo);
  };

  const abrirDetalle = (item: Notificacion) => {
    setNotificacionSeleccionada(item);
    setModalVisible(true);
    // Marcar como leída
    setNotificaciones(prev => prev.map(n => n.id === item.id ? { ...n, leida: true } : n));
  };

  const responderSolicitud = (notif: Notificacion, aceptar: boolean, motivoRechazo?: string) => {
    const data = notif.datosExtra;
    if (!data) return;

    // Emitir respuesta al servidor
    socketService.emit('respuesta_solicitud', {
      solicitudId: data.id,
      aceptada: aceptar,
      motivo: motivoRechazo || '',
      estudianteId: data.estudianteId,
      propiedadId: data.propiedadId,
      fecha: data.fecha,
    });

    Alert.alert(aceptar ? 'Cita aceptada' : 'Cita rechazada', aceptar ? 'Se ha notificado al estudiante.' : 'Se ha notificado al estudiante.');
    setModalVisible(false);
  };

  const reagendarCita = (notif: Notificacion) => {
    // Aquí puedes abrir un calendario para nueva fecha/hora
    Alert.prompt('Reagendar cita', 'Ingresa nueva fecha y hora (ej. 2025-05-01 15:00)', (nuevaFecha) => {
      if (nuevaFecha) {
        socketService.emit('reagendar_cita', {
          solicitudId: notif.datosExtra.id,
          nuevaFecha: new Date(nuevaFecha).toISOString(),
          estudianteId: notif.datosExtra.estudianteId,
        });
        Alert.alert('Solicitud enviada', 'Se ha propuesto una nueva fecha al estudiante.');
      }
    });
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

      {/* Modal de detalle de notificación */}
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
                    Alert.prompt('Motivo de rechazo', 'Escribe el motivo (opcional)', (motivo) => responderSolicitud(notificacionSeleccionada, false, motivo));
                  }}>
                    <Text style={styles.textoBotonRechazar}>Rechazar</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Si es respuesta de cita rechazada y usuario es estudiante, mostrar botón reagendar */}
              {userRole === 'estudiante' && notificacionSeleccionada.tipo === 'respuesta_cita' && !notificacionSeleccionada.datosExtra?.aceptada && (
                <TouchableOpacity style={styles.botonReagendar} onPress={() => reagendarCita(notificacionSeleccionada)}>
                  <Text style={styles.textoBotonReagendar}>Reagendar cita</Text>
                </TouchableOpacity>
              )}
            </View>
          </SafeAreaView>
        )}
      </Modal>
    </View>
  );
}

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
  botonReagendar: { backgroundColor: "#FFB800", paddingVertical: 12, borderRadius: 30, alignItems: "center", marginTop: 20 },
  textoBotonReagendar: { color: "#1a1a2e", fontWeight: "bold" },
});