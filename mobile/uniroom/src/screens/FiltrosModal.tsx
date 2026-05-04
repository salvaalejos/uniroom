import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal } from 'react-native';
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

const SERVICIOS_DISPONIBLES = ['WiFi', 'Luz incluida', 'Agua incluida', 'Baño propio'];
const RESTRICCIONES_LISTA = ['No mascotas', 'No fumar', 'Solo estudiantes', 'No fiestas'];

export default function FiltrosModal({ visible, onApply, onClose }: any) {
    const [precioMax, setPrecioMax] = useState('');
    const [distanciaChip, setDistanciaChip] = useState(5);
    const [distanciaManual, setDistanciaManual] = useState('');
    const [servicios, setServicios] = useState<string[]>([]);
    const [restricciones, setRestricciones] = useState<string[]>([]);
    const [estrellasMin, setEstrellasMin] = useState(0);

    const toggleItem = (item: string, list: string[], setList: Function) => {
        setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
    };

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
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.titulo}>Filtros UniRoomie</Text>
                        <TouchableOpacity onPress={onClose}>
                            <MaterialCommunityIcons name="close" size={26} color="#444" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={styles.label}>Precio Máximo (MXN)</Text>
                        <TextInput style={styles.input} placeholder="$ 4500" keyboardType="numeric" value={precioMax} onChangeText={setPrecioMax} />

                        <Text style={styles.label}>Distancia máxima al Tec</Text>
                        <View style={styles.grid}>
                            {[1, 2, 3, 5].map(d => (
                                <TouchableOpacity key={d} style={[styles.chip, distanciaChip === d && distanciaManual === '' && styles.chipActivo]}
                                    onPress={() => { setDistanciaChip(d); setDistanciaManual(''); }}>
                                    <Text style={[styles.chipText, distanciaChip === d && distanciaManual === '' && styles.whiteText]}>{d} km</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={styles.manualContainer}>
                            <Text style={styles.manualLabel}>O escribe km:</Text>
                            <TextInput style={[styles.inputManual, distanciaManual !== '' && styles.inputManualActivo]} placeholder="1.5 km" keyboardType="numeric" value={distanciaManual} onChangeText={setDistanciaManual} />
                        </View>

                        <Text style={styles.label}>Calificación mínima</Text>
                        <View style={styles.grid}>
                            {[1, 2, 3, 4, 5].map(s => (
                                <TouchableOpacity key={s} style={[styles.chip, estrellasMin === s && styles.chipActivo]} onPress={() => setEstrellasMin(s)}>
                                    <View style={styles.starContainer}>
                                        <Text style={[styles.chipText, estrellasMin === s && styles.whiteText]}>{s}</Text>
                                        <MaterialCommunityIcons name="star" size={14} color={estrellasMin === s ? "#fff" : "#f39c12"} />
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Servicios</Text>
                        <View style={styles.grid}>
                            {SERVICIOS_DISPONIBLES.map(s => (
                                <TouchableOpacity key={s} style={[styles.chip, servicios.includes(s) && styles.chipActivo]} onPress={() => toggleItem(s, servicios, setServicios)}>
                                    <Text style={[styles.chipText, servicios.includes(s) && styles.whiteText]}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.label}>Restricciones</Text>
                        <View style={styles.grid}>
                            {RESTRICCIONES_LISTA.map(r => (
                                <TouchableOpacity key={r} style={[styles.chip, restricciones.includes(r) && styles.chipActivo]} onPress={() => toggleItem(r, restricciones, setRestricciones)}>
                                    <Text style={[styles.chipText, restricciones.includes(r) && styles.whiteText]}>{r}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={{ height: 30 }} />
                    </ScrollView>
                    <TouchableOpacity style={styles.btnAplicar} onPress={handleApply}><Text style={styles.btnText}>Aplicar Filtros</Text></TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    container: { backgroundColor: '#fff', padding: 25, borderTopLeftRadius: 30, borderTopRightRadius: 30, height: '85%' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    titulo: { fontSize: 22, fontWeight: 'bold', color: '#1a1a2e' },
    label: { fontWeight: 'bold', marginTop: 20, marginBottom: 12, color: '#444' },
    input: { backgroundColor: '#f5f5f5', padding: 15, borderRadius: 12, fontSize: 16 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    chip: { paddingVertical: 10, paddingHorizontal: 15, backgroundColor: '#f0f2f5', borderRadius: 20, borderWidth: 1, borderColor: '#eee' },
    chipActivo: { backgroundColor: '#205EA6', borderColor: '#205EA6' },
    chipText: { color: '#666', fontWeight: '600', marginRight: 4 },
    whiteText: { color: '#fff' },
    starContainer: { flexDirection: 'row', alignItems: 'center' },
    manualContainer: { marginTop: 15, flexDirection: 'row', alignItems: 'center', gap: 10 },
    manualLabel: { fontSize: 14, color: '#666' },
    inputManual: { flex: 1, backgroundColor: '#f5f5f5', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#eee', textAlign: 'center' },
    inputManualActivo: { borderColor: '#205EA6', backgroundColor: '#EEF4FF' },
    btnAplicar: { backgroundColor: '#205EA6', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10 },
    btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});