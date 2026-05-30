import { ScrollView, Text, View, StyleSheet, TextInput, Image, TouchableOpacity, Modal, Dimensions, Alert, ActivityIndicator, Platform, PanResponder, KeyboardAvoidingView } from 'react-native'
import { useState, useRef, useEffect } from 'react'
import * as ImagePicker from 'expo-image-picker'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useVideoPlayer, VideoView } from 'expo-video'
import DateTimePickerModal from 'react-native-modal-datetime-picker'
import Mapbox from '@rnmapbox/maps'
import * as Location from 'expo-location'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useTheme } from '../context/ThemeContext'
import { useCustomAlert } from '../context/AlertContext'
import { API_BASE_URL as API_URL } from '../config'
import { useMutation, useQueryClient } from '@tanstack/react-query'

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN
Mapbox.setAccessToken(MAPBOX_TOKEN!)

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const SERVICIOS_OPCIONES = ["WiFi", "Agua", "Luz", "Gas", "Lavadora", "Estacionamiento", "Amueblado"]
const REGLAS_OPCIONES = ["No mascotas", "No fumar", "No fiestas", "Solo estudiantes", "No visitas"]
const TIPOS_INMUEBLE = ["Cuarto", "Departamento", /*"Casa",*/ "Estudio", "Loft"]

const SERVICIOS_ICONS: Record<string, any> = {
    "WiFi": "wifi",
    "Agua": "water",
    "Luz": "lightning-bolt",
    "Gas": "fire",
    "Lavadora": "washing-machine",
    "Estacionamiento": "car",
    "Amueblado": "bed"
};

const REGLAS_ICONS: Record<string, any> = {
    "No mascotas": "paw-off",
    "No fumar": "smoking-off",
    "No fiestas": "glass-wine",
    "Solo estudiantes": "school",
    "No visitas": "account-cancel"
};

const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const HORAS_PREDEFINIDAS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];

type Media = {
    uri: string
    tipo: "foto" | "video"
    id_imagen?: number
}

type HorarioVisita = {
    fecha: string
    horas: string[]
}

type CuartoAdicional = {
    nombre: string
    precio: string
    descripcion: string
}

type Formulario = {
    titulo: string
    descripcion: string
    precio: string
    ubicacion: string
    servicios: string[]
    reglas: string[]
    medios: Media[]
    estado: "pendiente" | "publicado"
    tipoInmueble: string
    latitud: string
    longitud: string
    horariosVisita: HorarioVisita[]
    cuartosAdicionales: CuartoAdicional[]
}

const VideoItem = ({ uri, style, useNativeControls = false }: { uri: string, style: any, useNativeControls?: boolean }) => {
    const player = useVideoPlayer(uri, (p) => {
        p.muted = true;
        p.loop = true;
    });
    return (
        <VideoView
            player={player}
            style={style}
            contentFit="cover"
            nativeControls={useNativeControls}
        />
    )
}

const Lessor_Renthouse = () => {
    const insets = useSafeAreaInsets()
    const navigation = useNavigation<any>()
    const route = useRoute<any>()
    const { colors, isDark } = useTheme()
    const { showAlert } = useCustomAlert()
    const queryClient = useQueryClient()

    const inmuebleExistente = route.params?.inmueble ?? null
    const esEdicion = inmuebleExistente !== null

    const [idsBorrados, setIdsBorrados] = useState<number[]>([])
    const [mapaCoords, setMapaCoords] = useState<{latitude: number, longitude: number}>({ 
        latitude: 19.721869, 
        longitude: -101.185483 
    })
    const [scrollEnabled, setScrollEnabled] = useState(true)

    const mapPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponderCapture: () => {
                setScrollEnabled(false);
                return false; 
            },
            onMoveShouldSetPanResponderCapture: () => {
                setScrollEnabled(false);
                return false;
            },
            onPanResponderTerminationRequest: () => true,
            onPanResponderRelease: () => setScrollEnabled(true),
            onPanResponderTerminate: () => setScrollEnabled(true),
        })
    ).current;

    const initialForm: Formulario = {
        titulo: "",
        descripcion: "",
        precio: "",
        ubicacion: "",
        servicios: [],
        reglas: [],
        medios: [],
        estado: "pendiente",
        tipoInmueble: "",
        latitud: "19.721869",
        longitud: "-101.185483",
        horariosVisita: [],
        cuartosAdicionales: [],
    };

    const [form, setForm] = useState<Formulario>(initialForm)

    useEffect(() => {
        if (route.params?.inmueble) {
            const raw = route.params.inmueble.rawData || route.params.inmueble;
            const lat = parseFloat(raw.direccion_latitud || "19.721869");
            const lng = parseFloat(raw.direccion_longitud || "-101.185483");
            
            const tipoMapInverso: Record<string, string> = {
                "CASA": "Casa",
                "DEPA": "Departamento",
                "CUARTO": "Cuarto"
            };

            setForm({
                titulo: raw.titulo || "",
                descripcion: raw.descripcion || "",
                precio: raw.precio_mensual?.toString() || "",
                ubicacion: "Morelia, Michoacán",
                servicios: raw.servicios?.map((s: any) => {
                    const id = s.id_servicios;
                    return SERVICIOS_OPCIONES[id - 1] || s.nombre;
                }) || [],
                reglas: raw.restricciones?.map((r: any) => {
                    const id = r.id_restriccion;
                    return REGLAS_OPCIONES[id - 1] || r.nombre;
                }) || [],
                medios: raw.imagenes?.map((img: any) => {
                    const isVideo = img.imagen.match(/\.(mp4|mov|avi|wmv)$/i);
                    return { 
                        uri: img.imagen.startsWith('http') ? img.imagen : `${API_URL}${img.imagen}`, 
                        tipo: isVideo ? "video" : "foto",
                        id_imagen: img.id_imagen
                    };
                }) || [],
                estado: raw.estado === "DISPONIBLE" ? "publicado" : "pendiente",
                tipoInmueble: tipoMapInverso[raw.tipo_inmueble] || "Cuarto",
                latitud: lat.toString(),
                longitud: lng.toString(),
                horariosVisita: raw.disponibilidad?.map((d: any) => ({
                    fecha: d.fecha,
                    horas: d.horas
                })) || [],
                cuartosAdicionales: [],
            });
            setMapaCoords({ latitude: lat, longitude: lng });
            setIdsBorrados([]); 
        } else {
            setForm(initialForm);
            setIdsBorrados([]);
        }
    }, [route.params?.inmueble]);

    const [previsualizando, setPrevisualizando] = useState(false)
    const [fechaActivaVisita, setFechaActivaVisita] = useState<string | null>(null)
    const [modalHora, setModalHora] = useState(false)
    const [mapaListo, setMapaListo] = useState(false)
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
    const cameraRef = useRef<Mapbox.Camera>(null)
    const mapRef = useRef<Mapbox.MapView>(null)

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync()
            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
                setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude })
                if (form.latitud === "19.721869") {
                    setForm(f => ({ ...f, latitud: loc.coords.latitude.toString(), longitud: loc.coords.longitude.toString() }))
                    setMapaCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude })
                }
            }
        })()
    }, [])

    useEffect(() => {
        if (mapaListo && cameraRef.current) {
            cameraRef.current.setCamera({
                centerCoordinate: [parseFloat(form.longitud), parseFloat(form.latitud)],
                zoomLevel: 15,
                animationDuration: 500,
            })
        }
    }, [mapaListo])

    const agregarMedia = async (tipo: "foto" | "video") => {
        const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (!permiso.granted) return
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: tipo === "foto" ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
            allowsMultipleSelection: true,
            quality: 0.8,
        })
        if (!result.canceled) {
            const nuevos: Media[] = result.assets.map(a => ({ uri: a.uri, tipo }))
            setForm(f => ({ ...f, medios: [...f.medios, ...nuevos].slice(0, 6) }))
        }
    }

    const eliminarMedia = (index: number) => {
        const mediaABorrar = form.medios[index];
        if (mediaABorrar.id_imagen) {
            setIdsBorrados(prev => [...prev, mediaABorrar.id_imagen!]);
        }
        setForm(f => ({ ...f, medios: f.medios.filter((_, i) => i !== index) }))
    }

    const toggleItem = (campo: "servicios" | "reglas", item: string) => {
        setForm(f => ({
            ...f,
            [campo]: f[campo].includes(item) ? f[campo].filter(i => i !== item) : [...f[campo], item]
        }))
    }

    const agregarFechaVisita = (dateString: string) => {
        const yaExiste = form.horariosVisita.find(h => h.fecha === dateString)
        if (!yaExiste) {
            setForm(f => ({
                ...f,
                horariosVisita: [...f.horariosVisita, { fecha: dateString, horas: [] }]
            }))
        } else {
            setForm(f => ({
                ...f,
                horariosVisita: f.horariosVisita.filter(h => h.fecha !== dateString)
            }))
        }
    }

    const agregarHoraAFecha = (fecha: string, hora: string) => {
        setForm(f => ({
            ...f,
            horariosVisita: f.horariosVisita.map(h =>
                h.fecha === fecha && !h.horas.includes(hora) ? { ...h, horas: [...h.horas, hora].sort() } : h
            )
        }))
    }

    const toggleHoraPredefinida = (fecha: string, hora: string) => {
        setForm(f => {
            const hObj = f.horariosVisita.find(h => h.fecha === fecha);
            if (!hObj) return f;
            const tieneHora = hObj.horas.includes(hora);
            return {
                ...f,
                horariosVisita: f.horariosVisita.map(h =>
                    h.fecha === fecha
                        ? { ...h, horas: tieneHora ? h.horas.filter(hr => hr !== hora) : [...h.horas, hora].sort() }
                        : h
                )
            };
        });
    }

    const onTimeConfirm = (date: Date) => {
        setModalHora(false);
        if (fechaActivaVisita) {
            const hh = date.getHours().toString().padStart(2, '0');
            const mm = date.getMinutes().toString().padStart(2, '0');
            agregarHoraAFecha(fechaActivaVisita, `${hh}:${mm}`);
        }
    }

    const eliminarHora = (fecha: string, hora: string) => {
        setForm(f => ({
            ...f,
            horariosVisita: f.horariosVisita.map(h =>
                h.fecha === fecha ? { ...h, horas: h.horas.filter(hr => hr !== hora) } : h
            )
        }))
    }

    const eliminarFechaVisita = (fecha: string) => {
        setForm(f => ({ ...f, horariosVisita: f.horariosVisita.filter(h => h.fecha !== fecha) }))
        if (fechaActivaVisita === fecha) setFechaActivaVisita(null)
    }

    const agregarCuarto = () => {
        setForm(f => ({
            ...f,
            cuartosAdicionales: [...f.cuartosAdicionales, { nombre: `Cuarto ${f.cuartosAdicionales.length + 1}`, precio: "", descripcion: "" }]
        }))
    }

    const eliminarCuarto = (index: number) => {
        setForm(f => ({ ...f, cuartosAdicionales: f.cuartosAdicionales.filter((_, i) => i !== index) }))
    }

    const actualizarCuarto = (index: number, campo: keyof CuartoAdicional, valor: string) => {
        setForm(f => ({
            ...f,
            cuartosAdicionales: f.cuartosAdicionales.map((c, i) => i === index ? { ...c, [campo]: valor } : c)
        }))
    }

    const guardarMutation = useMutation({
        mutationFn: async () => {
            const token = await AsyncStorage.getItem('token')
            if (!token) throw new Error('No autenticado')

            const idActual = route.params?.inmueble?.id_inmueble || route.params?.inmueble?.rawData?.id_inmueble;
            const esEdicionReal = !!idActual;

            // OBTENER COORDENADAS REALES DEL MAPA (Source of Truth)
            let latFinal = mapaCoords.latitude;
            let lngFinal = mapaCoords.longitude;

            if (mapRef.current) {
                try {
                    const center = await mapRef.current.getCenter();
                    if (center && center.length >= 2) {
                        lngFinal = center[0];
                        latFinal = center[1];
                        console.log("[Upload] Coordenadas obtenidas de MapRef:", latFinal, lngFinal);
                    }
                } catch (mapErr) {
                    console.warn("[Upload] No se pudo obtener centro de MapRef, usando mapaCoords state");
                }
            }

            const formData = new FormData();
            formData.append('precio_mensual', form.precio || "0");
            formData.append('descripcion', form.descripcion || "");
            
            formData.append('direccion_latitud', latFinal.toString());
            formData.append('direccion_longitud', lngFinal.toString());
            
            console.log("[Upload] Enviando a BD:", { lat: latFinal, lng: lngFinal });
            
            formData.append('titulo', form.titulo || "Inmueble");
            
            const tipoMap: Record<string, string> = {
                "Casa": "CASA",
                "Departamento": "DEPA",
                "Cuarto": "CUARTO"
            };
            formData.append('tipo_inmueble', tipoMap[form.tipoInmueble] || "CUARTO");
            
            formData.append('servicios', JSON.stringify(form.servicios.map(s => SERVICIOS_OPCIONES.indexOf(s) + 1)));
            formData.append('restricciones', JSON.stringify(form.reglas.map(r => REGLAS_OPCIONES.indexOf(r) + 1)));
            
            // AGREGAR HORARIOS DE VISITA
            if (form.horariosVisita.length > 0) {
                formData.append('horariosVisita', JSON.stringify(form.horariosVisita));
            }

            if (esEdicionReal) {
                formData.append('ids_borrados', JSON.stringify(idsBorrados));
            }

            form.medios.forEach((media, i) => {
                if (!media.id_imagen) {
                    const uriParts = media.uri.split('.');
                    const fileType = uriParts[uriParts.length - 1];
                    const fileName = `media_${Date.now()}_${i}.${fileType}`;

                    formData.append('imagenes', {
                        uri: Platform.OS === 'android' ? media.uri : media.uri.replace('file://', ''),
                        name: fileName,
                        type: media.tipo === "foto" ? `image/${fileType}` : `video/${fileType}`,
                    } as any);
                }
            });

            const finalUrl = esEdicionReal ? `${API_URL}/inmuebles/${idActual}` : `${API_URL}/inmuebles`;
            const method = esEdicionReal ? 'PUT' : 'POST';
            
            const resp = await fetch(finalUrl, {
                method: method,
                headers: { 
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: formData,
            });

            const responseText = await resp.text();
            let data;
            try { data = JSON.parse(responseText); } catch(e) { data = { error: responseText }; }

            if (!resp.ok) throw new Error(data.error || data.details || "Error desconocido");
            return { data, esEdicionReal };
        },
        onSuccess: ({ esEdicionReal }) => {
            queryClient.invalidateQueries({ queryKey: ['misInmuebles'] });
            queryClient.invalidateQueries({ queryKey: ['inmuebles'] });
            showAlert({ title: 'Éxito', message: esEdicionReal ? 'Actualizado correctamente' : 'Registrado correctamente', type: 'success' });
            navigation.goBack();
        },
        onError: (error: any) => {
            showAlert({ title: 'Error', message: error.message, type: 'error' });
        }
    });

    const formularioValido = () => {
        const basicos = form.titulo.trim() !== "" &&
            form.precio.trim() !== "" &&
            form.descripcion.trim() !== "" &&
            form.medios.length > 0 &&
            form.tipoInmueble !== "" &&
            form.horariosVisita.length > 0;

        if (!basicos) return false;

        const horasCompletas = form.horariosVisita.every(h => h.horas.length > 0);
        return horasCompletas;
    }

    const publicar = () => {
        if (!formularioValido()) {
            showAlert({ title: 'Campos incompletos', message: 'Asegúrate de llenar todos los campos obligatorios y de asignar al menos un horario a cada día de visita seleccionado.', type: 'warning' })
            return
        }
        guardarMutation.mutate()
    }

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            style={{ flex: 1 }}
        >
            {/* Botón de volver fijo */}
            <TouchableOpacity 
                style={[styles.btnVolver, { top: insets.top + 16, backgroundColor: colors.background }]} 
                onPress={() => navigation.goBack()}
            >
                <MaterialCommunityIcons name="chevron-left" size={28} color={colors.textPrimary} />
            </TouchableOpacity>

            <ScrollView 
                style={[styles.background, { backgroundColor: colors.background }]} 
                contentContainerStyle={{ paddingBottom: 120, paddingTop: insets.top + 70 }}
                scrollEnabled={scrollEnabled}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.headerRow}>
                    <Text style={[styles.titulo, { color: colors.textPrimary }]}>{esEdicion ? "Editar inmueble" : "Nueva publicación"}</Text>
                </View>
                <Text style={[styles.subtituloHead, { color: colors.textSecondary }]}>
                    {esEdicion ? "Modifica los datos de tu inmueble." : "Tu propiedad quedará en estado pendiente hasta ser verificada."}
                </Text>

                {/* Fotos y Videos */}
                <View style={styles.seccion}>
                    <Text style={[styles.label, { color: colors.textPrimary }]}>Fotos y Videos <Text style={styles.requerido}>*</Text></Text>
                    <Text style={styles.hint}>Máximo 6 (fotos o videos)</Text>
                    <View style={styles.fotosGrid}>
                        {form.medios.map((media, i) => (
                            <View key={i} style={[styles.fotoContainer, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                                {media.tipo === "foto" ? (
                                    <Image source={{ uri: media.uri }} style={styles.foto} />
                                ) : (
                                    <VideoItem uri={media.uri} style={styles.foto} />
                                )}
                                {media.tipo === "video" && (
                                    <View style={styles.videoIconOverlay}>
                                        <MaterialCommunityIcons name="play-circle" size={28} color="#fff" />
                                    </View>
                                )}
                                <TouchableOpacity style={[styles.btnEliminarFoto, { backgroundColor: colors.background }]} onPress={() => eliminarMedia(i)}>
                                    <MaterialCommunityIcons name="close-circle" size={22} color="#e74c3c" />
                                </TouchableOpacity>
                            </View>
                        ))}
                        {form.medios.length < 6 && (
                            <>
                                <TouchableOpacity style={[styles.btnAgregarFoto, { borderColor: colors.buttonMain }]} onPress={() => agregarMedia("foto")}>
                                    <MaterialCommunityIcons name="camera-plus" size={32} color={colors.buttonMain} />
                                    <Text style={[styles.btnAgregarFotoTexto, { color: colors.buttonMain }]}>Foto</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.btnAgregarFoto, { borderColor: colors.buttonMain }]} onPress={() => agregarMedia("video")}>
                                    <MaterialCommunityIcons name="video-plus" size={32} color={colors.buttonMain} />
                                    <Text style={[styles.btnAgregarFotoTexto, { color: colors.buttonMain }]}>Video</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>

                {/* Título */}
                <View style={styles.seccion}>
                    <Text style={[styles.label, { color: colors.textPrimary }]}>Título <Text style={styles.requerido}>*</Text></Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.textPrimary }]}
                        placeholder="Ej. Departamento amueblado cerca del Tec"
                        placeholderTextColor={colors.textSecondary}
                        value={form.titulo}
                        onChangeText={v => setForm(f => ({ ...f, titulo: v }))}
                    />
                </View>

                {/* Tipo de inmueble */}
                <View style={styles.seccion}>
                    <Text style={[styles.label, { color: colors.textPrimary }]}>Tipo de inmueble <Text style={styles.requerido}>*</Text></Text>
                    <View style={styles.chips}>
                        {TIPOS_INMUEBLE.map(tipo => {
                            const activo = form.tipoInmueble === tipo
                            return (
                                <TouchableOpacity
                                    key={tipo}
                                    style={[
                                      styles.chip, 
                                      { backgroundColor: isDark ? colors.backgroundSecondary : "#EEF4FF" },
                                      activo && [styles.chipActivo, { backgroundColor: colors.buttonMain }]
                                    ]}
                                    onPress={() => setForm(f => ({ ...f, tipoInmueble: tipo }))}
                                >
                                    <Text style={[styles.chipTextoServicio, { color: colors.buttonMain }, activo && styles.chipTextoActivo]}>{tipo}</Text>
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                </View>

                {/* Mapa */}
                <View style={styles.seccion}>
                    <Text style={[styles.label, { color: colors.textPrimary }]}>Ubicación exacta <Text style={styles.requerido}>*</Text></Text>
                    <Text style={styles.hint}>Mueve el mapa hasta que el marcador central quede sobre la dirección correcta</Text>
                    <View 
                        style={[styles.mapaContainerReal, { borderColor: colors.border }]}
                        {...mapPanResponder.panHandlers}
                        onTouchEnd={() => setScrollEnabled(true)}
                        onTouchCancel={() => setScrollEnabled(true)}
                    >
                        <Mapbox.MapView
                            ref={mapRef}
                            style={styles.mapaReal}
                            styleURL={isDark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/streets-v12"}
                            logoEnabled={false}
                            attributionEnabled={false}
                            onDidFinishLoadingMap={() => setMapaListo(true)}
                            onCameraChanged={(event) => {
                                const coords = event.geometry?.coordinates || event.properties?.center;
                                if (coords && !guardarMutation.isPending) {
                                    setMapaCoords({ latitude: coords[1], longitude: coords[0] });
                                }
                            }}
                            onRegionDidChange={(event) => {
                                const coords = event.geometry?.coordinates || event.properties?.center;
                                if (coords && !guardarMutation.isPending) {
                                    setForm(f => ({ 
                                        ...f, 
                                        latitud: coords[1].toString(), 
                                        longitud: coords[0].toString() 
                                    }));
                                }
                            }}
                        >
                            <Mapbox.Camera ref={cameraRef} />
                        </Mapbox.MapView>
                        <View style={styles.marcadorCentroOverlay} pointerEvents="none">
                            <MaterialCommunityIcons name="map-marker" size={42} color="#e74c3c" />
                            <View style={styles.puntoReferencia} />
                        </View>
                        <TouchableOpacity
                            style={[styles.botonCentrar, { backgroundColor: colors.cardBackground }]}
                            onPress={() => {
                                if (userLocation && cameraRef.current) {
                                    cameraRef.current.setCamera({
                                        centerCoordinate: [userLocation.lng, userLocation.lat],
                                        zoomLevel: 16,
                                        animationDuration: 500,
                                    })
                                    setForm(f => ({ ...f, latitud: userLocation.lat.toString(), longitud: userLocation.lng.toString() }))
                                    setMapaCoords({ latitude: userLocation.lat, longitude: userLocation.lng });
                                }
                            }}
                        >
                            <MaterialCommunityIcons name="crosshairs-gps" size={20} color={colors.buttonMain} />
                        </TouchableOpacity>
                    </View>
                    <View style={[styles.mapaCoordsRow, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                        <MaterialCommunityIcons name="crosshairs-gps" size={14} color={colors.buttonMain} />
                        <Text style={[styles.mapaCoordsTexto, { color: colors.buttonMain }]}>
                            {mapaCoords.latitude.toFixed(6)}, {mapaCoords.longitude.toFixed(6)}
                        </Text>
                    </View>
                </View>

                {/* Ubicación textual */}
                <View style={styles.seccion}>
                    <Text style={[styles.label, { color: colors.textPrimary }]}>Dirección textual <Text style={styles.requerido}>*</Text></Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.textPrimary }]}
                        placeholder="Ej. Centro Histórico, Morelia"
                        placeholderTextColor={colors.textSecondary}
                        value={form.ubicacion}
                        onChangeText={v => setForm(f => ({ ...f, ubicacion: v }))}
                    />
                </View>

                {/* Precio */}
                <View style={styles.seccion}>
                    <Text style={[styles.label, { color: colors.textPrimary }]}>Precio mensual (MXN) <Text style={styles.requerido}>*</Text></Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.textPrimary }]}
                        placeholder="Ej. 3500"
                        placeholderTextColor={colors.textSecondary}
                        value={form.precio}
                        onChangeText={v => setForm(f => ({ ...f, precio: v.replace(/[^0-9]/g, '') }))}
                        keyboardType="numeric"
                    />
                </View>

                {/* Descripción */}
                <View style={styles.seccion}>
                    <Text style={[styles.label, { color: colors.textPrimary }]}>Descripción <Text style={styles.requerido}>*</Text></Text>
                    <TextInput
                        style={[styles.input, styles.inputMultiline, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.textPrimary }]}
                        placeholder="Describe tu propiedad..."
                        placeholderTextColor={colors.textSecondary}
                        value={form.descripcion}
                        onChangeText={v => setForm(f => ({ ...f, descripcion: v }))}
                        multiline
                    />
                </View>

                {/* Servicios */}
                <View style={styles.seccion}>
                    <Text style={[styles.label, { color: colors.textPrimary }]}>Servicios incluidos</Text>
                    <View style={styles.cardsGrid}>
                        {SERVICIOS_OPCIONES.map(s => {
                            const activo = form.servicios.includes(s)
                            return (
                                <TouchableOpacity 
                                  key={s} 
                                  style={[
                                    styles.cardUI, 
                                    { backgroundColor: isDark ? colors.backgroundSecondary : "#FFF", borderColor: colors.border },
                                    activo && [styles.cardUIActivo, { borderColor: colors.buttonMain, backgroundColor: isDark ? colors.backgroundSecondary : '#EBF5FB' }]
                                  ]} 
                                  onPress={() => toggleItem("servicios", s)}
                                >
                                    <MaterialCommunityIcons name={SERVICIOS_ICONS[s] || "check-circle"} size={32} color={activo ? colors.buttonMain : colors.textSecondary} />
                                    <Text style={[styles.cardUITexto, { color: colors.textSecondary }, activo && { color: colors.buttonMain }]}>{s}</Text>
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                </View>

                {/* Reglas */}
                <View style={styles.seccion}>
                    <Text style={[styles.label, { color: colors.textPrimary }]}>Reglas de la casa</Text>
                    <View style={styles.cardsGrid}>
                        {REGLAS_OPCIONES.map(r => {
                            const activo = form.reglas.includes(r)
                            return (
                                <TouchableOpacity 
                                  key={r} 
                                  style={[
                                    styles.cardUI, 
                                    { backgroundColor: isDark ? '#2A1F1F' : "#FFF", borderColor: colors.border },
                                    activo && [styles.cardUIActivo, { borderColor: '#E74C3C', backgroundColor: isDark ? '#3A1F1F' : '#FDEAEA' }]
                                  ]} 
                                  onPress={() => toggleItem("reglas", r)}
                                >
                                    <MaterialCommunityIcons name={REGLAS_ICONS[r] || "cancel"} size={32} color={activo ? '#E74C3C' : colors.textSecondary} />
                                    <Text style={[styles.cardUITexto, { color: colors.textSecondary }, activo && { color: '#E74C3C' }]}>{r}</Text>
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                </View>

                {/* Cuartos adicionales (DESACTIVADO TEMPORALMENTE) */}
                {/* {form.tipoInmueble === "Casa" && (
                    <View style={styles.seccion}>
                        <Text style={[styles.label, { color: colors.textPrimary }]}>Cuartos adicionales</Text>
                        {form.cuartosAdicionales.map((cuarto, idx) => (
                            <View key={idx} style={[styles.cuartoCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                                <View style={styles.cuartoHeader}>
                                    <Text style={[styles.cuartoTitulo, { color: colors.textPrimary }]}>{cuarto.nombre}</Text>
                                    <TouchableOpacity onPress={() => eliminarCuarto(idx)}>
                                        <MaterialCommunityIcons name="close-circle" size={22} color="#e74c3c" />
                                    </TouchableOpacity>
                                </View>
                                <TextInput style={[styles.inputSmall, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.textPrimary }]} placeholder="Nombre" placeholderTextColor={colors.textSecondary} value={cuarto.nombre} onChangeText={v => actualizarCuarto(idx, "nombre", v)} />
                                <TextInput style={[styles.inputSmall, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.textPrimary }]} placeholder="Precio" placeholderTextColor={colors.textSecondary} keyboardType="numeric" value={cuarto.precio} onChangeText={v => actualizarCuarto(idx, "precio", v.replace(/[^0-9]/g, ''))} />
                                <TextInput style={[styles.inputSmall, styles.inputMultiline, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border, color: colors.textPrimary }]} placeholder="Descripción" placeholderTextColor={colors.textSecondary} value={cuarto.descripcion} onChangeText={v => actualizarCuarto(idx, "descripcion", v)} multiline />
                            </View>
                        ))}
                        <TouchableOpacity style={[styles.btnAgregarCuarto, { borderColor: colors.buttonMain }]} onPress={agregarCuarto}>
                            <MaterialCommunityIcons name="plus-circle" size={20} color={colors.buttonMain} />
                            <Text style={[styles.btnAgregarCuartoTexto, { color: colors.buttonMain }]}>Agregar otro cuarto</Text>
                        </TouchableOpacity>
                    </View>
                )} */}

                {/* Horarios de visita */}
                <View style={styles.seccion}>
                    <Text style={[styles.label, { color: colors.textPrimary }]}>Días disponibles para visita <Text style={styles.requerido}>*</Text></Text>
                    <Text style={styles.hint}>Selecciona qué días de la semana estás disponible para mostrar la propiedad.</Text>
                    
                    <View style={styles.diasSemanaGrid}>
                        {DIAS_SEMANA.map(dia => {
                            const seleccionado = !!form.horariosVisita.find(h => h.fecha === dia);
                            return (
                                <TouchableOpacity 
                                    key={dia} 
                                    style={[
                                        styles.diaChip, 
                                        { backgroundColor: isDark ? colors.backgroundSecondary : "#F0F4F8" },
                                        seleccionado && [styles.diaChipActivo, { backgroundColor: colors.buttonMain }]
                                    ]}
                                    onPress={() => agregarFechaVisita(dia)}
                                >
                                    <Text style={[
                                        styles.diaChipTexto, 
                                        { color: isDark ? colors.textPrimary : "#555" }, 
                                        seleccionado && { color: "#FFF" }
                                    ]}>{dia.substring(0, 3)}</Text>
                                </TouchableOpacity>
                            )
                        })}
                    </View>

                    {form.horariosVisita.length > 0 && <Text style={[styles.label, { color: colors.textPrimary, marginTop: 20 }]}>Horarios por día</Text>}
                    <View style={styles.fechasLista}>
                        {form.horariosVisita.map(horario => (
                            <View key={horario.fecha} style={[styles.fechaCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }, fechaActivaVisita === horario.fecha && [styles.fechaCardActiva, { borderColor: colors.buttonMain }]]}>
                                <TouchableOpacity style={styles.fechaCardHeader} onPress={() => setFechaActivaVisita(fechaActivaVisita === horario.fecha ? null : horario.fecha)}>
                                    <View style={styles.fechaCardHeaderIzq}>
                                        <MaterialCommunityIcons name="calendar-week" size={18} color={colors.buttonMain} />
                                        <Text style={[styles.fechaCardTexto, { color: colors.textPrimary }]}>{horario.fecha}</Text>
                                        <View style={[styles.fechaCardBadge, { backgroundColor: isDark ? colors.backgroundSecondary : "#EEF4FF" }]}><Text style={[styles.fechaCardBadgeTexto, { color: colors.buttonMain }]}>{horario.horas.length} h</Text></View>
                                    </View>
                                    <MaterialCommunityIcons name={fechaActivaVisita === horario.fecha ? "chevron-up" : "chevron-down"} size={22} color={colors.textSecondary} />
                                </TouchableOpacity>
                                
                                {fechaActivaVisita === horario.fecha && (
                                    <View style={[styles.fechaCardBody, { borderTopColor: colors.border }]}>
                                        <Text style={[styles.hint, { marginBottom: 12 }]}>Selecciona las horas disponibles:</Text>
                                        <View style={styles.horasPredefinidasGrid}>
                                            {HORAS_PREDEFINIDAS.map(hora => {
                                                const activo = horario.horas.includes(hora);
                                                return (
                                                    <TouchableOpacity 
                                                        key={hora}
                                                        style={[
                                                            styles.horaPredefinidaChip,
                                                            { borderColor: colors.border },
                                                            activo && { backgroundColor: colors.buttonMain, borderColor: colors.buttonMain }
                                                        ]}
                                                        onPress={() => toggleHoraPredefinida(horario.fecha, hora)}
                                                    >
                                                        <Text style={[
                                                            styles.horaPredefinidaTexto,
                                                            { color: colors.textPrimary },
                                                            activo && { color: "#FFF" }
                                                        ]}>{hora}</Text>
                                                    </TouchableOpacity>
                                                )
                                            })}
                                        </View>
                                        
                                        <TouchableOpacity 
                                            style={[styles.btnHoraPersonalizada, { borderColor: colors.buttonMain }]} 
                                            onPress={() => setModalHora(true)}
                                        >
                                            <MaterialCommunityIcons name="clock-plus-outline" size={18} color={colors.buttonMain} />
                                            <Text style={[styles.btnHoraPersonalizadaTexto, { color: colors.buttonMain }]}>Agregar hora personalizada</Text>
                                        </TouchableOpacity>

                                        {horario.horas.filter(h => !HORAS_PREDEFINIDAS.includes(h)).length > 0 && (
                                            <View style={styles.horasExtrasContainer}>
                                                <Text style={[styles.hint, { marginBottom: 8 }]}>Horas personalizadas:</Text>
                                                <View style={styles.horasChips}>
                                                    {horario.horas.filter(h => !HORAS_PREDEFINIDAS.includes(h)).map(hora => (
                                                        <View key={hora} style={[styles.horaChipArrendador, { backgroundColor: isDark ? colors.backgroundSecondary : "#EEF4FF" }]}>
                                                            <Text style={[styles.horaChipTexto, { color: colors.buttonMain }]}>{hora}</Text>
                                                            <TouchableOpacity onPress={() => eliminarHora(horario.fecha, hora)}><MaterialCommunityIcons name="close" size={14} color={colors.buttonMain} /></TouchableOpacity>
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                </View>

                {/* Botón Vista Previa */}
                <TouchableOpacity style={[styles.btnPrevia, { backgroundColor: colors.buttonMain }, !formularioValido() && styles.btnDesactivado]} onPress={() => formularioValido() && setPrevisualizando(true)}>
                    <MaterialCommunityIcons name="eye" size={20} color="#fff" />
                    <Text style={styles.btnPreviaTexto}>Vista previa</Text>
                </TouchableOpacity>

                {guardarMutation.isPending && <ActivityIndicator style={{ margin: 20 }} color={colors.buttonMain} />}
            </ScrollView>

            {/* Modal TimePicker */}
            <DateTimePickerModal
                isVisible={modalHora}
                mode="time"
                onConfirm={onTimeConfirm}
                onCancel={() => setModalHora(false)}
                confirmTextIOS="Confirmar"
                cancelTextIOS="Cancelar"
                is24Hour={true}
            />

            {/* Modal Vista Previa */}
            <Modal visible={previsualizando} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPrevisualizando(false)}>
                <ScrollView style={[styles.modalContainer, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 40 }}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setPrevisualizando(false)}><MaterialCommunityIcons name="chevron-left" size={28} color={colors.textPrimary} /></TouchableOpacity>
                        <Text style={[styles.modalTitulo, { color: colors.textPrimary }]}>Vista previa</Text>
                    </View>
                    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                        {form.medios.map((media, i) => (
                            media.tipo === "foto" ? <Image key={i} source={{ uri: media.uri }} style={styles.previaImagen} /> : <VideoItem key={i} uri={media.uri} style={styles.previaImagen} useNativeControls />
                        ))}
                    </ScrollView>
                    <View style={styles.previaInfo}>
                        <Text style={[styles.previaTitulo, { color: colors.textPrimary }]}>{form.titulo}</Text>
                        <Text style={[styles.previaPrecio, { color: colors.buttonMain }]}>${parseInt(form.precio || "0").toLocaleString('es-MX')} / mes</Text>
                        <Text style={[styles.previaDescripcion, { color: colors.textSecondary }]}>{form.descripcion}</Text>
                        <TouchableOpacity style={styles.btnPublicar} onPress={publicar}>
                            <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
                            <Text style={styles.btnPublicarTexto}>{esEdicion ? "Guardar cambios" : "Enviar para revisión"}</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </Modal>
        </KeyboardAvoidingView>
    )
}

export default Lessor_Renthouse

const styles = StyleSheet.create({
    background: { flex: 1 },
    headerRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20 },
    titulo: { fontSize: 25, fontWeight: "800" },
    subtituloHead: { fontSize: 13, marginHorizontal: 20, marginTop: 4 },
    seccion: { marginHorizontal: 20, marginTop: 24 },
    label: { fontSize: 15, fontWeight: "700", marginBottom: 8 },
    requerido: { color: "#e74c3c" },
    hint: { fontSize: 12, color: "#aaa", marginBottom: 12 },
    input: { borderRadius: 12, padding: 14, fontSize: 14, borderWidth: 1 },
    inputMultiline: { height: 110, textAlignVertical: "top" },
    inputSmall: { borderRadius: 10, padding: 10, fontSize: 13, borderWidth: 1, marginBottom: 8 },
    fotosGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    fotoContainer: { position: "relative" },
    foto: { width: (SCREEN_WIDTH - 60) / 3, height: (SCREEN_WIDTH - 60) / 3, borderRadius: 10 },
    videoIconOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 10 },
    btnEliminarFoto: { position: "absolute", top: -6, right: -6, borderRadius: 12 },
    btnAgregarFoto: { width: (SCREEN_WIDTH - 60) / 3, height: (SCREEN_WIDTH - 60) / 3, borderRadius: 10, borderWidth: 2, borderStyle: "dashed", justifyContent: "center", alignItems: "center" },
    btnAgregarFotoTexto: { fontSize: 11, fontWeight: "600", marginTop: 4 },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14 },
    chipActivo: { },
    chipTextoServicio: { fontSize: 13, fontWeight: "600" },
    chipTextoRegla: { fontSize: 13, fontWeight: "600" },
    chipTextoActivo: { color: "#fff" },
    chipRegla: { },
    chipReglaActivo: { },
    chipTextoReglaActivo: { color: "#fff" },
    cuartoCard: { borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1 },
    cuartoHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    cuartoTitulo: { fontSize: 16, fontWeight: "700" },
    btnAgregarCuarto: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, justifyContent: "center", borderWidth: 1, borderStyle: "dashed", borderRadius: 12 },
    btnAgregarCuartoTexto: { fontWeight: "600" },
    btnPrevia: { flexDirection: "row", borderRadius: 24, paddingVertical: 14, alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 20, marginTop: 32 },
    btnDesactivado: { opacity: 0.4 },
    btnPreviaTexto: { color: "#fff", fontWeight: "700", fontSize: 16 },
    modalContainer: { flex: 1 },
    modalHeader: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
    modalTitulo: { fontSize: 18, fontWeight: "800", flex: 1 },
    previaImagen: { width: SCREEN_WIDTH, height: 260, resizeMode: "cover" },
    previaInfo: { padding: 20, gap: 12 },
    previaTitulo: { fontSize: 22, fontWeight: "800" },
    previaPrecio: { fontSize: 22, fontWeight: "800" },
    previaDescripcion: { fontSize: 14, lineHeight: 20 },
    btnPublicar: { flexDirection: "row", backgroundColor: "#5db682", borderRadius: 10, paddingVertical: 14, alignItems: "center", justifyContent: "center", gap: 8, marginTop: 20 },
    btnPublicarTexto: { color: "#fff", fontWeight: "700", fontSize: 16 },
    mapaContainerReal: { height: 200, marginHorizontal: 0, borderRadius: 12, overflow: "hidden", borderWidth: 1, position: "relative" },
    mapaReal: { flex: 1 },
    marcadorCentroOverlay: { position: "absolute", top: "50%", left: "50%", marginTop: -42, marginLeft: -21, alignItems: "center" },
    puntoReferencia: { width: 6, height: 6, backgroundColor: "#000", borderRadius: 3, marginTop: -6 },
    botonCentrar: { position: "absolute", bottom: 10, right: 10, width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", elevation: 2, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4 },
    mapaCoordsRow: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, borderWidth: 1, borderTopWidth: 0 },
    mapaCoordsTexto: { fontSize: 12, fontWeight: "500" },
    btnAbrirCalendario: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", justifyContent: "center" },
    btnAbrirCalendarioTexto: { fontSize: 14, fontWeight: "600" },
    fechasLista: { marginTop: 12, gap: 10 },
    fechaCard: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
    fechaCardActiva: { borderWidth: 2 },
    fechaCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
    fechaCardHeaderIzq: { flexDirection: "row", alignItems: "center", gap: 8 },
    fechaCardTexto: { fontSize: 14, fontWeight: "700" },
    fechaCardBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    fechaCardBadgeTexto: { fontSize: 11, fontWeight: "800" },
    fechaCardBody: { padding: 14, borderTopWidth: 1 },
    horasChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    horaChipArrendador: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    horaChipTexto: { fontSize: 13, fontWeight: "700" },
    horaInputRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 },
    horaInput: { flex: 1, borderRadius: 8, padding: 10, borderWidth: 1, fontSize: 14 },
    horaInputBtn: { padding: 10, borderRadius: 8 },
    btnPrevia: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 20, marginVertical: 30, padding: 16, borderRadius: 14 },
    btnPreviaTexto: { color: "#fff", fontSize: 16, fontWeight: "700" },
    btnDesactivado: { opacity: 0.5 },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
    modalFechasContainer: { borderRadius: 16, padding: 20 },
    modalFechasHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    modalFechasTitulo: { fontSize: 18, fontWeight: "700" },
    modalFechasBtnListo: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    modalFechasBtnListoTexto: { color: "#fff", fontWeight: "700" },
    modalContainer: { flex: 1 },
    modalHeader: { flexDirection: "row", alignItems: "center", padding: 20, gap: 12 },
    modalTitulo: { fontSize: 20, fontWeight: "700" },
    previaImagen: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.75 },
    previaInfo: { padding: 20 },
    previaTitulo: { fontSize: 24, fontWeight: "800", marginBottom: 8 },
    previaPrecio: { fontSize: 20, fontWeight: "700", marginBottom: 16 },
    previaDescripcion: { fontSize: 15, lineHeight: 22, marginBottom: 24 },
    btnPublicar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#27AE60", padding: 16, borderRadius: 14 },
    btnPublicarTexto: { color: "#fff", fontSize: 16, fontWeight: "700" },
    btnVolver: { position: "absolute", left: 16, width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center", zIndex: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },
    cuartoCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
    cuartoHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
    cuartoTitulo: { fontSize: 15, fontWeight: "700" },
    btnAgregarCuarto: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderStyle: "dashed", marginTop: 4 },
    btnAgregarCuartoTexto: { fontSize: 14, fontWeight: "600" },
    cardsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    cardUI: { width: (SCREEN_WIDTH - 60) / 2, padding: 16, borderRadius: 12, borderWidth: 2, alignItems: "center", justifyContent: "center", gap: 8 },
    cardUIActivo: { },
    cardUITexto: { fontSize: 13, fontWeight: "700", textAlign: "center" },
    diasSemanaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "space-between" },
    diaChip: { flex: 1, minWidth: 40, height: 44, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    diaChipActivo: { },
    diaChipTexto: { fontSize: 13, fontWeight: "700" },
    horasPredefinidasGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
    horaPredefinidaChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
    horaPredefinidaTexto: { fontSize: 13, fontWeight: "600" },
    btnHoraPersonalizada: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderStyle: "dashed", marginBottom: 12 },
    btnHoraPersonalizadaTexto: { fontSize: 13, fontWeight: "700" },
    horasExtrasContainer: { marginTop: 4 },
    modalFechasHint: { fontSize: 13, color: "#666" },
})
