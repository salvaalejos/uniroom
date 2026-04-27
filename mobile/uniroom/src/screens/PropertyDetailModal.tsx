import React, { useState, useRef, useEffect } from 'react';
import {
  Modal, View, Text, ScrollView, Image, TouchableOpacity, TextInput,
  StyleSheet, Dimensions, Alert, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useVideoPlayer, VideoView } from 'expo-video';
import DateTimePicker from '@react-native-community/datetimepicker';
import { solicitarCita } from '../services/api';
import type { Propiedad } from '../data/propiedades';

const { width, height } = Dimensions.get('window');
const ANFITRION = require('../default_images/anfi.jpg');

type Comentario = { autor: string; texto: string; fecha: string };

const COMENTARIOS_INICIALES: Comentario[] = [
  { autor: "Ana G.", texto: "Muy buen lugar, limpio y tranquilo.", fecha: "12 de enero de 2025 a las 3:25 p.m." },
  { autor: "Carlos M.", texto: "Excelente ubicación, el anfitrión muy amable.", fecha: "3 de febrero de 2025 a las 8:46 a.m." },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  propiedad: Propiedad | null;
  puedeOpinar: boolean;
  onAlquilar?: (prop: Propiedad) => void;
  modoActual: 'buscando' | 'viviendo';
  propiedadRentadaId?: number;
  currentUserId?: string;
}

export default function PropertyDetailModal({
  visible, onClose, propiedad, puedeOpinar, onAlquilar, modoActual, propiedadRentadaId, currentUserId = 'estudiante1'
}: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [favorito, setFavorito] = useState(false);
  const [imagenActual, setImagenActual] = useState(0);
  const [miCalificacion, setMiCalificacion] = useState(0);
  const [comentarios, setComentarios] = useState<Comentario[]>(COMENTARIOS_INICIALES);
  const [nuevoComentario, setNuevoComentario] = useState("");
  
  const [showFormularioCita, setShowFormularioCita] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [horaSeleccionada, setHoraSeleccionada] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [enviandoCita, setEnviandoCita] = useState(false);

  const videoSource = propiedad?.media?.[imagenActual]?.tipo === "video"
    ? propiedad.media[imagenActual].src
    : null;
  const player = useVideoPlayer(videoSource, (playerInstance) => {
    if (playerInstance && videoSource && visible) playerInstance.loop = true;
  });

  useEffect(() => {
    if (!visible && player) player.pause();
  }, [visible, player]);

  useEffect(() => {
    if (visible && videoSource && player) {
      player.play();
    } else if (player) {
      player.pause();
    }
  }, [imagenActual, videoSource, visible, player]);

  if (!propiedad) return null;

  const yaEsMiVivienda = propiedadRentadaId === propiedad.id;

  const agregarComentario = () => {
    if (!puedeOpinar) {
      Alert.alert('Sin permiso', 'Solo puedes opinar si has rentado esta propiedad.');
      return;
    }
    if (nuevoComentario.trim() === "") return;
    const fecha = new Date().toLocaleDateString('es-MX', {
      day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: 'numeric'
    });
    setComentarios([{ autor: "Tú", texto: nuevoComentario, fecha }, ...comentarios]);
    setNuevoComentario("");
  };

  const enviarSolicitudCita = async () => {
    if (!fechaSeleccionada || !horaSeleccionada) {
      Alert.alert('Faltan datos', 'Selecciona fecha y hora para la visita.');
      return;
    }
    const fechaHora = new Date(fechaSeleccionada);
    fechaHora.setHours(horaSeleccionada.getHours(), horaSeleccionada.getMinutes());
    if (fechaHora <= new Date()) {
      Alert.alert('Fecha inválida', 'La cita debe ser futura.');
      return;
    }

    setEnviandoCita(true);
    try {
      await solicitarCita(propiedad.id, fechaHora.toISOString());
      Alert.alert('Solicitud enviada', 'El anfitrión recibirá tu petición y te responderá pronto.');
      setShowFormularioCita(false);
      setFechaSeleccionada(new Date());
      setHoraSeleccionada(new Date());
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo enviar la solicitud.');
    } finally {
      setEnviandoCita(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) setFechaSeleccionada(selectedDate);
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) setHoraSeleccionada(selectedTime);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <TouchableOpacity style={[styles.btnCerrar, { top: insets.top + 16 }]} onPress={onClose}>
          <MaterialCommunityIcons name="chevron-left" size={28} color="#1a1a2a" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btnFavorito, { top: insets.top + 16 }]} onPress={() => setFavorito(!favorito)}>
          <MaterialCommunityIcons name={favorito ? "heart" : "heart-outline"} size={26} color={favorito ? "#e74c3c" : "#1a1a2e"} />
        </TouchableOpacity>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollPrincipal} contentContainerStyle={styles.scrollContent}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              setImagenActual(index);
            }}
            style={styles.carrusel}
          >
            {propiedad.media.map((item, i) => (
              item.tipo === "imagen" ? (
                <Image key={i} source={item.src} style={styles.imagenPrincipal} resizeMode="cover" />
              ) : (
                <VideoView key={i} player={player} style={styles.imagenPrincipal} contentFit="cover" nativeControls />
              )
            ))}
          </ScrollView>

          {propiedad.media.length > 1 && (
            <View style={styles.miniaturas}>
              {propiedad.media.map((item, i) => (
                <TouchableOpacity key={i} onPress={() => {
                  setImagenActual(i);
                  scrollRef.current?.scrollTo({ x: i * width, animated: true });
                }}>
                  {item.tipo === "imagen" ? (
                    <Image source={item.src} style={[styles.miniatura, imagenActual === i && styles.miniaturaActiva]} />
                  ) : (
                    <View style={[styles.miniatura, styles.miniaturaVideo, imagenActual === i && styles.miniaturaActiva]}>
                      <MaterialCommunityIcons name="play-circle" size={28} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.info}>
            <Text style={styles.titulo}>{propiedad.titulo}</Text>

            <View style={styles.calificacionContainer}>
              <View style={styles.calificacionItem}>
                <Text style={styles.calificacionNumero}>{propiedad.calificacion}</Text>
                <View style={styles.estrellas}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <TouchableOpacity
                      key={i}
                      onPress={() => puedeOpinar && setMiCalificacion(i)}
                      disabled={!puedeOpinar}
                    >
                      <MaterialCommunityIcons
                        name={i <= (miCalificacion || Math.round(propiedad.calificacion)) ? "star" : "star-outline"}
                        size={30}
                        color="#f39c12"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                {!puedeOpinar && <Text style={styles.opinionBloqueada}>Renta esta propiedad para calificar</Text>}
              </View>
              <View style={styles.calificacionItem}>
                <Text style={styles.calificacionNumero}>{propiedad.opiniones}</Text>
                <Text style={styles.opinionesLabel}>opiniones</Text>
              </View>
            </View>

            <View style={styles.divider} />
            <View style={styles.anfitrionRow}>
              <Image source={ANFITRION} style={styles.avatarImagen} />
              <View><Text style={styles.anfitrionLabel}>Anfitrión</Text><Text style={styles.anfitrionNombre}>{propiedad.anfitrion}</Text></View>
            </View>
            <View style={styles.divider} />
            <View style={styles.seccion}><MaterialCommunityIcons name="map-marker" size={20} color="#205EA6" /><Text style={styles.seccionTexto}>{propiedad.ubicacion}</Text></View>
            <View style={styles.divider} />
            <Text style={styles.descripcion}>{propiedad.descripcion}</Text>
            <View style={styles.divider} />
            <Text style={styles.subtitulo}>Servicios incluidos</Text>
            <View style={styles.tags}>{propiedad.servicios.map((s, i) => <View key={i} style={styles.tag}><Text style={styles.tagTexto}>{s}</Text></View>)}</View>
            <View style={styles.divider} />
            <Text style={styles.subtitulo}>Reglas de la casa</Text>
            <View style={styles.tags}>{propiedad.reglas.map((r, i) => <View key={i} style={[styles.tag, styles.tagRegla]}><Text style={[styles.tagTexto, styles.tagTextoRegla]}>{r}</Text></View>)}</View>
            <View style={styles.divider} />

            {modoActual === 'buscando' && !yaEsMiVivienda && (
              <TouchableOpacity style={styles.botonSolicitarCita} onPress={() => setShowFormularioCita(true)}>
                <MaterialCommunityIcons name="calendar-clock" size={20} color="#FFF" />
                <Text style={styles.textoBotonCita}>Solicitar visita</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.subtitulo}>Comentarios</Text>
            <View style={styles.inputComentarioContainer}>
              <TextInput
                style={[styles.inputComentario, !puedeOpinar && styles.inputDisabled]}
                placeholder={puedeOpinar ? "Escribe tu comentario..." : "Renta esta propiedad para opinar"}
                value={nuevoComentario}
                onChangeText={setNuevoComentario}
                multiline
                editable={puedeOpinar}
              />
              <TouchableOpacity style={[styles.btnEnviar, !puedeOpinar && styles.btnDisabled]} onPress={agregarComentario} disabled={!puedeOpinar}>
                <MaterialCommunityIcons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            {comentarios.map((c, i) => (
              <View key={i} style={styles.comentario}>
                <Image source={ANFITRION} style={styles.comentarioAvatar} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={styles.comentarioAutor}>{c.autor}</Text>
                    <Text style={{ fontSize: 11, color: "#aaa" }}>{c.fecha}</Text>
                  </View>
                  <Text style={styles.comentarioTexto}>{c.texto}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View>
            <Text style={styles.footerPrecio}>${propiedad.precio.toLocaleString('es-MX')}</Text>
            <Text style={styles.footerMes}>/ mes</Text>
          </View>
          {modoActual === 'buscando' && !yaEsMiVivienda && (
            <TouchableOpacity style={styles.btnAgendarCita} onPress={() => setShowFormularioCita(true)}>
              <MaterialCommunityIcons name="calendar-clock" size={18} color="#FFF" />
              <Text style={styles.btnContactoTexto}>Agendar cita</Text>
            </TouchableOpacity>
          )}
          {modoActual === 'viviendo' && (
            <TouchableOpacity style={styles.btnContacto}>
              <MaterialCommunityIcons name="phone" size={18} color="#FFF" />
              <Text style={styles.btnContactoTexto}>Contactar anfitrión</Text>
            </TouchableOpacity>
          )}
          {yaEsMiVivienda && (
            <View style={styles.btnYaRentada}>
              <MaterialCommunityIcons name="check-circle" size={18} color="#2B9348" />
              <Text style={styles.textoYaRentada}>Ya es tu vivienda actual</Text>
            </View>
          )}
        </View>

        <Modal visible={showFormularioCita} transparent animationType="fade">
          <View style={styles.modalFondo}>
            <View style={styles.modalCita}>
              <Text style={styles.tituloCita}>Agendar visita</Text>
              <Text style={styles.subtituloCita}>Propiedad: {propiedad.titulo}</Text>

              <TouchableOpacity style={styles.campoFecha} onPress={() => setShowDatePicker(true)}>
                <MaterialCommunityIcons name="calendar" size={24} color="#205EA6" />
                <Text style={styles.textoFecha}>{fechaSeleccionada.toLocaleDateString()}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.campoFecha} onPress={() => setShowTimePicker(true)}>
                <MaterialCommunityIcons name="clock-outline" size={24} color="#205EA6" />
                <Text style={styles.textoFecha}>{horaSeleccionada.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={fechaSeleccionada}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                  minimumDate={new Date()}
                />
              )}
              {showTimePicker && (
                <DateTimePicker
                  value={horaSeleccionada}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onTimeChange}
                />
              )}

              <View style={styles.botonesCita}>
                <TouchableOpacity style={styles.botonCancelarCita} onPress={() => setShowFormularioCita(false)}>
                  <Text style={styles.textoBotonCancelar}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.botonEnviarCita} onPress={enviarSolicitudCita} disabled={enviandoCita}>
                  <Text style={styles.textoBotonEnviar}>{enviandoCita ? 'Enviando...' : 'Solicitar cita'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollPrincipal: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  carrusel: { height: height * 0.38 },
  imagenPrincipal: { width, height: height * 0.38 },
  btnCerrar: { position: "absolute", left: 16, backgroundColor: "#fff", borderRadius: 28, padding: 8, elevation: 6, zIndex: 10 },
  btnFavorito: { position: "absolute", right: 16, backgroundColor: "#fff", borderRadius: 28, padding: 8, elevation: 6, zIndex: 10 },
  miniaturas: { flexDirection: "row", gap: 8, padding: 12, backgroundColor: "#f5f5f5" },
  miniatura: { width: 70, height: 60, borderRadius: 10, opacity: 0.6 },
  miniaturaVideo: { backgroundColor: "#1a1a2e", justifyContent: "center", alignItems: "center" },
  miniaturaActiva: { opacity: 1, borderWidth: 3, borderColor: "#205EA6" },
  info: { padding: 20 },
  titulo: { fontSize: 24, fontWeight: "800", color: "#1a1a2e", marginBottom: 10 },
  calificacionContainer: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 8 },
  calificacionItem: { alignItems: "center", gap: 6 },
  calificacionNumero: { fontSize: 28, fontWeight: "800" },
  estrellas: { flexDirection: "row", gap: 8, marginVertical: 6 },
  opinionBloqueada: { fontSize: 11, color: "#aaa", marginTop: 4 },
  opinionesLabel: { fontSize: 14 },
  divider: { height: 1, backgroundColor: "#eee", marginVertical: 16 },
  anfitrionRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatarImagen: { width: 54, height: 54, borderRadius: 27 },
  anfitrionLabel: { fontSize: 12, color: "#888" },
  anfitrionNombre: { fontSize: 18, fontWeight: "700" },
  seccion: { flexDirection: "row", gap: 10 },
  seccionTexto: { flex: 1, fontSize: 14, color: "#444" },
  descripcion: { fontSize: 14, color: "#555", lineHeight: 22 },
  subtitulo: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tag: { backgroundColor: "#EEF4FF", borderRadius: 24, paddingVertical: 8, paddingHorizontal: 16 },
  tagTexto: { fontSize: 14, color: "#205EA6", fontWeight: "600" },
  tagRegla: { backgroundColor: "#FFF0F0" },
  tagTextoRegla: { color: "#b83e31" },
  botonSolicitarCita: { backgroundColor: "#FF6B35", flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, paddingVertical: 12, borderRadius: 40, marginBottom: 20 },
  textoBotonCita: { color: "#FFF", fontWeight: "bold", fontSize: 16 },
  inputComentarioContainer: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 20 },
  inputComentario: { flex: 1, backgroundColor: "#f5f5f5", borderRadius: 16, padding: 14, fontSize: 14 },
  inputDisabled: { backgroundColor: "#f0f0f0", color: "#aaa" },
  btnEnviar: { backgroundColor: "#205EA6", borderRadius: 30, padding: 16 },
  btnDisabled: { backgroundColor: "#ccc" },
  comentario: { flexDirection: "row", gap: 12, marginBottom: 20 },
  comentarioAvatar: { width: 40, height: 40, borderRadius: 20 },
  comentarioAutor: { fontSize: 16, fontWeight: "700" },
  comentarioTexto: { fontSize: 14, color: "#666", marginTop: 2 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderTopWidth: 1, borderTopColor: "#eee", backgroundColor: "#fff" },
  footerPrecio: { fontSize: 22, fontWeight: "800" },
  footerMes: { fontSize: 12, color: "#888" },
  btnContacto: { flexDirection: "row", backgroundColor: "#205EA6", borderRadius: 30, paddingVertical: 14, paddingHorizontal: 28, alignItems: "center", gap: 10 },
  btnAgendarCita: { flexDirection: "row", backgroundColor: "#FF6B35", borderRadius: 30, paddingVertical: 14, paddingHorizontal: 28, alignItems: "center", gap: 10 },
  btnYaRentada: { flexDirection: "row", backgroundColor: "#E9ECEF", borderRadius: 30, paddingVertical: 14, paddingHorizontal: 28, alignItems: "center", gap: 10 },
  textoYaRentada: { color: "#2B9348", fontWeight: "bold" },
  btnContactoTexto: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  modalFondo: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalCita: { backgroundColor: "#fff", borderRadius: 28, padding: 20, width: width * 0.8, alignItems: "center" },
  tituloCita: { fontSize: 20, fontWeight: "bold", marginBottom: 8 },
  subtituloCita: { fontSize: 14, color: "#666", marginBottom: 20, textAlign: "center" },
  campoFecha: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: "#f0f0f0", borderRadius: 12, width: "100%", marginBottom: 12 },
  textoFecha: { fontSize: 16, color: "#1a1a2e" },
  botonesCita: { flexDirection: "row", gap: 12, marginTop: 20, width: "100%" },
  botonCancelarCita: { flex: 1, backgroundColor: "#E9ECEF", paddingVertical: 12, borderRadius: 40, alignItems: "center" },
  textoBotonCancelar: { color: "#6C757D", fontWeight: "bold" },
  botonEnviarCita: { flex: 1, backgroundColor: "#205EA6", paddingVertical: 12, borderRadius: 40, alignItems: "center" },
  textoBotonEnviar: { color: "#FFF", fontWeight: "bold" },
});