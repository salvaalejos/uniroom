import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { obtenerMisCitas } from '../services/api';

type Cita = {
  id_cita: string;
  fecha_hora: string;
  estado: string;
  inmueble: { titulo: string };
  estudiante?: { nombre: string; apellidos: string };
  anfitrion?: { nombre: string; apellidos: string };
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
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No hay citas programadas.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', paddingHorizontal: 16, paddingTop: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: '#1a1a2e' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  property: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  date: { fontSize: 14, color: '#555', marginBottom: 4 },
  status: { fontSize: 14, fontWeight: '500' },
  empty: { textAlign: 'center', marginTop: 40, color: '#888' },
});