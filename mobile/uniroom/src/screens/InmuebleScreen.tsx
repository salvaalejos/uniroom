import { View, Text, TextInput, Image, StyleSheet, ScrollView, TouchableOpacity, Modal, Dimensions } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useState } from "react"
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons"

const { height: SCREEN_HEIGHT} = Dimensions.get('window')

// Datos falsos por ahora sjdhsjd
const PROPIEDAD = {
    titulo: "Departamento Centro Morelia",
    anfitrion: "Stevenson",
    precio: 3200,
    calificacion: 4.91,
    opiniones: 56,
    ubicacion: "Centro Histórico, Morelia — Zona tranquila, cerca de transporte público",
    descripcion: "Departamento amueblado de 2 habitaciones en el corazón de Morelia. Ideal para estudiantes. Incluye todos los servicios básicos y acceso a áreas comunes.",
    servicios: ["WiFi incluido", "Agua incluida", "Luz incluida", "Lavadora", "Estacionamiento"],
    reglas: ["No mascotas", "No fumar", "No fiestas", "Máx. 2 personas"],
    contacto: "55 1234 5678",
    imagenes: [
        require("../default_images/dreamhouse.jpg"),
        require("../default_images/fachada.jpg"),
        require("../default_images/otracasa.jpeg"),
    ]
}

const ANFITRION = require("../default_images/anfi.jpg")

type Props = {
    visible: boolean
    onClose: () => void
}

// ฅ^•ﻌ•^ฅ hola guapuritas
const InmuebleScreen = ({ visible, onClose }: Props) => {

    // Comentarios preestablecidos ksdhfsjf
    const [comentarios, setComentarios] = useState <{ autor: string, texto: string, fecha: string }[]> ([
        { autor: "Ana G.", texto: "Muy buen lugar, limpio y tranquilo.", fecha: "12 de enero de 2025" },
        { autor: "Carlos M.", texto: "Excelente ubicación, el anfitrión muy amable.", fecha: "3 de febrero de 2025" },
        { autor: "Sofía R.", texto: "Todo como se describe, lo recomiendo.", fecha: "28 de marzo de 2025" },
    ])

    // Poder agregar comentarios
    const [nuevoComentario, setNuevoComentario] = useState("")

    const agregarComentario = () => {
        if (nuevoComentario.trim() === "") return
        const tiempo = new Date()
        const fecha = tiempo.toLocaleDateString('es-MX', {
            minute: 'numeric',
            hour: 'numeric',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        })
        setComentarios([
            { autor: "Tú", texto: nuevoComentario, fecha },
            ...comentarios,
        ])
        setNuevoComentario("")
    }

    const insets = useSafeAreaInsets()
    const [favorito, setFavorito] = useState(false)
    const [imagenActual, setImagenActual] = useState(0)
    const [miCalificacion, setMiCalificacion] = useState(0)

    return(

        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>

            <View style={[styles.container, { paddingTop: insets.top}]}>

                <ScrollView bounces={false} showsVerticalScrollIndicator={false}>

                    {/* Galeria */}
                    <View style={styles.galeriaContainer}>

                        <Image source={PROPIEDAD.imagenes[imagenActual]} style={styles.imagenPrincipal}/>

                        {/* Boton de cerrar */}
                        <TouchableOpacity style={styles.btnCerrar} onPress={onClose}>
                            <MaterialCommunityIcons name="chevron-left" size={28} color="#1a1a2a"/>
                        </TouchableOpacity>

                        {/* Boton de favorito */}
                        <TouchableOpacity style={styles.btnFavorito} onPress={() => setFavorito(!favorito)}>
                            <MaterialCommunityIcons name={favorito ? "heart" : "heart-outline"} size={26} color={favorito ? "#e74c3c" : "#1a1a2e"}
                            />
                        </TouchableOpacity>

                        {/* Miniautas */}
                        <View style={styles.miniaturas}>
                            {PROPIEDAD.imagenes.map((img, i) => (
                                <TouchableOpacity key={i} onPress={() => setImagenActual(i)}>
                                    <Image source={img} style={[styles.miniatura, imagenActual === i && styles.miniaturaActiva]}/>
                                </TouchableOpacity>
                            ))}
                        </View>

                    </View>

                    {/* Informacion Principal */}
                    <View style={styles.info}>

                        {/* Titulo y calificaciones jsjs */}
                        <Text style={styles.titulo}>{PROPIEDAD.titulo}</Text>
                        
                        <View style={styles.calificacionContainer}>
                            <View style={styles.calificacionItem}>
                                <Text style={styles.calificacionNumero}>{PROPIEDAD.calificacion}</Text>
                                <View style={styles.estrellas}>
                                    {[1, 2 ,3 ,4 ,5].map((i)=>(
                                        <TouchableOpacity key={i} onPress={() => setMiCalificacion(i)}>
                                            <MaterialCommunityIcons
                                            name={i <= miCalificacion ? "star" : "star-outline"}
                                            size={25}
                                            color="#f39c12"/>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.calificacionItem}>
                                <Text style={styles.calificacionNumero}>{PROPIEDAD.opiniones}</Text>
                                <Text style={styles.opinionesLabel}>opiniones</Text>
                            </View>

                        </View>


                        <View style={styles.divider}/>

                        {/* Anfitrion */}
                        <View style={styles.anfitrionRow}>
                            <Image source={ANFITRION} style={styles.avatarImagen}/>
                            <View>
                                <Text style={styles.anfitrionLabel}>Anfitrión</Text>
                                <Text style={styles.anfitrionNombre}>{PROPIEDAD.anfitrion}</Text>
                            </View>
                        </View>

                        <View style={styles.divider}/>

                        {/* Ubicacion */}
                        <View style={styles.seccion}>
                            <MaterialCommunityIcons name="map-marker" size={18} color="#205EA6" />
                            <Text style={styles.seccionTexto}>{PROPIEDAD.ubicacion}</Text>
                        </View>

                        <View style={styles.divider}/>

                        {/* Descripción */}
                        <Text style={styles.descripcion}>{PROPIEDAD.descripcion}</Text>
                        
                        <View style={styles.divider}/>

                        {/* Servicios */}
                        <Text style={styles.subtitulo}>Servicios incluidos</Text>
                        <View style={styles.tags}>
                            {PROPIEDAD.servicios.map((s, i) => (
                                <View key={i} style={styles.tag}>
                                    <Text style={styles.tagTexto}>{s}</Text>
                                </View>
                            ))}
                        </View>
                        
                        <View style={styles.divider}/>

                        {/* Reglas */}
                        <Text style={styles.subtitulo}>Reglas de la casa</Text>
                        <View style={styles.tags}>
                            {PROPIEDAD.reglas.map((r, i) => (
                                <View key={i} style={[styles.tag, styles.tagRegla]}>
                                    <Text style={[styles.tagTexto, styles.tagTextoRegla]}>{r}</Text>
                                </View>
                            ))}
                        </View>

                        <View style={styles.divider}/>

                        {/* Nuevo comentario */}
                        <View style={styles.inputComentarioContainer}>
                            <TextInput
                            style={styles.inputComentario}
                            placeholder="Escribe tu comentario..."
                            placeholderTextColor="#aaa"
                            value={nuevoComentario}
                            onChangeText={setNuevoComentario}
                            multiline/>
                            <TouchableOpacity style={styles.btnEnviar} onPress={agregarComentario}>
                                <MaterialCommunityIcons name="send" size={20} color="#fff"/>
                            </TouchableOpacity>
                        </View>

                        {/* Comentarios predefinidos */}
                        {comentarios.map((c, i) => (
                            <View key={i} style={styles.comentario}>
                                <View style={styles.comentarioAvatar}>
                                    <MaterialCommunityIcons name="account" size={20} color="#fff"/>
                                </View>

                                <View style={{flex: 1}}>
                                    <View style={{ flexDirection: "column", justifyContent: "space-between" }}>
                                        <Text style={styles.comentarioAutor}>{c.autor}</Text>
                                        <Text style={{ fontSize: 11, color: "#aaa" }}>{c.fecha}</Text>
                                    </View>
                                    <Text style={styles.comentarioTexto}>{c.texto}</Text>
                                </View>

                            </View>
                        ))}
                    </View>

                </ScrollView>

                {/* Footer */}
                <View style={styles.footer}>
                    <View>
                        <Text style={styles.footerPrecio}>${PROPIEDAD.precio.toLocaleString('es-MX')}</Text>
                        <Text style={styles.footerMes}>/ mes</Text>
                    </View>
                    <TouchableOpacity style={styles.btnContacto}>
                        <MaterialCommunityIcons name="phone" size={18} color="#fff"/>
                        <Text style={styles.btnContactoTexto}>Contactar</Text>
                    </TouchableOpacity>
                </View>

            </View>

        </Modal>
    )
}


// Estilos del modal

export default InmuebleScreen

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    galeriaContainer: {
        position: "relative",
    },
    imagenPrincipal: {
        width: "100%",
        height: SCREEN_HEIGHT * 0.38,
        resizeMode: "cover",
    },
    btnCerrar: {
        position: "absolute",
        top: 16,
        left: 16,
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 6,
        elevation: 4,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    btnFavorito: {
        position: "absolute",
        top: 16,
        right: 16,
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 6,
        elevation: 4,
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    miniaturas: {
        flexDirection: "row",
        gap: 8,
        padding: 12,
        backgroundColor: "#f5f5f5",
    },
    miniatura: {
        width: 60,
        height: 50,
        borderRadius: 8,
        opacity: 0.6,
    },
    miniaturaActiva: {
        opacity: 1,
        borderWidth: 2,
        borderColor: "#205EA6",
    },
    info: {
        padding: 20,
    },
    titulo: {
        fontSize: 22,
        fontWeight: "800",
        color: "#1a1a2e",
        marginBottom: 8,
    },
    calificacionContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        paddingVertical: 8,
    },
    calificacionItem: {
        alignItems: "center",
        gap: 4,
    },
    calificacionNumero: {
        fontSize: 26,
        fontWeight: "800",
        color: "#1a1a2e",
    },
    estrellas: {
        flexDirection: "row",
        gap: 2,
    },
    opinionesLabel: {
        fontSize: 14,
        color: "#1a1a2e",
    },
    divider: {
        height: 1,
        backgroundColor: "#eee",
        marginVertical: 16,
    },
    anfitrionRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    avatarImagen: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    anfitrionLabel: {
        fontSize: 12,
        color: "#888",
    },
    anfitrionNombre: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1a1a2e",
    },
    seccion: {
        flexDirection: "row",
        gap: 8,
        alignItems: "flex-start",
    },
    seccionTexto: {
        flex: 1,
        fontSize: 14,
        color: "#444",
        lineHeight: 20,
    },
    descripcion: {
        fontSize: 14,
        color: "#555",
        lineHeight: 22,
    },
    subtitulo: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1a1a2e",
        marginBottom: 10,
    },
    tags: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
    },
    tag: {
        backgroundColor: "#EEF4FF",
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 14,
    },
    tagTexto: {
        fontSize: 13,
        color: "#205EA6",
        fontWeight: "600",
    },
    tagRegla: {
        backgroundColor: "#FFF0F0",
    },
    tagTextoRegla: {
        color: "#e74c3c",
    },
    inputComentarioContainer: {
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 8,
        marginBottom: 16,
    },
    inputComentario: {
        flex: 1,
        backgroundColor: "#f5f5f5",
        borderRadius: 12,
        padding: 12,
        fontSize: 14,
        color: "#1a1a2e",
        maxHeight: 100,
    },
    btnEnviar: {
        backgroundColor: "#205EA6",
        borderRadius: 20,
        padding: 10,
        justifyContent: "center",
        alignItems: "center",
    },
    comentario: {
        flexDirection: "row",
        gap: 10,
        marginBottom: 14,
        alignItems: "flex-start",
    },
    comentarioAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#205EA6",
        justifyContent: "center",
        alignItems: "center",
    },
    comentarioAutor: {
        fontSize: 13,
        fontWeight: "700",
        color: "#1a1a2e",
    },
    comentarioTexto: {
        fontSize: 13,
        color: "#666",
        marginTop: 2,
    },
    footer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: "#eee",
        backgroundColor: "#fff",
    },
    footerPrecio: {
        fontSize: 20,
        fontWeight: "800",
        color: "#1a1a2e",
    },
    footerMes: {
        fontSize: 12,
        color: "#888",
    },
    btnContacto: {
        flexDirection: "row",
        backgroundColor: "#205EA6",
        borderRadius: 24,
        paddingVertical: 12,
        paddingHorizontal: 24,
        alignItems: "center",
        gap: 8,
    },
    btnContactoTexto: {
        color: "#fff",
        fontWeight: "700",
        fontSize: 15,
    },
})