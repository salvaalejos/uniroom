import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal } from 'react-native';
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useTheme } from '../context/ThemeContext';

const SERVICIOS_DISPONIBLES = ['WiFi', 'Luz incluida', 'Agua incluida', 'Baño propio'];
const RESTRICCIONES_LISTA = ['No mascotas', 'No fumar', 'Solo estudiantes', 'No fiestas'];

export default function FiltrosModal({ visible, onApply, onClose }: any) {
    const [precioMax, setPrecioMax] = useState('');
    const [distanciaChip, setDistanciaChip] = useState(5);
    const [distanciaManual, setDistanciaManual] = useState('');
    const [servicios, setServicios] = useState<string[]>([]);
    const [restricciones, setRestricciones] = useState<string[]>([]);
    const [estrellasMin, setEstrellasMin] = useState(0);
    const { colors, isDark } = useTheme();

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

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: colors.background }]}>
                    <View style={styles.header}>
                        <Text style={[styles.titulo, { color: colors.textPrimary }]}>Filtros UniRoomie</Text>
                        <TouchableOpacity onPress={onClose}>
                            <MaterialCommunityIcons name="close" size={26} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={[styles.label, { color: colors.textPrimary }]}>Precio Máximo (MXN)</Text>
                        <TextInput 
                            style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.textPrimary, borderColor: colors.border }]} 
                            placeholder="$ 4500" 
                            placeholderTextColor={colors.textSecondary}
                            keyboardType="numeric" 
                            value={precioMax} 
                            onChangeText={setPrecioMax} 
                        />

                        <Text style={[styles.label, { color: colors.textPrimary }]}>Distancia máxima al Tec</Text>
                        <View style={styles.grid}>
                            {[1, 2, 3, 5].map(d => (
                                <TouchableOpacity key={d} style={[styles.chip, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }, distanciaChip === d && distanciaManual === '' && [styles.chipActivo, { backgroundColor: colors.buttonMain, borderColor: colors.buttonMain }]]}
                                    onPress={() => {
                                        console.log("[Filtros] Toggle distancia:", d);
                                        if (distanciaChip === d && distanciaManual === '') {
                                            setDistanciaChip(5);
                                        } else {
                                            setDistanciaChip(d);
                                            setDistanciaManual('');
                                        }
                                    }}>
                                    <Text style={[styles.chipText, { color: colors.textSecondary }, distanciaChip === d && distanciaManual === '' && styles.whiteText]}>{d} km</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={styles.manualContainer}>
                            <Text style={[styles.manualLabel, { color: colors.textSecondary }]}>O escribe km:</Text>
                            <TextInput 
                                style={[styles.inputManual, { backgroundColor: colors.backgroundSecondary, color: colors.textPrimary, borderColor: colors.border }, distanciaManual !== '' && [styles.inputManualActivo, { borderColor: colors.buttonMain, backgroundColor: isDark ? '#1a2634' : '#EEF4FF' }]]} 
                                placeholder="1.5 km" 
                                placeholderTextColor={colors.textSecondary}
                                keyboardType="numeric" 
                                value={distanciaManual} 
                                onChangeText={setDistanciaManual} 
                            />
                        </View>

                        <Text style={[styles.label, { color: colors.textPrimary }]}>Calificación mínima</Text>
                        <View style={styles.grid}>
                            {[1, 2, 3, 4, 5].map(s => (
                                <TouchableOpacity key={s} style={[styles.chip, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }, estrellasMin === s && [styles.chipActivo, { backgroundColor: colors.buttonMain, borderColor: colors.buttonMain }]]} onPress={() => {
                                    console.log("[Filtros] Toggle estrellas:", s);
                                    setEstrellasMin(prev => prev === s ? 0 : s);
                                }}>
                                    <View style={styles.starContainer}>
                                        <Text style={[styles.chipText, { color: colors.textSecondary }, estrellasMin === s && styles.whiteText]}>{s}</Text>
                                        <MaterialCommunityIcons name="star" size={14} color={estrellasMin === s ? "#fff" : "#f39c12"} />
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.label, { color: colors.textPrimary }]}>Servicios</Text>
                        <View style={styles.grid}>
                            {SERVICIOS_DISPONIBLES.map(s => (
                                <TouchableOpacity key={s} style={[styles.chip, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }, servicios.includes(s) && [styles.chipActivo, { backgroundColor: colors.buttonMain, borderColor: colors.buttonMain }]]} onPress={() => {
                                    console.log("[Filtros] Toggle servicio:", s);
                                    setServicios(prev => prev.includes(s) ? prev.filter(i => i !== s) : [...prev, s]);
                                }}>
                                    <Text style={[styles.chipText, { color: colors.textSecondary }, servicios.includes(s) && styles.whiteText]}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.label, { color: colors.textPrimary }]}>Restricciones</Text>
                        <View style={styles.grid}>
                            {RESTRICCIONES_LISTA.map(r => (
                                <TouchableOpacity key={r} style={[styles.chip, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }, restricciones.includes(r) && [styles.chipActivo, { backgroundColor: colors.buttonMain, borderColor: colors.buttonMain }]]} onPress={() => {
                                    console.log("[Filtros] Toggle restricción:", r);
                                    setRestricciones(prev => prev.includes(r) ? prev.filter(i => i !== r) : [...prev, r]);
                                }}>
                                    <Text style={[styles.chipText, { color: colors.textSecondary }, restricciones.includes(r) && styles.whiteText]}>{r}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={{ height: 30 }} />
                    </ScrollView>
                    <TouchableOpacity style={[styles.btnAplicar, { backgroundColor: colors.buttonMain }]} onPress={handleApply}><Text style={styles.btnText}>Aplicar Filtros</Text></TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    container: { padding: 25, borderTopLeftRadius: 30, borderTopRightRadius: 30, height: '85%' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    titulo: { fontSize: 22, fontWeight: 'bold' },
    label: { fontWeight: 'bold', marginTop: 20, marginBottom: 12 },
    input: { padding: 15, borderRadius: 12, fontSize: 16, borderWidth: 1 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    chip: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1 },
    chipActivo: { },
    chipText: { fontWeight: '600', marginRight: 4 },
    whiteText: { color: '#fff' },
    starContainer: { flexDirection: 'row', alignItems: 'center' },
    manualContainer: { marginTop: 15, flexDirection: 'row', alignItems: 'center', gap: 10 },
    manualLabel: { fontSize: 14 },
    inputManual: { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, textAlign: 'center' },
    inputManualActivo: { },
    btnAplicar: { padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10 },
    btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});
