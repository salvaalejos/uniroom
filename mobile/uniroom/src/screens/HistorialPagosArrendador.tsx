import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { obtenerHistorialPagos } from '../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Transaccion = {
  id_transaccion: number;
  monto: number;
  estado: string;
  descripcion: string;
  fecha_creacion: string;
  comision_plataforma: number;
  estado_pago_arrendador: string;
  inmueble: { titulo: string };
  usuario: { nombre: string; apellidos: string };
};

export default function HistorialPagosArrendador({ navigation }: any) {
  const [transacciones, setTransacciones] = useState<Transaccion[]>([]);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    cargarHistorial();
  }, []);

  const cargarHistorial = async () => {
    try {
      const response = await obtenerHistorialPagos();
      setTransacciones(response.transacciones || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'TRANSFERIDO': return '#27AE60';
      case 'PENDIENTE': return '#F39C12';
      default: return '#7F8C8D';
    }
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 50 }} />;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#0F2C4F" />
        </TouchableOpacity>
        <Text style={styles.title}>Historial de Ingresos</Text>
      </View>
      
      <FlatList
        data={transacciones}
        keyExtractor={(item) => item.id_transaccion.toString()}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.property}>{item.inmueble?.titulo || 'Renta'}</Text>
              <Text style={styles.date}>{new Date(item.fecha_creacion).toLocaleDateString()}</Text>
            </View>
            <View style={styles.cardBody}>
              <View>
                <Text style={styles.label}>Inquilino:</Text>
                <Text style={styles.value}>{item.usuario?.nombre} {item.usuario?.apellidos}</Text>
              </View>
              <View style={styles.amountContainer}>
                <Text style={styles.amount}>${(item.monto - (item.comision_plataforma || 0)).toLocaleString('es-MX')} MXN</Text>
              </View>
            </View>
            <View style={styles.cardFooter}>
              <View style={styles.statusBadge}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.estado_pago_arrendador) }]} />
                <Text style={styles.statusText}>{item.estado_pago_arrendador}</Text>
              </View>
              {item.comision_plataforma > 0 && (
                <Text style={styles.feeText}>Comisión Uniroom: ${item.comision_plataforma.toFixed(2)}</Text>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No tienes ingresos registrados aún.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', elevation: 2 },
  backBtn: { padding: 8, marginRight: 8 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#0F2C4F' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  property: { fontSize: 16, fontWeight: 'bold', color: '#1A1A2E', flex: 1 },
  date: { fontSize: 12, color: '#888' },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  label: { fontSize: 12, color: '#666' },
  value: { fontSize: 14, fontWeight: '500', color: '#1A1A2E' },
  amountContainer: { alignItems: 'flex-end' },
  amount: { fontSize: 18, fontWeight: 'bold', color: '#27AE60' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: '600', color: '#444' },
  feeText: { fontSize: 12, color: '#888' },
  empty: { textAlign: 'center', marginTop: 40, color: '#888', fontSize: 16 },
});
