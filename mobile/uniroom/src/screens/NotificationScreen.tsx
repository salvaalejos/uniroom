import React, { useState, useEffect } from "react";
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, SafeAreaView, TextInput, Alert, ScrollView, RefreshControl, Image, Platform
} from "react-native";
import { Ionicons } from '@expo/vector-icons';

interface NotificacionType {
  id_notificacion: string; 
  titulo: string;
  mensaje: string;
  visto: boolean;
  tipo: string;
  fecha_creacion: string;
  usuario_id: string;
  remitente_nombre: string;
}
interface ContactoType {
  id_usuario: string;
  nombre: string;
}
// --- CONSTANTES PARA LA CONEXIÓN AL BACKEND ---
const BACKEND_URL ="http://192.168.1.2:3000";
//const MI_ID_DE_USUARIO = "5024b108-a41a-4401-9f4b-bc8392ce48b8"; // ADMIN 
const MI_ID_DE_USUARIO = "67012f3e-b644-4c33-ba43-8756632b2508"; // Pati Chapoy


export default function NotificationScreen() {
  const [notificaciones, setNotificaciones] = useState<NotificacionType[]>([]);
  const [cargando, setCargando] = useState(false); 
  
  const [notificacionSeleccionada, setNotificacionSeleccionada] = useState<NotificacionType | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const [modalFormularioVisible, setModalFormularioVisible] = useState(false);
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [nuevoMensaje, setNuevoMensaje] = useState("");

  const [contactos, setContactos] = useState<ContactoType[]>([]);
  const [destinatarioSeleccionado, setDestinatarioSeleccionado] = useState<string | null>(null);

  const cargarNotificaciones = async () => {
    try {
      const respuesta = await fetch(`${BACKEND_URL}/api/notificaciones/${MI_ID_DE_USUARIO}`);
      if (respuesta.ok) {
        const datosReales = await respuesta.json();
        const datosFormateados = datosReales.map((notif: any) => {
          const fechaObj = new Date(notif.fecha_creacion);
          return {
            ...notif,
            fecha_creacion: `${fechaObj.getDate()}/${fechaObj.getMonth() + 1} ${fechaObj.getHours()}:${fechaObj.getMinutes().toString().padStart(2, '0')}`
          };
        });
        setNotificaciones(datosFormateados);
      }
    } catch (error) {
      console.error("Error conectando al backend:", error);
    }
  };

  //Para recargar laa notificaciones de manera manual (pull to refresh)
  const onRefresh = async () => {
    setCargando(true);
    await cargarNotificaciones();
    setCargando(false);
  };

  useEffect(() => {
    cargarNotificaciones();

    const contactosDePrueba = [
      { id_usuario: "67012f3e-b644-4c33-ba43-8756632b2508", nombre: "Pati Chapoy" },
      { id_usuario: "5024b108-a41a-4401-9f4b-bc8392ce48b8", nombre: "Administración" },
    ];
    setContactos(contactosDePrueba);
  }, []);

  const abrirDetalle = async (item: NotificacionType) => {
    setNotificacionSeleccionada(item);
    setModalVisible(true);

    if (!item.visto) {
      try {
        const respuesta = await fetch(`${BACKEND_URL}/api/notificaciones/${item.id_notificacion}/visto`, {
          method: 'PATCH',
        });

        if (respuesta.ok) {
         
          setNotificaciones(prevNotificaciones => 
            prevNotificaciones.map(n => 
              n.id_notificacion === item.id_notificacion ? { ...n, visto: true } : n
            )
          );
          console.log("Estado actualizado a Visto");
        }
      } catch (error) {
        console.error("Error al marcar como visto:", error);
      }
    }
  };

  const enviarReporte = async () => {
    if (!destinatarioSeleccionado) {
      Alert.alert("Destinatario faltante", "Por favor selecciona a quién va dirigido el reporte.");
      return;
    }

    if (nuevoTitulo.trim() === "" || nuevoMensaje.trim() === "") {
      Alert.alert("Campos incompletos", "Por favor escribe un asunto y un mensaje para el reporte.");
      return;
    }

    try {
      const respuesta = await fetch(`${BACKEND_URL}/api/notificaciones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usuario_id: destinatarioSeleccionado,
          titulo: nuevoTitulo,
          mensaje: nuevoMensaje,
          tipo: "REPORTE",
          remitente_nombre: contactos.find((c) => c.id_usuario === MI_ID_DE_USUARIO)?.nombre || "",
        }),
      });

      if (respuesta.ok) {
        Alert.alert("¡Enviado!", "Tu reporte ha sido enviado exitosamente.");
        setNuevoTitulo("");
        setNuevoMensaje("");
        setDestinatarioSeleccionado(null);
        setModalFormularioVisible(false);
        cargarNotificaciones();
      } else {
        Alert.alert("Error", "No se pudo enviar el reporte en el servidor.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error de conexión", "No se pudo conectar con el servidor.");
    }
  };

  const renderNotificacion = ({ item }: any) => (
    <Swipeable
    renderLeftActions={() => renderLeftActions(item.id_notificacion)}
    friction={2} 
    rightThreshold={40} 
  >
    <TouchableOpacity 
      style={[styles.tarjeta, !item.visto && styles.tarjetaNoLeida]}
      onPress={() => abrirDetalle(item)}
      activeOpacity={0.7}
    >
      <View style={styles.encabezadoTarjeta}>
        <Text style={[styles.titulo, !item.visto && styles.textoNegrita]} numberOfLines={1}>{item.titulo}</Text>
        <Text style={styles.fecha}>{item.fecha_creacion}</Text>
      </View>
      <Text style={styles.remitenteLista}>{item.remitente_nombre}</Text>
      <Text style={styles.mensajeResumen} numberOfLines={1}>{item.mensaje}</Text>
    </TouchableOpacity>
      </Swipeable>
  );
  
const vaciarBandeja = () => {
    // Pa Web
    if (Platform.OS === 'web') {
      const confirmar = window.confirm("¿Seguro que quieres borrar todas las notificaciones?");
      if (confirmar) {
        ejecutarBorrado();
      }
    } 
    // Pa Celular
    else {
      Alert.alert(
        "¿Borrar todo?",
        "Esta acción eliminará todos tus mensajes permanentemente.",
        [
          { text: "Cancelar", style: "cancel" },
          { 
            text: "Sí, borrar",
            style: "destructive", 
            onPress: ejecutarBorrado 
          }
        ],
        { cancelable: true }
      );
    }
  };
  
  const ejecutarBorrado = async () => {
    try {
      const respuesta = await fetch(`${BACKEND_URL}/api/notificaciones/${MI_ID_DE_USUARIO}/todas`, {
        method: 'DELETE',
      });
      if (respuesta.ok) {
        setNotificaciones([]);
    }
    } catch (error) {
      console.error("Error al borrar:", error);
    }
  };


  const borrarIndividual = async (id_notificacion: string) => {
  try {
    const respuesta = await fetch(`${BACKEND_URL}/api/notificaciones/${id_notificacion}`, {
      method: 'DELETE',
    });

    if (respuesta.ok) {
      setNotificaciones(prev => prev.filter(n => n.id_notificacion !== id_notificacion));
      console.log(" Notificación borrada de la BD y pantalla");
    }
  } catch (error) {
    console.error("Error al borrar individual:", error);
  }
};

const renderLeftActions = (id_notificacion: string) => {
  return (
    <TouchableOpacity 
      style={styles.contenedorEliminarSwipe} 
      onPress={() => borrarIndividual(id_notificacion)}
    >
      <Ionicons name="trash" size={28} color="white" />
      <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Borrar</Text>
    </TouchableOpacity>
  );
};
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <View style={styles.contenedor}>
      <View style={styles.contenedorEncabezado}>
      <Text style={styles.encabezadoPrincipal}>Bandeja de Entrada</Text>

      <TouchableOpacity onPress={vaciarBandeja}>
        <Image 
          source={require('../../assets/borrarnotificaciones.png')} 
          resizeMode="contain"
          style={styles.imagenBorrar} 
        /> 
      </TouchableOpacity>
      </View>
    
      <FlatList
        data={notificaciones}
        keyExtractor={(item) => item.id_notificacion}
        renderItem={renderNotificacion}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={cargando} onRefresh={onRefresh} colors={["#205EA6"]} />
        }
        ListEmptyComponent={<Text style={{textAlign: 'center', marginTop: 50, color: '#888'}}>No hay notificaciones aún.</Text>}
      />

      {/* Botón flotante para abrir el formulario */}

      <TouchableOpacity 
        style={styles.botonFlotanteCircular}
        onPress={() => setModalFormularioVisible(true)}
      >
        <Ionicons name="add" size={28} color="white" /> 
      </TouchableOpacity>


          

      {/* ==========================================
          MODAL 1: VISTA DETALLADA DE LA NOTIFICACIÓN
          ========================================== */}
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
                  <Text style={styles.letraAvatar}>{notificacionSeleccionada.remitente_nombre.charAt(0)}</Text>
                </View>
                <View>
                  <Text style={styles.nombreRemitente}>{notificacionSeleccionada.remitente_nombre}</Text>
                  <Text style={styles.fechaModal}>{notificacionSeleccionada.fecha_creacion}</Text>
                </View>
              </View>

              <View style={styles.separador} />
              
              <Text style={styles.mensajeCompleto}>{notificacionSeleccionada.mensaje}</Text>
            </View>

          </SafeAreaView>
        )}
      </Modal>

      {/* ==========================================
          MODAL 2: FORMULARIO DE NUEVA NOTIFICACIÓN 
          ========================================== */}
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

    </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  // --- Estilos de la Pantalla Principal ---
  contenedor: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 16,
    paddingTop: 40,
  },
  encabezadoPrincipal: {
    fontSize: 24, 
    fontWeight: "bold",
    marginBottom: 16,
    color: "#1a1a1a",
  },
  tarjeta: {
    backgroundColor: "#ffffff",
    padding: 14, 
    borderRadius: 8,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  tarjetaNoLeida: {
    backgroundColor: "#f0f7ff",
    borderLeftWidth: 3,
    borderLeftColor: "#205EA6",
  },
  encabezadoTarjeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titulo: {
    fontSize: 16, 
    color: "#212529",
    flex: 1,
    paddingRight: 8,
  },
  textoNegrita: {
    fontWeight: "600",
  },
  fecha: {
    fontSize: 12,
    color: "#6c757d",
    marginLeft: 8,
  },
  remitenteLista: {
    fontSize: 14,
    color: "#495057",
    marginTop: 2,
  },
  mensajeResumen: {
    fontSize: 14,
    color: "#6c757d",
    marginTop: 6,
  },
  botonFlotanteCircular: {
    position: 'absolute',
    bottom: 90,           
    right: 20,             
    backgroundColor: '#205EA6',
    padding: 16,          
    borderRadius: 30,     
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,           
  },
  contenedorEncabezado: {
    flexDirection: 'row',      
    justifyContent: 'space-between', 
    alignItems: 'center',         
    width: '100%',
    marginTop: 50,                
    marginBottom: 10,
  },
imagenBorrar: {
  width: 30,
  height: 30,
},

contenedorEliminarSwipe: {
    backgroundColor: '#ff0056',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '90%', // Un poco menos que la tarjeta para que no choque con los bordes
    marginTop: 5,  // Alineado con el margen de tu tarjeta
    borderRadius: 10,
    marginLeft: 10,
  },

  // --- Estilos del Modal 1 (Vista Detallada) ---
  contenedorModal: {
    flex: 1,
    backgroundColor: "#fff",
  },
  barraSuperiorModal: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  botonCerrar: {
    fontSize: 16,
    color: "#205EA6",
    fontWeight: "bold",
  },
  contenidoDetalle: {
    padding: 20,
  },
  tituloModal: {
    fontSize: 22, 
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 16,
  },
  infoRemitente: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarCircular: {
    width: 40, 
    height: 40,
    borderRadius: 20,
    backgroundColor: "#205EA6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  letraAvatar: {
    color: "#fff",
    fontSize: 18, 
    fontWeight: "bold",
  },
  nombreRemitente: {
    fontSize: 16, 
    fontWeight: "bold",
    color: "#212529",
  },
  fechaModal: {
    fontSize: 13, 
    color: "#6c757d",
  },
  separador: {
    height: 1,
    backgroundColor: "#eee",
    marginBottom: 16,
  },
  mensajeCompleto: {
    fontSize: 16, 
    lineHeight: 24, 
    color: "#343a40",
  },

  // --- Estilos del Modal 2 (Formulario) ---
  fondoOscuroModal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16, 
  },
  tarjetaFormulario: {
    backgroundColor: "#fff",
    width: "100%",
    borderRadius: 12,
    padding: 20, 
  },
  tituloFormulario: {
    fontSize: 20, 
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 20,
    textAlign: "center",
  },
  labelInput: {
    fontSize: 15, 
    fontWeight: "bold",
    color: "#495057",
    marginBottom: 6,
  },
  inputTexto: {
    borderWidth: 1,
    borderColor: "#ced4da",
    borderRadius: 6,
    padding: 10, 
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  inputMultilinea: {
    minHeight: 120, 
  },
  contenedorBotonesForm: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  botonCancelar: {
    flex: 1,
    padding: 14, 
    borderRadius: 6,
    marginRight: 8,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
  },
  textoBotonCancelar: {
    fontSize: 16,
    color: "#666",
    fontWeight: "bold",
  },
  botonEnviar: {
    flex: 1,
    padding: 14, 
    borderRadius: 6,
    marginLeft: 8,
    backgroundColor: "#205EA6",
    alignItems: "center",
  },
  textoBotonEnviar: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
  },

  contenedorScrollChips: {
    height: 40,
    marginBottom: 16,
  },
  chipContacto: {
    backgroundColor: "#e9ecef",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#dee2e6",
    justifyContent: "center",
  },
  chipSeleccionado: {
    backgroundColor: "#205EA6",
    borderColor: "#205EA6",
  },
  textoChip: {
    fontSize: 14,
    color: "#495057",
  },
  textoChipSeleccionado: {
    color: "#fff",
    fontWeight: "bold",
  },
});
