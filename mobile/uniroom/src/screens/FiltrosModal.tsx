import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Dimensions, Platform } from 'react-native';
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SERVICIOS_ICONS: Record<string, string> = {
    "WiFi": "wifi",
    "Agua": "water",
    "Luz": "lightning-bolt",
    "Gas": "fire",
    "Lavadora": "washing-machine",
    "Estacionamiento": "car",
    "Amueblado": "bed"
};

const RESTRICCIONES_ICONS: Record<string, string> = {
    "No mascotas": "paw-off",
    "No fumar": "smoking-off",
    "No fiestas": "glass-wine",
    "Solo estudiantes": "school",
    "No visitas": "account-cancel"
};

const SERVICIOS_DISPONIBLES = Object.keys(SERVICIOS_ICONS);
const RESTRICCIONES_LISTA = Object.keys(RESTRICCIONES_ICONS);

export default function FiltrosModal({ visible, onApply, onClose, initialFilters }: any) {
    const [precioMax, setPrecioMax] = useState('');
    const [distanciaChip, setDistanciaChip] = useState(5);
    const [distanciaManual, setDistanciaManual] = useState('');
    const [servicios, setServicios] = useState<string[]>([]);
    const [restricciones, setRestricciones] = useState<string[]>([]);
    const [estrellasMin, setEstrellasMin] = useState(0);
    const { colors, isDark } = useTheme();

    React.useEffect(() => {
        if (visible && initialFilters) {
            setPrecioMax(initialFilters.precioMax === 99999 ? '' : initialFilters.precioMax?.toString() || '');
            setDistanciaChip(initialFilters.distanciaMax || 5);
            setServicios(initialFilters.servicios || []);
            setRestricciones(initialFilters.restricciones || []);
            setEstrellasMin(initialFilters.calificacionMin || 0);
        } else if (visible && !initialFilters) {
            setPrecioMax('');
            setDistanciaChip(5);
            setDistanciaManual('');
            setServicios([]);
            setRestricciones([]);
            setEstrellasMin(0);
        }
    }, [visible, initialFilters]);

    const handleApply = () => {
        const distFinal = distanciaManual !== '' ? parseFloat(distanciaManual) : distanciaChip;
        onApply({ 
            precioMax: precioMax ? parseInt(precioMax) : 99999, 
            distanciaMax: distFinal, 
            servicios, 
            restricciones,
            calificacionMin: estrellasMin
        });
    };

    const toggleServicio = (s: string) => {
        setServicios(prev => prev.includes(s) ? prev.filter(i => i !== s) : [...prev, s]);
    };

    const toggleRestriccion = (r: string) => {
        setRestricciones(prev => prev.includes(r) ? prev.filter(i => i !== r) : [...prev, r]);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: colors.background }]}>
                    {/* Barra de arrastre visual */}
                    <View style={[styles.dragPill, { backgroundColor: isDark ? '#475569' : '#CBD5E1' }]} />

                    <View style={styles.header}>
                        <Text style={[styles.titulo, { color: colors.textPrimary }]}>Filtros UniRoomie</Text>
                        <TouchableOpacity onPress={onClose} style={styles.btnClose}>
                            <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                        
                        {/* Precio Máximo */}
                        <Text style={[styles.label, { color: colors.textPrimary }]}>Precio Máximo (MXN)</Text>
                        <View style={[styles.inputContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                            <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>$</Text>
                            <TextInput 
                                style={[styles.input, { color: colors.textPrimary }]} 
                                placeholder="Ej: 4500" 
                                placeholderTextColor={colors.textSecondary}
                                keyboardType="numeric" 
                                value={precioMax} 
                                onChangeText={setPrecioMax} 
                            />
                        </View>

                        {/* Distancia */}
                        <Text style={[styles.label, { color: colors.textPrimary }]}>Distancia máxima al Tec</Text>
                        <View style={styles.grid}>
                            {[1, 2, 3, 5].map(d => {
                                const activo = distanciaChip === d && distanciaManual === '';
                                return (
                                    <TouchableOpacity 
                                        key={d} 
                                        style={[
                                            styles.chip, 
                                            { backgroundColor: colors.cardBackground, borderColor: colors.border }, 
                                            activo && { backgroundColor: colors.buttonMain, borderColor: colors.buttonMain }
                                        ]}
                                        onPress={() => {
                                            if (activo) {
                                                setDistanciaChip(5);
                                            } else {
                                                setDistanciaChip(d);
                                                setDistanciaManual('');
                                            }
                                        }}>
                                        <Text style={[styles.chipText, { color: colors.textSecondary }, activo && styles.whiteText]}>{d} km</Text>
                                    </TouchableOpacity>
                                )
                            })}
                        </View>

                        <View style={styles.manualContainer}>
                            <Text style={[styles.manualLabel, { color: colors.textSecondary }]}>O escribe km:</Text>
                            <TextInput 
                                style={[styles.inputManual, { backgroundColor: colors.cardBackground, color: colors.textPrimary, borderColor: colors.border }, distanciaManual !== '' && { borderColor: colors.buttonMain }]} 
                                placeholder="1.5 km" 
                                placeholderTextColor={colors.textSecondary}
                                keyboardType="numeric" 
                                value={distanciaManual} 
                                onChangeText={setDistanciaManual} 
                            />
                        </View>

                        {/* Calificación Mínima */}
                        <Text style={[styles.label, { color: colors.textPrimary }]}>Calificación mínima</Text>
                        <View style={styles.grid}>
                            {[1, 2, 3, 4, 5].map(s => {
                                const activo = estrellasMin === s;
                                return (
                                    <TouchableOpacity 
                                        key={s} 
                                        style={[
                                            styles.chip, 
                                            { backgroundColor: colors.cardBackground, borderColor: colors.border }, 
                                            activo && { backgroundColor: colors.buttonMain, borderColor: colors.buttonMain }
                                        ]} 
                                        onPress={() => setEstrellasMin(prev => prev === s ? 0 : s)}
                                    >
                                        <View style={styles.starContainer}>
                                            <Text style={[styles.chipText, { color: colors.textSecondary }, activo && styles.whiteText]}>{s}</Text>
                                            <MaterialCommunityIcons name="star" size={14} color={activo ? "#fff" : "#f39c12"} />
                                        </View>
                                    </TouchableOpacity>
                                )
                            })}
                        </View>

                        {/* Servicios / Amenidades (Estilo Arrendador) */}
                        <Text style={[styles.label, { color: colors.textPrimary }]}>Servicios incluidos</Text>
                        <View style={styles.cardsGrid}>
                            {SERVICIOS_DISPONIBLES.map(s => {
                                const activo = servicios.includes(s);
                                return (
                                    <TouchableOpacity 
                                        key={s} 
                                        style={[
                                            styles.cardUI, 
                                            { backgroundColor: isDark ? colors.cardBackground : "#FFF", borderColor: colors.border },
                                            activo && { borderColor: colors.buttonMain, backgroundColor: isDark ? colors.cardBackground : '#EBF5FB' }
                                        ]} 
                                        onPress={() => toggleServicio(s)}
                                    >
                                        <MaterialCommunityIcons name={SERVICIOS_ICONS[s] || "check-circle"} size={28} color={activo ? colors.buttonMain : colors.textSecondary} />
                                        <Text style={[styles.cardUITexto, { color: colors.textSecondary }, activo && { color: colors.buttonMain }]}>{s}</Text>
                                    </TouchableOpacity>
                                )
                            })}
                        </View>

                        {/* Restricciones (Estilo Arrendador) */}
                        <Text style={[styles.label, { color: colors.textPrimary }]}>Restricciones</Text>
                        <View style={styles.cardsGrid}>
                            {RESTRICCIONES_LISTA.map(r => {
                                const activo = restricciones.includes(r);
                                return (
                                    <TouchableOpacity 
                                        key={r} 
                                        style={[
                                            styles.cardUI, 
                                            { backgroundColor: isDark ? colors.cardBackground : "#FFF", borderColor: colors.border },
                                            activo && { borderColor: '#E74C3C', backgroundColor: isDark ? colors.cardBackground : '#FDEAEA' }
                                        ]} 
                                        onPress={() => toggleRestriccion(r)}
                                    >
                                        <MaterialCommunityIcons name={RESTRICCIONES_ICONS[r] || "cancel"} size={28} color={activo ? '#E74C3C' : colors.textSecondary} />
                                        <Text style={[styles.cardUITexto, { color: colors.textSecondary }, activo && { color: '#E74C3C' }]}>{r}</Text>
                                    </TouchableOpacity>
                                )
                            })}
                        </View>

                    </ScrollView>
                    <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
                        <TouchableOpacity style={[styles.btnAplicar, { backgroundColor: colors.buttonMain }]} onPress={handleApply}>
                            <Text style={styles.btnText}>Aplicar Filtros</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    container: { borderTopLeftRadius: 28, borderTopRightRadius: 28, height: '90%', paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
    dragPill: { width: 36, height: 5, borderRadius: 2.5, alignSelf: 'center', marginTop: 12 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 },
    titulo: { fontSize: 22, fontWeight: 'bold' },
    btnClose: { padding: 4 },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 100 },
    label: { fontWeight: 'bold', fontSize: 16, marginTop: 24, marginBottom: 12 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, height: 54 },
    currencySymbol: { fontSize: 18, fontWeight: 'bold', marginRight: 6 },
    input: { flex: 1, fontSize: 16 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    chip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1.5 },
    chipText: { fontWeight: '600' },
    whiteText: { color: '#fff' },
    starContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    manualContainer: { marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
    manualLabel: { fontSize: 14, fontWeight: '500' },
    inputManual: { width: 100, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, textAlign: 'center', fontSize: 14, fontWeight: '600' },
    cardsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 4,
    },
    cardUI: {
        width: (SCREEN_WIDTH - 48 - 24) / 3, // 3 columns adjusting to paddingHorizontal 24
        height: 90,
        borderRadius: 16,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 6,
    },
    cardUITexto: {
        fontSize: 11,
        fontWeight: 'bold',
        marginTop: 6,
        textAlign: 'center',
    },
    footer: { paddingHorizontal: 24, paddingTop: 16, borderTopWidth: 1 },
    btnAplicar: { padding: 16, borderRadius: 14, alignItems: 'center' },
    btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
