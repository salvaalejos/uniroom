import React, { useState, useEffect } from "react";
import { 
  View, Text, FlatList, StyleSheet, TouchableOpacity, Modal, SafeAreaView, TextInput, Alert, ScrollView 
} from "react-native";
import { Ionicons } from '@expo/vector-icons';

export default function NotificationScreen() {
  // 1. Estados para la lista de Notificaciones
  const [notificaciones, setNotificaciones] = useState([]);
  
  // 2. Estados para controlar la vista detallada
  const [notificacionSeleccionada, setNotificacionSeleccionada] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // 3. Estados para el FORMULARIO de Nuevo Reporte
  const [modalFormularioVisible, setModalFormularioVisible] = useState(false);
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [nuevoMensaje, setNuevoMensaje] = useState("");

  // 4. Estados para los Contactos (Destinatarios)
  const [contactos, setContactos] = useState([]);
  const [destinatarioSeleccionado, setDestinatarioSeleccionado] = useState(null);

  useEffect(() => {
    // Datos de prueba - Notificaciones
    const notificacionesDePrueba = [
      {
        id_notificacion: "1",
        titulo: "Fuga de agua en el baño",
        mensaje: "Hola, te reporto que la llave del lavabo está goteando desde ayer. ¿Podrías mandar a alguien a revisarlo por favor? Saludos.",
        leida: false,
        remitente: "Said. (Estudiante)",
        fecha: "14 Abr, 10:30 AM"
      },
      {
        id_notificacion: "2",
        titulo: "Pago de luz recibido",
        mensaje: "Gracias por enviar el comprobante. El pago de la luz de este mes ha quedado registrado sin problemas.",
        leida: true,
        remitente: "Administración (Arrendador)",
        fecha: "12 Abr, 04:15 PM"
      },
    ];
    setNotificaciones(notificacionesDePrueba);

    // Datos de prueba - Contactos
    const contactosDePrueba = [
      { id_usuario: "u1", nombre: "Obama (Casa del techo blanco)" },
      { id_usuario: "u2", nombre: "Pinocho (Casa de la esquina)" },
      { id_usuario: "admin", nombre: "Administración" },
    ];
    setContactos(contactosDePrueba);
  }, []);

  const abrirDetalle = (item) => {
    setNotificacionSeleccionada(item);
    setModalVisible(true);
  };

  // Función para simular el envío del formulario
  const enviarReporte = () => {
    if (!destinatarioSeleccionado) {
      Alert.alert("Destinatario faltante", "Por favor selecciona a quién va dirigido el reporte.");
      return;
    }

    if (nuevoTitulo.trim() === "" || nuevoMensaje.trim() === "") {
      Alert.alert("Campos incompletos", "Por favor escribe un asunto y un mensaje para el reporte.");
      return;
    }

    const nombreDestinatario = contactos.find(c => c.id_usuario === destinatarioSeleccionado)?.nombre || "Usuario";

    const nuevoReporte = {
      id_notificacion: Math.random().toString(), 
      titulo: nuevoTitulo,
      mensaje: nuevoMensaje,
      leida: true, 
      remitente: `Tú (Para: ${nombreDestinatario})`, 
      fecha: "Justo ahora"
    };


    setNotificaciones([nuevoReporte, ...notificaciones]);
    
    setNuevoTitulo("");
    setNuevoMensaje("");
    setDestinatarioSeleccionado(null);
    setModalFormularioVisible(false);
  };

  const renderNotificacion = ({ item }) => (
    <TouchableOpacity 
      style={[styles.tarjeta, !item.leida && styles.tarjetaNoLeida]}
      onPress={() => abrirDetalle(item)}
      activeOpacity={0.7}
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
        keyExtractor={(item) => item.id_notificacion}
        renderItem={renderNotificacion}
        showsVerticalScrollIndicator={false}
      />

      {/* Botón flotante para abrir el formulario */}
      <TouchableOpacity 
        style={styles.botonFlotanteCircular}
        onPress={() => setModalFormularioVisible(true)}
      >
        <Ionicons name="add" size={28} color="white" /> 
      </TouchableOpacity>

      {/* ==========================================
          MODAL 1: VISTA DETALLADA
          ========================================== */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
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
            </View>

          </SafeAreaView>
        )}
      </Modal>

      {/* ==========================================
          MODAL 2: FORMULARIO DE NUEVO REPORTE
          ========================================== */}
      <Modal 
        animationType="fade" 
        transparent={true} 
        visible={modalFormularioVisible}
        onRequestClose={() => setModalFormularioVisible(false)}
      >
        <View style={styles.fondoOscuroModal}>
          <View style={styles.tarjetaFormulario}>
            <Text style={styles.tituloFormulario}>Nuevo Reporte</Text>

            {/* Selector de Contactos */}
            <Text style={styles.labelInput}>Para:</Text>
            <View style={styles.contenedorScrollChips}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {contactos.map((contacto) => (
                  <TouchableOpacity
                    key={contacto.id_usuario}
                    style={[
                      styles.chipContacto,
                      destinatarioSeleccionado === contacto.id_usuario && styles.chipSeleccionado
                    ]}
                    onPress={() => setDestinatarioSeleccionado(contacto.id_usuario)}
                  >
                    <Text style={[
                      styles.textoChip,
                      destinatarioSeleccionado === contacto.id_usuario && styles.textoChipSeleccionado
                    ]}>
                      {contacto.nombre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            <Text style={styles.labelInput}>Asunto</Text>
            <TextInput 
              style={styles.inputTexto}
              placeholder="Ej. Problema con el internet"
              value={nuevoTitulo}
              onChangeText={setNuevoTitulo}
            />

            <Text style={styles.labelInput}>Mensaje</Text>
            <TextInput 
              style={[styles.inputTexto, styles.inputMultilinea]}
              placeholder="Describe los detalles aquí..."
              multiline={true}
              numberOfLines={4}
              textAlignVertical="top"
              value={nuevoMensaje}
              onChangeText={setNuevoMensaje}
            />

            <View style={styles.contenedorBotonesForm}>
              <TouchableOpacity 
                style={styles.botonCancelar} 
                onPress={() => {
                  setModalFormularioVisible(false);
                  setDestinatarioSeleccionado(null);
                }}
              >
                <Text style={styles.textoBotonCancelar}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.botonEnviar} 
                onPress={enviarReporte}
              >
                <Text style={styles.textoBotonEnviar}>Enviar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
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
    left: 20,             
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

  // --- Estilos del Selector de Contactos (Chips) ---
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
