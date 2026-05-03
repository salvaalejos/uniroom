import React, { useState } from 'react';
import { useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    Image,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Alert,
    ActivityIndicator,
    Modal,
    FlatList
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
const hostUri = Constants.expoConfig?.hostUri?.split(':').shift();

const API_BASE_URL = hostUri ? `http://${hostUri}:3000` : 'http://localhost:3000';;

export default function ProfileScreen({ navigation, route }: any) {
    const [userData, setUserData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [showTransactions, setShowTransactions] = useState(false);
    const [loadingTransactions, setLoadingTransactions] = useState(false);

    const userId = route.params?.userId;
    const token = route.params?.token;
    console.log(userId)
    useEffect(() => {
        const parent = navigation.getParent()
        if (parent) parent.setOptions({ headerShown: false });
        getUserData();
        return () => {
            if (parent) {
                parent.setOptions({headerShown: true})
            }
        }
    }, [navigation, userId])

    const handleLogout = async () => {
        try {
            console.log("[Profile] Cerrando sesión y limpiando storage...");
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('userId');
            
            navigation.dispatch(
                CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'Login' }],
                })
            );
        } catch (error) {
            console.error("[Profile] Error al cerrar sesión:", error);
            Alert.alert("Error", "No se pudo cerrar la sesión correctamente.");
        }
    }

    const fetchTransactions = async () => {
        try {
            setLoadingTransactions(true);
            setShowTransactions(true);
            const response = await fetch(`${API_BASE_URL}/users/${userId}/transactions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setTransactions(data);
            }
        } catch (error) {
            Alert.alert("Error", "No se pudo cargar el historial.");
        } finally {
            setLoadingTransactions(false);
        }
    };

    const getUserData = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();

            if (response.ok) {
                setUserData(data);
            } else {
                Alert.alert("Error", "No se pudo cargar la información del perfil.");
            }
        } catch (error) {
            console.error("Error en fetch:", error);
            Alert.alert("Error de conexión", "Revisa que tu backend esté encendido.");
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#205EA6" />
                <Text style={{ marginTop: 10, color: '#0F2C4F' }}>Cargando UNIROOM...</Text>
            </View>
        );
    }

    if (!userData) return null;

    const imagenPerfil = userData.foto 
        ? { uri: `${API_BASE_URL}${userData.foto}` } 
        : require("../default_images/profile_photo.jpg");

    console.log(userData.foto)

    const InfoRow = ({ icon, label, value }: any) => (
        <View style={styles.infoRow}>
            <View style={styles.iconContainer}>
                <MaterialCommunityIcons name={icon} size={24} color="#205EA6" />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.value}>{value}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header con Foto y Rating */}
                <View style={styles.header}>
                    <Image source={imagenPerfil} style={styles.profilePic} />
                    <Text style={styles.userName}>{userData.nombre + " " + userData.apellidos}</Text>
                    <View style={styles.ratingBadge}>
                        <Text style={styles.ratingText}>{userData.rating > 0 ? userData.rating : "0"}</Text>
                        <Ionicons name="star" size={16} color="#FFD700" />
                    </View>
                </View>

                {/* Contenedor de Información */}
                <View style={styles.card}>
                    <InfoRow 
                        icon="account-outline" 
                        label="Rol" 
                        value={userData.rol === 'ESTUDIANTE' ? 'Estudiante' : 'Arrendador'} 
                    />
                    <InfoRow 
                        icon="gender-transgender" 
                        label="Género" 
                        value={userData.genero === 'MASCULINO' ? 'Hombre' : userData.genero === 'FEMENINO' ? 'Mujer' : 'No Binario'} 
                    />
                    <InfoRow 
                        icon="email-outline" 
                        label="Correo Electrónico" 
                        value={userData.email} 
                    />
                    <InfoRow 
                        icon="phone-outline" 
                        label="Teléfono" 
                        value={userData.numero_contacto} 
                    />
                </View>
                {/* <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => navigation.navigate('Register', { userToEdit: userData })}
                >
                    AUN PENDIENTES LOS BOTONTES DE EDITAR PERFIL Y CALIFICACIONES ------------------------------------------------------------------------------------------------------------
                    <MaterialCommunityIcons name="account-edit-outline" size={24} color="#FFFFFF" />
                    <Text style={styles.editButtonText}>Editar Perfil</Text>
                </TouchableOpacity> */}
                {/* Botón de Temas, pendiente */}
                {/* <TouchableOpacity
                style={styles.editButton}>
                    <MaterialCommunityIcons name='format-paint' size={24} color={"#FFFFFF"}/>
                    <Text style={styles.editButtonText}>Temas de colores (Pendiente) </Text>
                </TouchableOpacity> */}
                <TouchableOpacity 
                    style={styles.editButton}
                    onPress={fetchTransactions}>
                    <MaterialCommunityIcons name="receipt" size={24} color="#FFFFFF" />
                    <Text style={styles.editButtonText}>Historial de Pagos</Text>
                </TouchableOpacity>
                    {/* calificaciones lol */}
                {/* <TouchableOpacity 
                    style={styles.editButton}>
                    <MaterialCommunityIcons name="star" size={24} color="#FFFFFF" />
                    <Text style={styles.editButtonText}>Calificaciones</Text>
                </TouchableOpacity> */}
                <TouchableOpacity 
                    style={styles.final_button}
                    onPress={handleLogout}>
                    <MaterialCommunityIcons name="logout" size={24} color="#FFFFFF" />
                    <Text style={styles.editButtonText}>Cerrar Sesión</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Modal de Historial de Transacciones */}
            <Modal
                visible={showTransactions}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowTransactions(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Historial de Pagos</Text>
                            <TouchableOpacity onPress={() => setShowTransactions(false)}>
                                <MaterialCommunityIcons name="close" size={24} color="#0F2C4F" />
                            </TouchableOpacity>
                        </View>
                        
                        {loadingTransactions ? (
                            <ActivityIndicator size="large" color="#205EA6" style={{ margin: 20 }} />
                        ) : transactions.length === 0 ? (
                            <Text style={styles.noTransactionsText}>No tienes transacciones registradas.</Text>
                        ) : (
                            <FlatList
                                data={transactions}
                                keyExtractor={(item) => item.id_transaccion}
                                showsVerticalScrollIndicator={false}
                                renderItem={({ item }) => (
                                    <View style={styles.transactionCard}>
                                        <View style={styles.transactionHeader}>
                                            <Text style={styles.transactionDate}>
                                                {new Date(item.fecha_creacion).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                                            </Text>
                                            <View style={[
                                                styles.statusBadge, 
                                                { backgroundColor: item.estado === 'approved' ? '#EAFAF1' : '#FDEDEC' }
                                            ]}>
                                                <Text style={[
                                                    styles.statusText,
                                                    { color: item.estado === 'approved' ? '#27AE60' : '#E74C3C' }
                                                ]}>
                                                    {item.estado === 'approved' ? 'Aprobado' : item.estado}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={styles.transactionAmount}>${parseFloat(item.monto).toFixed(2)} MXN</Text>
                                        <Text style={styles.transactionDesc}>{item.descripcion}</Text>
                                        {item.payment_id && (
                                            <Text style={styles.transactionId}>MP ID: {item.payment_id}</Text>
                                        )}
                                    </View>
                                )}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#DCEEFF',
    },
    scrollContent: {
        padding: 20,
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
        marginTop: 70,
    },
    profilePic: {
        width: 150,
        height: 150,
        borderRadius: 100,
        borderWidth: 4,
        borderColor: '#FFFFFF',
        marginBottom: 15,
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0F2C4F',
    },
    ratingBadge: {
        flexDirection: 'row',
        backgroundColor: '#0F2C4F',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
        alignItems: 'center',
        marginTop: 8,
    },
    ratingText: {
        color: '#FFFFFF',
        marginLeft: 0,
        marginRight: 5,
        fontWeight: 'bold',
    },
    card: {
        backgroundColor: '#FFFFFF',
        width: '100%',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        marginBottom: 30,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    iconContainer: {
        width: 45,
        height: 45,
        backgroundColor: '#DCEEFF',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    textContainer: {
        flex: 1,
    },
    label: {
        fontSize: 12,
        color: '#7F8C8D',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    value: {
        fontSize: 16,
        color: '#0F2C4F',
        fontWeight: '600',
    },
    editButton: {
        backgroundColor: '#205EA6',
        flexDirection: 'row',
        width: '100%',
        padding: 16,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    final_button: {
        backgroundColor: '#205EA6',
        flexDirection: 'row',
        width: '100%',
        padding: 16,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 80,
        
    },
    editButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        height: '70%',
        padding: 20,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#0F2C4F',
    },
    noTransactionsText: {
        textAlign: 'center',
        color: '#7F8C8D',
        marginTop: 30,
        fontSize: 16,
    },
    transactionCard: {
        backgroundColor: '#F8F9F9',
        padding: 15,
        borderRadius: 12,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#EAECEE',
    },
    transactionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    transactionDate: {
        color: '#7F8C8D',
        fontSize: 14,
        textTransform: 'capitalize',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    transactionAmount: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0F2C4F',
        marginBottom: 5,
    },
    transactionDesc: {
        fontSize: 14,
        color: '#2E4053',
        marginBottom: 5,
    },
    transactionId: {
        fontSize: 12,
        color: '#95A5A6',
    }
});