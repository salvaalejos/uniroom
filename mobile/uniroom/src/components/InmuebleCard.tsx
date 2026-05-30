import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Inmueble } from '../types/properties';

interface InmuebleCardProps {
    inmueble: Inmueble;
    onPress?: () => void;
    rightAction?: React.ReactNode;
    showStatus?: boolean;
}

export const InmuebleCard = ({ inmueble, onPress, rightAction, showStatus = true }: InmuebleCardProps) => {
    const { colors, isDark } = useTheme();

    const Content = () => (
        <View style={[styles.card, { backgroundColor: colors.cardBackground, shadowColor: isDark ? 'transparent' : '#000' }]}>
            <Image 
                source={typeof inmueble.foto === 'object' ? inmueble.foto : { uri: inmueble.foto }} 
                style={styles.cardFoto}
            />
            <View style={styles.cardInfo}>
                <View style={styles.cardInfoTop}>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitulo, { color: colors.textPrimary }]} numberOfLines={1}>
                            {inmueble.titulo}
                        </Text>
                        <View style={styles.cardUbicacionRow}>
                            <MaterialCommunityIcons name="map-marker" size={13} color={colors.accent}/>
                            <Text style={[styles.cardUbicacion, { color: colors.textSecondary }]} numberOfLines={1}>
                                {inmueble.ubicacion}
                            </Text>
                        </View>
                        <Text style={[styles.cardDescripcion, { color: colors.textSecondary }]} numberOfLines={2}>
                            {inmueble.descripcion}
                        </Text>
                    </View>
                    {rightAction}
                </View>
                <View style={styles.cardFooter}>
                    <Text style={[styles.cardPrecio, { color: colors.buttonMain }]}>
                        ${inmueble.precio.toLocaleString('es-MX')}
                        <Text style={[styles.cardMes, { color: colors.textSecondary }]}> / mes</Text>
                    </Text>
                    {showStatus && (
                        <View style={[styles.badge, inmueble.estado === "publicado" 
                            ? [styles.badgePublicado, { backgroundColor: colors.accent, borderColor: colors.accent }] 
                            : [styles.badgePendiente, { backgroundColor: isDark ? colors.backgroundSecondary : '#FFFFFF', borderColor: colors.buttonMain }]]}>
                            <Text style={[styles.badgeTexto, inmueble.estado === "publicado" 
                                ? styles.badgeTextoPublicado 
                                : [styles.badgeTextoPendiente, { color: colors.buttonMain }]]}>
                                {inmueble.estado === "publicado" ? "Publicado" : "Pendiente"}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );

    if (onPress) {
        return (
            <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
                <Content />
            </TouchableOpacity>
        );
    }

    return <Content />;
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 14,
        overflow: "hidden",
        elevation: 2,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        position: "relative",
    },
    cardFoto: {
        width: "100%",
        height: 160,
        resizeMode: "cover",
    },
    cardInfo: {
        padding: 14,
        gap: 10,
    },
    cardInfoTop: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
    },
    cardTitulo: {
        fontSize: 16,
        fontWeight: "700",
    },
    cardUbicacionRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
        marginTop: 10,
    },
    cardUbicacion: {
        fontSize: 12,
        flex: 1,
    },
    cardDescripcion: {
        fontSize: 14,
        marginTop: 10,
    },
    cardFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    cardPrecio: {
        fontSize: 18,
        fontWeight: "800",
    },
    cardMes: {
        fontSize: 12,
        fontWeight: "400",
    },
    badge: {
        borderRadius: 12,
        paddingVertical: 4,
        paddingHorizontal: 10,
    },
    badgePublicado: {
        borderWidth: 1.5,
    },
    badgePendiente: {
        borderWidth: 1.5,
    },
    badgeTexto: {
        fontSize: 12,
        fontWeight: "700",
    },
    badgeTextoPublicado: {
        color: "#ffffff",
    },
    badgeTextoPendiente: {
    },
});
