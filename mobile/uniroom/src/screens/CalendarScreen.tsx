import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { obtenerMisCitas, decidirRenta } from '../services/api';

type Cita = {
  id_cita: string;
  fecha_hora: string;
  estado: string;
  inmueble: { titulo: string };
  estudiante?: { nombre: string; apellidos: string };
  anfitrion?: { nombre: string; apellidos: string };
  estado_renta?: string;
};

export default function CalendarScreen() {
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarCitas();
  }, []);

  const cargarCitas = async () => {
    try {
      const data = await obtenerMisCitas();
      setCitas(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDecisionRenta = async (id_cita: string, decision: 'APROBADO' | 'RECHAZADO') => {
    try {
      setLoading(true);
      await decidirRenta(id_cita, decision);
      Alert.alert('Éxito', \`Se ha \${decision.toLowerCase()} al estudiante para rentar.\`);
      await cargarCitas();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo registrar la decisión');
      setLoading(false);
    }
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 50 }} />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calendario de Citas</Text>
      <FlatList
        data={citas}
        keyExtractor={(item) => item.id_cita}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.property}>{item.inmueble.titulo}</Text>
            <Text style={styles.date}>{new Date(item.fecha_hora).toLocaleString()}</Text>
            <Text style={[styles.status, { color: item.estado === 'ACEPTADA' ? '#2B9348' : item.estado === 'RECHAZADA' ? '#DC2F02' : '#FFB800' }]}>
              Estado: {item.estado}
            </Text>
            {item.estado_renta && (
              <Text style={[styles.statusRenta, { color: item.estado_renta === 'APROBADO' ? '#2B9348' : '#DC2F02' }]}>
                Renta: {item.estado_renta}
              </Text>
            )}

            {/* Si es arrendador (tiene estudiante), la cita fue aceptada y no hay decisión de renta aún */}
            {item.estudiante && item.estado === 'ACEPTADA' && !item.estado_renta && (
              <View style={styles.actionsContainer}>
                <TouchableOpacity 
                  style={[styles.btnAction, styles.btnApprove]}
                  onPress={() => handleDecisionRenta(item.id_cita, 'APROBADO')}
                >
                  <Text style={styles.btnActionText}>Aprobar Renta</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.btnAction, styles.btnReject]}
                  onPress={() => handleDecisionRenta(item.id_cita, 'RECHAZADO')}
                >
                  <Text style={styles.btnActionText}>Rechazar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No hay citas programadas.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', paddingHorizontal: 16, paddingTop: 20, marginTop: 25 },
  title: { fontSize: 25, fontWeight: 'bold', marginBottom: 16, color: '#1a1a2e' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  property: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  date: { fontSize: 14, color: '#555', marginBottom: 4 },
  status: { fontSize: 14, fontWeight: '500' },
  statusRenta: { fontSize: 14, fontWeight: 'bold', marginTop: 4 },
  empty: { textAlign: 'center', marginTop: 40, color: '#888' },
  actionsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  btnAction: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', marginHorizontal: 4 },
  btnApprove: { backgroundColor: '#205EA6' },
  btnReject: { backgroundColor: '#E74C3C' },
  btnActionText: { color: '#fff', fontWeight: 'bold' },
});