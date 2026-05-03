import { ScrollView, Text, View, StyleSheet, TextInput, Image, TouchableOpacity, Modal, Dimensions, Alert, ActivityIndicator, Platform } from 'react-native'
import { useState, useRef, useEffect } from 'react'
import * as ImagePicker from 'expo-image-picker'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useVideoPlayer, VideoView } from 'expo-video'
import { Calendar } from 'react-native-calendars'
import Mapbox from '@rnmapbox/maps'
import * as Location from 'expo-location'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN
Mapbox.setAccessToken(MAPBOX_TOKEN!)

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

const hostUri = Constants.expoConfig?.hostUri?.split(':').shift();
const API_URL = hostUri ? `http://${hostUri}:3000` : 'http://localhost:3000';

const SERVICIOS_OPCIONES = ["WiFi", "Agua", "Luz", "Gas", "Lavadora", "Estacionamiento", "Amueblado"]
const REGLAS_OPCIONES = ["No mascotas", "No fumar", "No fiestas", "Solo estudiantes", "No visitas"]
const TIPOS_INMUEBLE = ["Cuarto", "Departamento", "Casa", "Estudio", "Loft"]

type Media = {
    uri: string
    tipo: "foto" | "video"
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

    const inmuebleExistente = route.params?.inmueble ?? null
    const esEdicion = inmuebleExistente !== null

    const [form, setForm] = useState<Formulario>({
        titulo: inmuebleExistente?.titulo ?? "",
        descripcion: inmuebleExistente?.descripcion ?? "",
        precio: inmuebleExistente?.precio?.toString() ?? "",
        ubicacion: inmuebleExistente?.ubicacion ?? "",
        servicios: inmuebleExistente?.servicios ?? [],
        reglas: inmuebleExistente?.reglas ?? [],
        medios: inmuebleExistente?.foto ? [{ uri: inmuebleExistente.foto, tipo: "foto" }] : [],
        estado: inmuebleExistente?.estado ?? "pendiente",
        tipoInmueble: inmuebleExistente?.tipo_inmueble ?? "",
        latitud: inmuebleExistente?.direccion_latitud?.toString() ?? "19.721869",
        longitud: inmuebleExistente?.direccion_longitud?.toString() ?? "-101.185483",
        horariosVisita: [],
        cuartosAdicionales: [],
    })

    const [previsualizando, setPrevisualizando] = useState(false)
    const [modalFechas, setModalFechas] = useState(false)
    const [fechaActivaVisita, setFechaActivaVisita] = useState<string | null>(null)
    const [nuevaHora, setNuevaHora] = useState("")
    const [cargando, setCargando] = useState(false)
    const [mapaListo, setMapaListo] = useState(false)
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
    const cameraRef = useRef<Mapbox.Camera>(null)

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync()
            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
                setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude })
                if (form.latitud === "19.721869") {
                    setForm(f => ({ ...f, latitud: loc.coords.latitude.toString(), longitud: loc.coords.longitude.toString() }))
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
    }, [mapaListo, form.latitud, form.longitud])

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
        }
    }

    const agregarHoraAFecha = (fecha: string, hora: string) => {
        if (!hora.match(/^\d{2}:\d{2}$/)) return
        setForm(f => ({
            ...f,
            horariosVisita: f.horariosVisita.map(h =>
                h.fecha === fecha && !h.horas.includes(hora) ? { ...h, horas: [...h.horas, hora].sort() } : h
            )
        }))
        setNuevaHora("")
    }

    const eliminarHora = (fecha: string, hora: string) => {
        setForm(f => ({
            ...f,
            horariosVisita: f.horariosVisita.map(h =>
                h.fecha === fecha ? { ...h, horas: h.horas.filter(hr => hr !== hora) } : h
            ).filter(h => !(h.fecha === fecha && h.horas.length === 0) || fechaActivaVisita === fecha)
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

    const guardarInmuebles = async () => {
        setCargando(true)
        try {
            const token = await AsyncStorage.getItem('token')
            if (!token) throw new Error('No autenticado')

            const formData = new FormData();
            formData.append('precio_mensual', form.precio);
            formData.append('descripcion', form.descripcion);
            formData.append('direccion_latitud', form.latitud);
            formData.append('direccion_longitud', form.longitud);
            formData.append('titulo', form.titulo);
            formData.append('tipo_inmueble', form.tipoInmueble === "Casa" ? "CASA" : form.tipoInmueble === "Departamento" ? "DEPA" : "CUARTO");
            
            // Enviar arreglos como strings JSON para que el backend los procese
            formData.append('servicios', JSON.stringify(form.servicios.map(s => SERVICIOS_OPCIONES.indexOf(s) + 1)));
            formData.append('restricciones', JSON.stringify(form.reglas.map(r => REGLAS_OPCIONES.indexOf(r) + 1)));

            // Agregar archivos (fotos y videos)
            for (let i = 0; i < form.medios.length; i++) {
                const media = form.medios[i];
                const uriParts = media.uri.split('.');
                const fileType = uriParts[uriParts.length - 1];
                const fileName = `media_${Date.now()}_${i}.${fileType}`;

                formData.append('imagenes', {
                    uri: Platform.OS === 'android' ? media.uri : media.uri.replace('file://', ''),
                    name: fileName,
                    type: media.tipo === "foto" ? `image/${fileType}` : `video/${fileType}`,
                } as any);
            }

            const resp = await fetch(`${API_URL}/inmuebles`, {
                method: 'POST',
                headers: { 
                    Authorization: `Bearer ${token}`
                    // Nota: No poner 'Content-Type': 'multipart/form-data' manualmente,
                    // fetch lo hace solo con el boundary correcto al pasar un FormData.
                },
                body: formData,
            })

            const responseData = await resp.json().catch(() => ({}));
            if (!resp.ok) throw new Error(responseData.error || 'Error al guardar el inmueble')

            Alert.alert('Éxito', `${form.tipoInmueble} guardado correctamente`)

            // Lógica para cuartos adicionales (Si es una casa)
            if (form.tipoInmueble === 'Casa' && form.cuartosAdicionales.length > 0) {
                for (const cuarto of form.cuartosAdicionales) {
                    const cuartoFormData = new FormData();
                    cuartoFormData.append('precio_mensual', cuarto.precio);
                    cuartoFormData.append('descripcion', cuarto.descripcion || `Cuarto dentro de ${form.titulo}`);
                    cuartoFormData.append('titulo', cuarto.nombre);
                    cuartoFormData.append('tipo_inmueble', 'CUARTO');
                    cuartoFormData.append('direccion_latitud', form.latitud);
                    cuartoFormData.append('direccion_longitud', form.longitud);
                    // Los cuartos adicionales usualmente heredan o no tienen las mismas fotos
                    // Por ahora los mandamos sin fotos o con las mismas si fuera necesario.

                    const cuartoResp = await fetch(`${API_URL}/inmuebles`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` },
                        body: cuartoFormData,
                    })
                    if (!cuartoResp.ok) console.warn('Error guardando cuarto adicional')
                }
                Alert.alert('Éxito', `Se guardaron ${form.cuartosAdicionales.length} cuarto(s) adicional(es)`)
            }

            navigation.goBack()
        } catch (error: any) {
            Alert.alert('Error', error.message)
        } finally {
            setCargando(false)
        }
    }

    const formularioValido = () => {
        return form.titulo.trim() !== "" &&
            form.precio.trim() !== "" &&
            form.ubicacion.trim() !== "" &&
            form.descripcion.trim() !== "" &&
            form.medios.length > 0 &&
            form.tipoInmueble !== ""
    }

    const publicar = () => {
        if (!formularioValido()) {
            Alert.alert('Campos incompletos', 'Completa todos los campos obligatorios.')
            return
        }
        guardarInmuebles()
    }

    return (
        <ScrollView style={styles.background} contentContainerStyle={{ paddingBottom: 120 }}>
            <View style={styles.headerRow}>
                <Text style={styles.titulo}>{esEdicion ? "Editar inmueble" : "Nueva publicación"}</Text>
            </View>
            <Text style={styles.subtituloHead}>
                {esEdicion ? "Modifica los datos de tu inmueble." : "Tu propiedad quedará en estado pendiente hasta ser verificada."}
            </Text>

            {/* Fotos y Videos */}
            <View style={styles.seccion}>
                <Text style={styles.label}>Fotos y Videos <Text style={styles.requerido}>*</Text></Text>
                <Text style={styles.hint}>Máximo 6 (fotos o videos)</Text>
                <View style={styles.fotosGrid}>
                    {form.medios.map((media, i) => (
                        <View key={i} style={styles.fotoContainer}>
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
                            <TouchableOpacity style={styles.btnEliminarFoto} onPress={() => eliminarMedia(i)}>
                                <MaterialCommunityIcons name="close-circle" size={22} color="#e74c3c" />
                            </TouchableOpacity>
                        </View>
                    ))}
                    {form.medios.length < 6 && (
                        <>
                            <TouchableOpacity style={styles.btnAgregarFoto} onPress={() => agregarMedia("foto")}>
                                <MaterialCommunityIcons name="camera-plus" size={32} color="#205EA6" />
                                <Text style={styles.btnAgregarFotoTexto}>Foto</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.btnAgregarFoto} onPress={() => agregarMedia("video")}>
                                <MaterialCommunityIcons name="video-plus" size={32} color="#205EA6" />
                                <Text style={styles.btnAgregarFotoTexto}>Video</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>

            {/* Título */}
            <View style={styles.seccion}>
                <Text style={styles.label}>Título <Text style={styles.requerido}>*</Text></Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ej. Departamento amueblado cerca del Tec"
                    placeholderTextColor="#aaa"
                    value={form.titulo}
                    onChangeText={v => setForm(f => ({ ...f, titulo: v }))}
                />
            </View>

            {/* Tipo de inmueble */}
            <View style={styles.seccion}>
                <Text style={styles.label}>Tipo de inmueble <Text style={styles.requerido}>*</Text></Text>
                <View style={styles.chips}>
                    {TIPOS_INMUEBLE.map(tipo => {
                        const activo = form.tipoInmueble === tipo
                        return (
                            <TouchableOpacity
                                key={tipo}
                                style={[styles.chip, activo && styles.chipActivo]}
                                onPress={() => setForm(f => ({ ...f, tipoInmueble: tipo }))}
                            >
                                <Text style={[styles.chipTextoServicio, activo && styles.chipTextoActivo]}>{tipo}</Text>
                            </TouchableOpacity>
                        )
                    })}
                </View>
            </View>

            {/* Mapa real interactivo (reemplaza el mapa simulado) */}
            <View style={styles.seccion}>
                <Text style={styles.label}>Ubicación exacta <Text style={styles.requerido}>*</Text></Text>
                <Text style={styles.hint}>Mueve el mapa hasta que el marcador quede sobre la dirección correcta</Text>
                <View style={styles.mapaContainerReal}>
                    <Mapbox.MapView
                        style={styles.mapaReal}
                        styleURL="mapbox://styles/mapbox/streets-v12"
                        logoEnabled={false}
                        attributionEnabled={false}
                        onDidFinishLoadingMap={() => setMapaListo(true)}
                        onCameraChanged={(event) => {
                            const { center } = event.geometry || {}
                            if (center && !cargando) {
                                setForm(f => ({ ...f, latitud: center.latitude.toString(), longitud: center.longitude.toString() }))
                            }
                        }}
                    >
                        <Mapbox.Camera ref={cameraRef} />
                        <Mapbox.PointAnnotation id="centro" coordinate={[parseFloat(form.longitud), parseFloat(form.latitud)]}>
                            <View style={styles.marcadorFijo}>
                                <MaterialCommunityIcons name="map-marker" size={36} color="#e74c3c" />
                                <View style={styles.marcadorSombra} />
                            </View>
                        </Mapbox.PointAnnotation>
                    </Mapbox.MapView>
                    <TouchableOpacity
                        style={styles.botonCentrar}
                        onPress={async () => {
                            if (userLocation && cameraRef.current) {
                                cameraRef.current.setCamera({
                                    centerCoordinate: [userLocation.lng, userLocation.lat],
                                    zoomLevel: 16,
                                    animationDuration: 500,
                                })
                                setForm(f => ({ ...f, latitud: userLocation.lat.toString(), longitud: userLocation.lng.toString() }))
                            }
                        }}
                    >
                        <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#205EA6" />
                    </TouchableOpacity>
                </View>
                <View style={styles.mapaCoordsRow}>
                    <MaterialCommunityIcons name="crosshairs-gps" size={14} color="#205EA6" />
                    <Text style={styles.mapaCoordsTexto}>
                        {parseFloat(form.latitud).toFixed(5)}, {parseFloat(form.longitud).toFixed(5)}
                    </Text>
                </View>
            </View>

            {/* Ubicación textual */}
            <View style={styles.seccion}>
                <Text style={styles.label}>Dirección textual <Text style={styles.requerido}>*</Text></Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ej. Centro Histórico, Morelia"
                    placeholderTextColor="#aaa"
                    value={form.ubicacion}
                    onChangeText={v => setForm(f => ({ ...f, ubicacion: v }))}
                />
            </View>

            {/* Precio */}
            <View style={styles.seccion}>
                <Text style={styles.label}>Precio mensual (MXN) <Text style={styles.requerido}>*</Text></Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ej. 3500"
                    placeholderTextColor="#aaa"
                    value={form.precio}
                    onChangeText={v => setForm(f => ({ ...f, precio: v.replace(/[^0-9]/g, '') }))}
                    keyboardType="numeric"
                />
            </View>

            {/* Descripción */}
            <View style={styles.seccion}>
                <Text style={styles.label}>Descripción <Text style={styles.requerido}>*</Text></Text>
                <TextInput
                    style={[styles.input, styles.inputMultiline]}
                    placeholder="Describe tu propiedad: habitaciones, baños, área, etc."
                    placeholderTextColor="#aaa"
                    value={form.descripcion}
                    onChangeText={v => setForm(f => ({ ...f, descripcion: v }))}
                    multiline
                />
            </View>

            {/* Servicios */}
            <View style={styles.seccion}>
                <Text style={styles.label}>Servicios incluidos</Text>
                <View style={styles.chips}>
                    {SERVICIOS_OPCIONES.map(s => {
                        const activo = form.servicios.includes(s)
                        return (
                            <TouchableOpacity
                                key={s}
                                style={[styles.chip, activo && styles.chipActivo]}
                                onPress={() => toggleItem("servicios", s)}
                            >
                                <Text style={[styles.chipTextoServicio, activo && styles.chipTextoActivo]}>{s}</Text>
                            </TouchableOpacity>
                        )
                    })}
                </View>
            </View>

            {/* Reglas */}
            <View style={styles.seccion}>
                <Text style={styles.label}>Reglas de la casa</Text>
                <View style={styles.chips}>
                    {REGLAS_OPCIONES.map(r => {
                        const activo = form.reglas.includes(r)
                        return (
                            <TouchableOpacity
                                key={r}
                                style={[styles.chip, styles.chipRegla, activo && styles.chipReglaActivo]}
                                onPress={() => toggleItem("reglas", r)}
                            >
                                <Text style={[styles.chipTextoRegla, activo && styles.chipTextoReglaActivo]}>{r}</Text>
                            </TouchableOpacity>
                        )
                    })}
                </View>
            </View>

            {/* Cuartos adicionales (solo para Casa) */}
            {form.tipoInmueble === "Casa" && (
                <View style={styles.seccion}>
                    <Text style={styles.label}>Cuartos adicionales dentro de la casa</Text>
                    <Text style={styles.hint}>Si tienes varios cuartos individuales para rentar, agrégalos aquí</Text>
                    {form.cuartosAdicionales.map((cuarto, idx) => (
                        <View key={idx} style={styles.cuartoCard}>
                            <View style={styles.cuartoHeader}>
                                <Text style={styles.cuartoTitulo}>{cuarto.nombre}</Text>
                                <TouchableOpacity onPress={() => eliminarCuarto(idx)}>
                                    <MaterialCommunityIcons name="close-circle" size={22} color="#e74c3c" />
                                </TouchableOpacity>
                            </View>
                            <TextInput
                                style={styles.inputSmall}
                                placeholder="Nombre del cuarto (ej. Cuarto 1)"
                                value={cuarto.nombre}
                                onChangeText={v => actualizarCuarto(idx, "nombre", v)}
                            />
                            <TextInput
                                style={styles.inputSmall}
                                placeholder="Precio mensual (MXN)"
                                keyboardType="numeric"
                                value={cuarto.precio}
                                onChangeText={v => actualizarCuarto(idx, "precio", v.replace(/[^0-9]/g, ''))}
                            />
                            <TextInput
                                style={[styles.inputSmall, styles.inputMultiline]}
                                placeholder="Descripción del cuarto (opcional)"
                                value={cuarto.descripcion}
                                onChangeText={v => actualizarCuarto(idx, "descripcion", v)}
                                multiline
                            />
                        </View>
                    ))}
                    <TouchableOpacity style={styles.btnAgregarCuarto} onPress={agregarCuarto}>
                        <MaterialCommunityIcons name="plus-circle" size={20} color="#205EA6" />
                        <Text style={styles.btnAgregarCuartoTexto}>Agregar otro cuarto</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Fechas disponibles para visita */}
            <View style={styles.seccion}>
                <Text style={styles.label}>Fechas disponibles para visita <Text style={styles.requerido}>*</Text></Text>
                <Text style={styles.hint}>Selecciona los días y agrega horarios</Text>
                <TouchableOpacity style={styles.btnAbrirCalendario} onPress={() => setModalFechas(true)}>
                    <MaterialCommunityIcons name="calendar-plus" size={18} color="#205EA6" />
                    <Text style={styles.btnAbrirCalendarioTexto}>Agregar fechas</Text>
                </TouchableOpacity>
                {form.horariosVisita.length > 0 && (
                    <View style={styles.fechasLista}>
                        {form.horariosVisita.map(horario => (
                            <View key={horario.fecha} style={[styles.fechaCard, fechaActivaVisita === horario.fecha && styles.fechaCardActiva]}>
                                <TouchableOpacity style={styles.fechaCardHeader} onPress={() => setFechaActivaVisita(fechaActivaVisita === horario.fecha ? null : horario.fecha)}>
                                    <View style={styles.fechaCardHeaderIzq}>
                                        <MaterialCommunityIcons name="calendar" size={16} color="#205EA6" />
                                        <Text style={styles.fechaCardTexto}>
                                            {new Date(horario.fecha + "T12:00:00").toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" })}
                                        </Text>
                                        <View style={styles.fechaCardBadge}>
                                            <Text style={styles.fechaCardBadgeTexto}>{horario.horas.length} hora(s)</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity onPress={() => eliminarFechaVisita(horario.fecha)}>
                                        <MaterialCommunityIcons name="close-circle-outline" size={20} color="#e74c3c" />
                                    </TouchableOpacity>
                                </TouchableOpacity>
                                {fechaActivaVisita === horario.fecha && (
                                    <View style={styles.fechaCardBody}>
                                        <View style={styles.horasChips}>
                                            {horario.horas.map(hora => (
                                                <View key={hora} style={styles.horaChipArrendador}>
                                                    <Text style={styles.horaChipTexto}>{hora}</Text>
                                                    <TouchableOpacity onPress={() => eliminarHora(horario.fecha, hora)}>
                                                        <MaterialCommunityIcons name="close" size={14} color="#205EA6" />
                                                    </TouchableOpacity>
                                                </View>
                                            ))}
                                        </View>
                                        <View style={styles.horaInputRow}>
                                            <TextInput
                                                style={styles.horaInput}
                                                placeholder="HH:MM  ej. 10:00"
                                                placeholderTextColor="#aaa"
                                                value={nuevaHora}
                                                onChangeText={setNuevaHora}
                                                keyboardType="numeric"
                                                maxLength={5}
                                            />
                                            <TouchableOpacity style={styles.horaInputBtn} onPress={() => agregarHoraAFecha(horario.fecha, nuevaHora)}>
                                                <MaterialCommunityIcons name="plus" size={20} color="#fff" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                )}
            </View>

            {/* Modal calendario */}
            <Modal visible={modalFechas} presentationStyle="pageSheet" onRequestClose={() => setModalFechas(false)} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalFechasContainer}>
                        <View style={styles.modalFechasHeader}>
                            <Text style={styles.modalFechasTitulo}>Selecciona días disponibles</Text>
                            <TouchableOpacity style={styles.modalFechasBtnListo} onPress={() => setModalFechas(false)}>
                                <Text style={styles.modalFechasBtnListoTexto}>Listo</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalFechasHint}>Toca los días en que permites visitas</Text>
                        <Calendar
                            onDayPress={(day) => agregarFechaVisita(day.dateString)}
                            markingType="multi-dot"
                            markedDates={Object.fromEntries(form.horariosVisita.map(h => [h.fecha, { selected: true, selectedColor: "#205EA6", marked: h.horas.length > 0, dotColor: "#5db682" }]))}
                            minDate={new Date().toISOString().split("T")[0]}
                            theme={{
                                backgroundColor: "transparent",
                                calendarBackground: "transparent",
                                todayTextColor: "#205EA6",
                                todayBackgroundColor: "#EEF4FF",
                                arrowColor: "#205EA6",
                                textDayFontWeight: "600",
                                textMonthFontWeight: "800",
                                textDayHeaderFontWeight: "700",
                                dayTextColor: "#1a1a2e",
                                textDisabledColor: "#ccc",
                                monthTextColor: "#1a1a2e",
                                textMonthFontSize: 16,
                            }}
                        />
                        <Text style={styles.modalFechasLeyenda}>Día seleccionado</Text>
                    </View>
                </View>
            </Modal>

            {/* Botón vista previa */}
            <TouchableOpacity style={[styles.btnPrevia, !formularioValido() && styles.btnDesactivado]} onPress={() => formularioValido() && setPrevisualizando(true)}>
                <MaterialCommunityIcons name="eye" size={20} color="#fff" />
                <Text style={styles.btnPreviaTexto}>Vista previa</Text>
            </TouchableOpacity>

            {cargando && <ActivityIndicator style={{ margin: 20 }} />}

            {/* Modal vista previa */}
            <Modal visible={previsualizando} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPrevisualizando(false)}>
                <ScrollView style={styles.modalContainer} contentContainerStyle={{ paddingBottom: 40 }}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setPrevisualizando(false)}>
                            <MaterialCommunityIcons name="chevron-left" size={28} color="#1a1a2e" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitulo}>Vista previa</Text>
                        <View style={styles.badgePendiente}>
                            <Text style={styles.badgePendienteTexto}>{esEdicion ? form.estado : "Pendiente"}</Text>
                        </View>
                    </View>
                    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                        {form.medios.map((media, i) => (
                            media.tipo === "foto" ? (
                                <Image key={i} source={{ uri: media.uri }} style={styles.previaImagen} />
                            ) : (
                                <VideoItem key={i} uri={media.uri} style={styles.previaImagen} useNativeControls />
                            )
                        ))}
                    </ScrollView>
                    <View style={styles.previaInfo}>
                        <Text style={styles.previaTitulo}>{form.titulo}</Text>
                        <View style={styles.previaFila}>
                            <MaterialCommunityIcons name="map-marker" size={16} color="#205EA6" />
                            <Text style={styles.previaTexto}>{form.ubicacion}</Text>
                        </View>
                        <Text style={styles.previaPrecio}>${parseInt(form.precio).toLocaleString('es-MX')} / mes</Text>
                        <Text style={styles.previaDescripcion}>{form.descripcion}</Text>
                        {form.servicios.length > 0 && (
                            <>
                                <Text style={styles.previaSubtitulo}>Servicios incluidos</Text>
                                <View style={styles.chips}>
                                    {form.servicios.map((s, i) => <View key={i} style={styles.chip}><Text style={styles.chipTextoServicio}>{s}</Text></View>)}
                                </View>
                            </>
                        )}
                        {form.reglas.length > 0 && (
                            <>
                                <Text style={styles.previaSubtitulo}>Reglas</Text>
                                <View style={styles.chips}>
                                    {form.reglas.map((r, i) => <View key={i} style={[styles.chip, styles.chipRegla]}><Text style={styles.chipTextoRegla}>{r}</Text></View>)}
                                </View>
                            </>
                        )}
                        <TouchableOpacity style={styles.btnPublicar} onPress={publicar}>
                            <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
                            <Text style={styles.btnPublicarTexto}>{esEdicion ? "Guardar cambios" : "Enviar para revisión"}</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </Modal>
        </ScrollView>
    )
}

export default Lessor_Renthouse

const styles = StyleSheet.create({
    background: { flex: 1, backgroundColor: "#f5f7fa" },
    headerRow: { marginTop: 20, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingTop: 20, paddingBottom: 4 },
    titulo: { fontSize: 25, fontWeight: "800", color: "#1a1a2e" },
    subtituloHead: { fontSize: 13, color: "#888", marginHorizontal: 20, marginTop: 4, marginBottom: 8 },
    seccion: { marginHorizontal: 20, marginTop: 20 },
    label: { fontSize: 15, fontWeight: "700", color: "#1a1a2e", marginBottom: 8 },
    requerido: { color: "#e74c3c" },
    hint: { fontSize: 12, color: "#aaa", marginBottom: 8 },
    input: { backgroundColor: "#fff", borderRadius: 12, padding: 14, fontSize: 14, color: "#1a1a2e", borderWidth: 1, borderColor: "#e0e0e0" },
    inputMultiline: { height: 110, textAlignVertical: "top" },
    inputSmall: { backgroundColor: "#fff", borderRadius: 10, padding: 10, fontSize: 13, borderWidth: 1, borderColor: "#e0e0e0", marginBottom: 8 },
    fotosGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    fotoContainer: { position: "relative" },
    foto: { width: (SCREEN_WIDTH - 60) / 3, height: (SCREEN_WIDTH - 60) / 3, borderRadius: 10 },
    videoIconOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.2)", borderRadius: 10 },
    btnEliminarFoto: { position: "absolute", top: -6, right: -6, backgroundColor: "#fff", borderRadius: 12 },
    btnAgregarFoto: { width: (SCREEN_WIDTH - 60) / 3, height: (SCREEN_WIDTH - 60) / 3, borderRadius: 10, borderWidth: 2, borderColor: "#205EA6", borderStyle: "dashed", justifyContent: "center", alignItems: "center", gap: 4 },
    btnAgregarFotoTexto: { fontSize: 12, color: "#205EA6", fontWeight: "600" },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: { backgroundColor: "#EEF4FF", borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14, borderWidth: 1, borderColor: "#EEF4FF" },
    chipActivo: { backgroundColor: "#205EA6", borderColor: "#205EA6" },
    chipTextoServicio: { fontSize: 13, color: "#205EA6", fontWeight: "600" },
    chipTextoRegla: { fontSize: 13, color: "#b83e31", fontWeight: "600" },
    chipTextoActivo: { color: "#fff" },
    chipRegla: { backgroundColor: "#FFF0F0", borderColor: "#FFF0F0" },
    chipReglaActivo: { backgroundColor: "#b83e31", borderColor: "#b83e31" },
    chipTextoReglaActivo: { color: "#fff" },
    cuartoCard: { backgroundColor: "#fff", borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#e0e0e0" },
    cuartoHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    cuartoTitulo: { fontSize: 16, fontWeight: "700", color: "#1a1a2e" },
    btnAgregarCuarto: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, justifyContent: "center", borderWidth: 1, borderColor: "#205EA6", borderStyle: "dashed", borderRadius: 12, marginTop: 8 },
    btnAgregarCuartoTexto: { color: "#205EA6", fontWeight: "600" },
    btnPrevia: { flexDirection: "row", backgroundColor: "#205EA6", borderRadius: 24, paddingVertical: 14, paddingHorizontal: 28, alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 20, marginTop: 32 },
    btnDesactivado: { opacity: 0.4 },
    btnPreviaTexto: { color: "#fff", fontWeight: "700", fontSize: 16 },
    modalContainer: { flex: 1, backgroundColor: "#fff" },
    modalHeader: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
    modalTitulo: { fontSize: 18, fontWeight: "800", color: "#1a1a2e", flex: 1 },
    badgePendiente: { backgroundColor: "#ffffff", borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1.5, borderColor: "#205EA6" },
    badgePendienteTexto: { fontSize: 12, color: "#205EA6", fontWeight: "700" },
    previaImagen: { width: SCREEN_WIDTH, height: 260, resizeMode: "cover" },
    previaInfo: { padding: 20, gap: 12 },
    previaTitulo: { fontSize: 22, fontWeight: "800", color: "#1a1a2e" },
    previaFila: { flexDirection: "row", alignItems: "center", gap: 6 },
    previaTexto: { fontSize: 14, color: "#555" },
    previaPrecio: { fontSize: 22, fontWeight: "800", color: "#205EA6" },
    previaDescripcion: { fontSize: 14, color: "#555", lineHeight: 22 },
    previaSubtitulo: { fontSize: 15, fontWeight: "700", color: "#1a1a2e", marginTop: 8 },
    btnPublicar: { flexDirection: "row", backgroundColor: "#5db682", borderRadius: 10, paddingVertical: 14, paddingHorizontal: 28, alignItems: "center", justifyContent: "center", gap: 8, marginTop: 24 },
    btnPublicarTexto: { color: "#fff", fontWeight: "700", fontSize: 16 },
    mapaContainerReal: { height: 240, borderRadius: 16, overflow: "hidden", marginTop: 8, position: "relative" },
    mapaReal: { flex: 1 },
    marcadorFijo: { alignItems: "center" },
    marcadorSombra: { width: 12, height: 4, backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 6, marginTop: -8 },
    botonCentrar: { position: "absolute", bottom: 12, right: 12, backgroundColor: "#fff", borderRadius: 30, padding: 10, elevation: 4 },
    mapaCoordsRow: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10, backgroundColor: "#fff", borderBottomLeftRadius: 12, borderBottomRightRadius: 12, borderWidth: 1, borderTopWidth: 0, borderColor: "#e0e0e0" },
    mapaCoordsTexto: { fontSize: 12, color: "#205EA6", fontWeight: "600", flex: 1 },
    btnAbrirCalendario: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1.5, borderColor: "#205EA6", borderStyle: "dashed", borderRadius: 12, padding: 14, justifyContent: "center" },
    btnAbrirCalendarioTexto: { color: "#205EA6", fontWeight: "700", fontSize: 14 },
    fechasLista: { marginTop: 12, gap: 8 },
    fechaCard: { backgroundColor: "#fff", borderRadius: 14, borderWidth: 1.5, borderColor: "#e0e0e0", overflow: "hidden" },
    fechaCardActiva: { borderColor: "#205EA6" },
    fechaCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12 },
    fechaCardHeaderIzq: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
    fechaCardTexto: { fontSize: 14, fontWeight: "700", color: "#1a1a2e", textTransform: "capitalize" },
    fechaCardBadge: { backgroundColor: "#EEF4FF", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
    fechaCardBadgeTexto: { fontSize: 11, color: "#205EA6", fontWeight: "600" },
    fechaCardBody: { borderTopWidth: 1, borderTopColor: "#eef2ff", padding: 12, gap: 10 },
    horasChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    horaChipArrendador: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#EEF4FF", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
    horaChipTexto: { fontSize: 13, fontWeight: "700", color: "#205EA6" },
    horaInputRow: { flexDirection: "row", gap: 8, alignItems: "center" },
    horaInput: { flex: 1, backgroundColor: "#f7f9ff", borderRadius: 10, padding: 10, fontSize: 14, color: "#1a1a2e", borderWidth: 1, borderColor: "#e0e0e0" },
    horaInputBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#205EA6", justifyContent: "center", alignItems: "center" },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 24 },
    modalFechasContainer: { backgroundColor: "#fff", borderRadius: 24, padding: 28, width: "90%", gap: 12, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 16, height: "65%" },
    modalFechasHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4, paddingTop: 8 },
    modalFechasTitulo: { fontSize: 18, fontWeight: "800", color: "#1a1a2e" },
    modalFechasBtnListo: { backgroundColor: "#205EA6", borderRadius: 12, paddingHorizontal: 18, paddingVertical: 8 },
    modalFechasBtnListoTexto: { color: "#fff", fontWeight: "700", fontSize: 14 },
    modalFechasHint: { fontSize: 13, color: "#666", marginBottom: 12 },
    modalFechasLeyenda: { textAlign: "center", fontSize: 12, color: "#888", marginTop: 16 },
})