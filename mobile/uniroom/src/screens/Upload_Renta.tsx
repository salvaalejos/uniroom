import { ScrollView, Text, View, StyleSheet, TextInput, Image, TouchableOpacity, Modal, Dimensions, Alert } from 'react-native'
import { useState } from 'react'
import * as ImagePicker from 'expo-image-picker'
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Video, ResizeMode } from 'expo-av' // npx expo install expo-av

// ─── Constantes ───

const { width: SCREEN_WIDTH } = Dimensions.get('window')

// servicios provicionales skhfjsdfd
const SERVICIOS_OPCIONES = ["WiFi", "Agua", "Luz", "Gas", "Lavadora", "Estacionamiento", "Amueblado"]
const REGLAS_OPCIONES = ["No mascotas", "No fumar", "No fiestas", "Solo estudiantes", "No visitas"]

// ─── Tipos ───

type Media = {
    uri: string
    tipo: "foto" | "video"
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
}

// ─── Componente ───

const Lessor_Renthouse = () => {
    const insets = useSafeAreaInsets()
    const navigation = useNavigation<any>()
    const route = useRoute<any>()

    // si viene un inmueble es edición, si no es nuevo
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
        estado: inmuebleExistente?.estado ?? "pendiente"
    })

    const [previsualizando, setPrevisualizando] = useState(false)

    // ── Fotos ──
    const agregarMedia = async (tipo: "foto" | "video") => {
        const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (!permiso.granted) return

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: tipo === "foto" 
                ? ImagePicker.MediaTypeOptions.Images 
                : ImagePicker.MediaTypeOptions.Videos,
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

    // ── Servicios y reglas ──
    const toggleItem = (campo: "servicios" | "reglas", item: string) => {
        setForm(f => ({
            ...f,
            [campo]: f[campo].includes(item)
                ? f[campo].filter(i => i !== item)
                : [...f[campo], item]
        }))
    }

    // ── Validación ──
    const formularioValido = () => {
        return form.titulo.trim() !== "" &&
            form.precio.trim() !== "" &&
            form.ubicacion.trim() !== "" &&
            form.descripcion.trim() !== "" &&
            form.medios.length > 0
    }

    const publicar = () => {
        // aquí después se conecta a la API
        Alert.alert(
            esEdicion ? "¡Cambios guardados!" : "¡Listo!",
            esEdicion ? "Tu inmueble fue actualizado." : "Tu propiedad fue enviada y está en revisión.",
            [{ text: "OK", onPress: () => navigation.goBack() }]
        )
    }

    return (
        <ScrollView style={styles.background} contentContainerStyle={{ paddingBottom: 120 }}>

            {/* ── Header ── */}
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <MaterialCommunityIcons name="chevron-left" size={30} color="#1a1a2e" />
                </TouchableOpacity>
                <Text style={styles.titulo}>{esEdicion ? "Editar inmueble" : "Nueva publicación"}</Text>
            </View>

            <Text style={styles.subtituloHead}>
                {esEdicion
                    ? "Modifica los datos de tu inmueble."
                    : "Tu propiedad quedará en estado pendiente hasta ser verificada."}
            </Text>

            {/* ── Fotos ── */}
            <View style={styles.seccion}>
                <Text style={styles.label}>Fotos y Videos <Text style={styles.requerido}>*</Text></Text>
                <Text style={styles.hint}>Máximo 6 (fotos o videos)</Text>
                <View style={styles.fotosGrid}>
                    {form.medios.map((media, i) => (
                        <View key={i} style={styles.fotoContainer}>

                            {media.tipo === "foto" ? (
                                <Image source={{ uri: media.uri }} style={styles.foto} />
                            ) : (
                                <Video
                                    source={{ uri: media.uri }}
                                    style={styles.foto}
                                    resizeMode={ResizeMode.COVER}
                                    shouldPlay={false}
                                    isMuted
                                />
                            )}

                            {/* icono de video */}
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

            {/* ── Título ── */}
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

            {/* ── Ubicación ── */}
            <View style={styles.seccion}>
                <Text style={styles.label}>Ubicación <Text style={styles.requerido}>*</Text></Text>
                <TextInput
                    style={styles.input}
                    placeholder="Ej. Centro Histórico, Morelia"
                    placeholderTextColor="#aaa"
                    value={form.ubicacion}
                    onChangeText={v => setForm(f => ({ ...f, ubicacion: v }))}
                />
            </View>

            {/* ── Precio ── */}
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

            {/* ── Descripción ── */}
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

            {/* ── Servicios ── */}
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

            {/* ── Reglas ── */}
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

            {/* ── Botón vista previa ── */}
            <TouchableOpacity
                style={[styles.btnPrevia, !formularioValido() && styles.btnDesactivado]}
                onPress={() => formularioValido() && setPrevisualizando(true)}
            >
                <MaterialCommunityIcons name="eye" size={20} color="#fff" />
                <Text style={styles.btnPreviaTexto}>Vista previa</Text>
            </TouchableOpacity>

            {/* ── Modal vista previa ── */}
            <Modal visible={previsualizando} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPrevisualizando(false)}>
                <ScrollView style={styles.modalContainer} contentContainerStyle={{ paddingBottom: 40 }}>

                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setPrevisualizando(false)}>
                            <MaterialCommunityIcons name="chevron-left" size={28} color="#1a1a2e" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitulo}>Vista previa</Text>
                        <View style={styles.badgePendiente}>
                            <Text style={styles.badgePendienteTexto}>
                                {esEdicion ? form.estado : "Pendiente"}
                            </Text>
                        </View>
                    </View>

                    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                        {form.medios.map((media, i) => (
                            media.tipo === "foto" ? (
                                <Image key={i} source={{ uri: media.uri }} style={styles.previaImagen} />
                            ) : (
                                <Video
                                    key={i}
                                    source={{ uri: media.uri }}
                                    style={styles.previaImagen}
                                    resizeMode={ResizeMode.COVER}
                                    shouldPlay={false}
                                    useNativeControls
                                />
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
                                    {form.servicios.map((s, i) => (
                                        <View key={i} style={styles.chip}>
                                            <Text style={styles.chipTextoServicio}>{s}</Text>
                                        </View>
                                    ))}
                                </View>
                            </>
                        )}

                        {form.reglas.length > 0 && (
                            <>
                                <Text style={styles.previaSubtitulo}>Reglas</Text>
                                <View style={styles.chips}>
                                    {form.reglas.map((r, i) => (
                                        <View key={i} style={[styles.chip, styles.chipRegla]}>
                                            <Text style={styles.chipTextoRegla}>{r}</Text>
                                        </View>
                                    ))}
                                </View>
                            </>
                        )}

                        <TouchableOpacity style={styles.btnPublicar} onPress={publicar}>
                            <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
                            <Text style={styles.btnPublicarTexto}>
                                {esEdicion ? "Guardar cambios" : "Enviar para revisión"}
                            </Text>
                        </TouchableOpacity>
                    </View>

                </ScrollView>
            </Modal>

        </ScrollView>
    )
}

export default Lessor_Renthouse

// ─── Estilos ───

const styles = StyleSheet.create({
    background: {
        flex: 1,
        backgroundColor: "#f5f7fa",
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 4,
    },
    titulo: {
        fontSize: 22,
        fontWeight: "800",
        color: "#1a1a2e",
    },
    subtituloHead: {
        fontSize: 13,
        color: "#888",
        marginHorizontal: 20,
        marginTop: 4,
        marginBottom: 8,
    },
    seccion: {
        marginHorizontal: 20,
        marginTop: 20,
    },
    label: {
        fontSize: 15,
        fontWeight: "700",
        color: "#1a1a2e",
        marginBottom: 8,
    },
    requerido: {
        color: "#e74c3c",
    },
    hint: {
        fontSize: 12,
        color: "#aaa",
        marginBottom: 8,
    },
    input: {
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 14,
        fontSize: 14,
        color: "#1a1a2e",
        borderWidth: 1,
        borderColor: "#e0e0e0",
    },
    inputMultiline: {
        height: 110,
        textAlignVertical: "top",
    },
    fotosGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    fotoContainer: {
        position: "relative",
    },
    foto: {
        width: (SCREEN_WIDTH - 60) / 3,
        height: (SCREEN_WIDTH - 60) / 3,
        borderRadius: 10,
    },
    videoIconOverlay: {
        position: "absolute",
        top: 0, left: 0, right: 0, bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.2)",
        borderRadius: 10,
    },
    btnEliminarFoto: {
        position: "absolute",
        top: -6,
        right: -6,
        backgroundColor: "#fff",
        borderRadius: 12,
    },
    btnAgregarFoto: {
        width: (SCREEN_WIDTH - 60) / 3,
        height: (SCREEN_WIDTH - 60) / 3,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: "#205EA6",
        borderStyle: "dashed",
        justifyContent: "center",
        alignItems: "center",
        gap: 4,
    },
    btnAgregarFotoTexto: {
        fontSize: 12,
        color: "#205EA6",
        fontWeight: "600",
    },
    chips: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    chip: {
        backgroundColor: "#EEF4FF",
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: "#EEF4FF",
    },
    chipActivo: {
        backgroundColor: "#205EA6",
        borderColor: "#205EA6",
    },
    chipTextoServicio: {
        fontSize: 13,
        color: "#205EA6",
        fontWeight: "600",
    },
    chipTextoRegla: {
        fontSize: 13,
        color: "#b83e31",
        fontWeight: "600",
    },
    chipTextoActivo: {
        color: "#fff",
    },
    chipRegla: {
        backgroundColor: "#FFF0F0",
        borderColor: "#FFF0F0",
    },
    chipReglaActivo: {
        backgroundColor: "#b83e31",
        borderColor: "#b83e31",
    },
    chipTextoReglaActivo: {
        color: "#fff",
    },
    btnPrevia: {
        flexDirection: "row",
        backgroundColor: "#205EA6",
        borderRadius: 24,
        paddingVertical: 14,
        paddingHorizontal: 28,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        marginHorizontal: 20,
        marginTop: 32,
    },
    btnDesactivado: {
        opacity: 0.4,
    },
    btnPreviaTexto: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 16,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: "#fff",
    },
    modalHeader: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        gap: 12,
    },
    modalTitulo: {
        fontSize: 18,
        fontWeight: "800",
        color: "#1a1a2e",
        flex: 1,
    },
    badgePendiente: {
        backgroundColor: "#ffffff",
        borderRadius: 12,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderWidth: 1.5,
        borderColor: "#205EA6"
    },
    badgePendienteTexto: {
        fontSize: 12,
        color: "#205EA6",
        fontWeight: "700",
    },
    previaImagen: {
        width: SCREEN_WIDTH,
        height: 260,
        resizeMode: "cover",
    },
    previaInfo: {
        padding: 20,
        gap: 12,
    },
    previaTitulo: {
        fontSize: 22,
        fontWeight: "800",
        color: "#1a1a2e",
    },
    previaFila: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    previaTexto: {
        fontSize: 14,
        color: "#555",
    },
    previaPrecio: {
        fontSize: 22,
        fontWeight: "800",
        color: "#205EA6",
    },
    previaDescripcion: {
        fontSize: 14,
        color: "#555",
        lineHeight: 22,
    },
    previaSubtitulo: {
        fontSize: 15,
        fontWeight: "700",
        color: "#1a1a2e",
        marginTop: 8,
    },
    btnPublicar: {
        flexDirection: "row",
        backgroundColor: "#5db682",
        borderRadius: 10,
        paddingVertical: 14,
        paddingHorizontal: 28,
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        marginTop: 24,
    },
    btnPublicarTexto: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 16,
    },
})
