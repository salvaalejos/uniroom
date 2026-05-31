import React, { useState, useEffect } from 'react';
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
import { Ionicons, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import ThemeToggleButton from '../components/ThemeToggleButton';
import { API_BASE_URL } from '../config';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function ProfileScreen({ navigation, route }: any) {
    const [showTransactions, setShowTransactions] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const { colors, isDark, toggleTheme } = useTheme();
    const queryClient = useQueryClient();

    const userId = route.params?.userId;
    const token = route.params?.token;
    console.log(userId)

    useEffect(() => {
        const parent = navigation.getParent()
        if (parent) parent.setOptions({ headerShown: false });
        return () => {
            if (parent) parent.setOptions({ headerShown: true });
        }
    }, [navigation])

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            queryClient.invalidateQueries({ queryKey: ['profile', userId] });
            queryClient.invalidateQueries({ queryKey: ['savedCards', userId] });
        });
        return unsubscribe;
    }, [navigation, userId, queryClient])

    const { data: userData, isLoading } = useQuery({
        queryKey: ['profile', userId],
        queryFn: async () => {
            const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const contentType = response.headers.get('content-type') || '';
            const data = contentType.includes('application/json')
                ? await response.json()
                : { error: await response.text() };
            if (!response.ok) {
                Alert.alert("Error", data.error || "No se pudo cargar la información del perfil.");
                throw new Error(data.error);
            }
            return data;
        },
        enabled: !!userId,
    });

    const { data: savedCards = [] } = useQuery({
        queryKey: ['savedCards', userId],
        queryFn: async () => {
            const response = await fetch(`${API_BASE_URL}/payments/cards`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            return data.cards || [];
        },
        enabled: !!userId,
    });

    const deleteCardMutation = useMutation({
        mutationFn: async (cardId: string) => {
            await fetch(`${API_BASE_URL}/payments/cards/${cardId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['savedCards', userId] });
        },
        onError: () => {
            Alert.alert("Error", "No se pudo eliminar la tarjeta");
        }
    });

    const deleteCard = (cardId: string) => {
        Alert.alert("Eliminar tarjeta", "¿Deseas eliminar esta tarjeta guardada?", [
            { text: "Cancelar", style: "cancel" },
            { text: "Eliminar", style: "destructive", onPress: () => deleteCardMutation.mutate(cardId) }
        ]);
    };

    const getCardIcon = (pmId: string) => {
        if (pmId === 'visa') return 'cc-visa';
        if (pmId === 'master') return 'cc-mastercard';
        if (pmId === 'amex') return 'cc-amex';
        return 'credit-card';
    };

    const handleLogout = async () => {
        try {
            console.log("[Profile] Cerrando sesión y limpiando storage...");
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('userId');
            setShowLogoutModal(false);
            
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

    const { data: transactions = [], isFetching: loadingTransactions } = useQuery({
        queryKey: ['transactions', userId],
        queryFn: async () => {
            const response = await fetch(`${API_BASE_URL}/users/${userId}/transactions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error("No se pudo cargar el historial.");
            return response.json();
        },
        enabled: !!userId && showTransactions,
        staleTime: 0
    });

    if (isLoading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.buttonMain} />
                <Text style={{ marginTop: 10, color: colors.textPrimary }}>Cargando UniRoomie...</Text>
            </View>
        );
    }

    if (!userData) return null;

    const imagenPerfil = userData.foto 
        ? { uri: `${API_BASE_URL}${userData.foto}` } 
        : require("../default_images/profile_photo.jpg");

    console.log("USER DATA RECIBIDO DE LA API:", JSON.stringify(userData, null, 2));

    const InfoRow = ({ icon, label, value }: any) => (
        <View style={styles.infoRow}>
            <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
                <MaterialCommunityIcons name={icon} size={24} color={colors.buttonMain} />
            </View>
            <View style={styles.textContainer}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
                <Text style={[styles.value, { color: colors.textPrimary }]}>{value}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header con Foto y Rating */}
                <View style={styles.header}>
                    <Image source={imagenPerfil} style={[styles.profilePic, { borderColor: colors.cardBackground }]} />
                    <Text style={[styles.userName, { color: colors.textPrimary }]}>{userData.nombre + " " + userData.apellidos}</Text>
                    <View style={[styles.ratingBadge, { backgroundColor: isDark ? colors.cardBackground : '#0F2C4F' }]}>
                        <Text style={styles.ratingText}>{userData.rating > 0 ? userData.rating : "0"}</Text>
                        <Ionicons name="star" size={16} color="#FFD700" />
                    </View>
                </View>

                {/* Contenedor de Información */}
                <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
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
                <TouchableOpacity 
                    style={[styles.editButton, { backgroundColor: colors.buttonMain }]}
                    onPress={() => navigation.navigate('EditProfile', { userId, token, userData })}
                >
                    <MaterialCommunityIcons name="account-edit-outline" size={24} color={colors.buttonText} />
                    <Text style={[styles.editButtonText, { color: colors.buttonText }]}>Editar Perfil</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.editButton, { backgroundColor: colors.buttonMain }]}
                    onPress={toggleTheme}
                >
                    <MaterialCommunityIcons name={isDark ? "white-balance-sunny" : "moon-waning-crescent"} size={24} color={colors.buttonText} />
                    <Text style={[styles.editButtonText, { color: colors.buttonText }]}>
                        {isDark ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
                    </Text>
                </TouchableOpacity>
                {userData.rol === 'ARRENDADOR' ? (
                    <TouchableOpacity 
                        style={[styles.editButton, { backgroundColor: colors.buttonMain }]}
                        onPress={() => navigation.navigate('HistorialPagosArrendador')}
                    >
                        <MaterialCommunityIcons name="cash-multiple" size={24} color={colors.buttonText} />
                        <Text style={[styles.editButtonText, { color: colors.buttonText }]}>Historial de Ingresos</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity 
                        style={[styles.editButton, { backgroundColor: colors.buttonMain }]}
                        onPress={() => setShowTransactions(true)}>
                        <MaterialCommunityIcons name="text-box-check-outline" size={24} color={colors.buttonText} />
                        <Text style={[styles.editButtonText, { color: colors.buttonText }]}>Historial de Pagos</Text>
                    </TouchableOpacity>
                )}
                
                {/* Mis Tarjetas (solo estudiantes) */}
                {userData.rol === 'ESTUDIANTE' && savedCards.length > 0 && (
                    <View style={[styles.card, { backgroundColor: colors.cardBackground, marginTop: 16 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                            <MaterialCommunityIcons name="credit-card-multiple-outline" size={22} color={colors.textPrimary} />
                            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginLeft: 8 }}>Mis Tarjetas</Text>
                        </View>
                        {savedCards.map((card: any) => (
                            <View key={card.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border || '#E2E8F0' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                    <FontAwesome name={getCardIcon(card.payment_method?.id) as any} size={24} color={colors.textSecondary} />
                                    <View style={{ marginLeft: 12 }}>
                                        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.textPrimary, letterSpacing: 1 }}>•••• {card.last_four_digits}</Text>
                                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                                            {card.cardholder?.name || 'Titular'} · Exp. {String(card.expiration_month).padStart(2, '0')}/{card.expiration_year}
                                        </Text>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={() => deleteCard(card.id)} style={{ padding: 8 }}>
                                    <MaterialCommunityIcons name="trash-can-outline" size={18} color="#E74C3C" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

                <TouchableOpacity 
                    style={[styles.final_button, { backgroundColor: colors.buttonMain }]}
                    onPress={() => setShowLogoutModal(true)}>
                    <MaterialCommunityIcons name="logout" size={24} color={colors.buttonText} />
                    <Text style={[styles.editButtonText, { color: colors.buttonText }]}>Cerrar Sesión</Text>
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
                    <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                        <View style={styles.modalHeader}>
                            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Historial de Pagos</Text>
                            <TouchableOpacity onPress={() => setShowTransactions(false)}>
                                <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                        
                        {loadingTransactions ? (
                            <ActivityIndicator size="large" color={colors.buttonMain} style={{ margin: 20 }} />
                        ) : transactions.length === 0 ? (
                            <Text style={[styles.noTransactionsText, { color: colors.textSecondary }]}>No tienes transacciones registradas.</Text>
                        ) : (
                            <FlatList
                                data={transactions}
                                keyExtractor={(item) => item.id_transaccion}
                                showsVerticalScrollIndicator={false}
                                renderItem={({ item }) => (
                                    <View style={[styles.transactionCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                                        <View style={styles.transactionHeader}>
                                            <Text style={[styles.transactionDate, { color: colors.textSecondary }]}>
                                                {new Date(item.fecha_creacion).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                                            </Text>
                                            <View style={[
                                                styles.statusBadge, 
                                                { backgroundColor: item.estado === 'approved' ? colors.successBackground : colors.errorBackground }
                                            ]}>
                                                <Text style={[
                                                    styles.statusText,
                                                    { color: item.estado === 'approved' ? colors.success : colors.error }
                                                ]}>
                                                    {item.estado === 'approved' ? 'Aprobado' : item.estado}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={[styles.transactionAmount, { color: colors.textPrimary }]}>${parseFloat(item.monto).toFixed(2)} MXN</Text>
                                        <Text style={[styles.transactionDesc, { color: colors.textPrimary }]}>{item.descripcion}</Text>
                                        {item.payment_id && (
                                            <Text style={[styles.transactionId, { color: colors.textSecondary }]}>MP ID: {item.payment_id}</Text>
                                        )}
                                    </View>
                                )}
                            />
                        )}
                    </View>
                </View>
            </Modal>

            {/* Modal de Confirmación de Cerrar Sesión */}
            <Modal visible={showLogoutModal} transparent animationType="fade">
                <View style={styles.logoutOverlay}>
                    <View style={[styles.logoutCard, { backgroundColor: colors.cardBackground }]}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={56} color={colors.buttonMain} style={{ marginBottom: 16 }} />
                        <Text style={[styles.logoutTitle, { color: colors.textPrimary }]}>¿Cerrar sesión?</Text>
                        <Text style={[styles.logoutMessage, { color: colors.textSecondary }]}>
                            ¿Estás seguro de que deseas cerrar sesión? Tendrás que iniciar sesión nuevamente para acceder a tu cuenta.
                        </Text>
                        <View style={styles.logoutButtons}>
                            <TouchableOpacity 
                                style={[styles.logoutBtn, styles.logoutBtnCancel, { backgroundColor: colors.background, borderColor: colors.border }]}
                                onPress={() => setShowLogoutModal(false)}
                            >
                                <Text style={[styles.logoutBtnCancelText, { color: colors.textPrimary }]}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.logoutBtn, styles.logoutBtnConfirm, { backgroundColor: colors.error }]}
                                onPress={handleLogout}
                            >
                                <Text style={styles.logoutBtnConfirmText}>Cerrar sesión</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        alignItems: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
        marginTop: 50,
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
    },
    logoutOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    logoutCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    logoutTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#0F2C4F',
        marginBottom: 8,
    },
    logoutMessage: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    logoutButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    logoutBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    logoutBtnCancel: {
        backgroundColor: '#F0F4F8',
        borderWidth: 1,
        borderColor: '#DCEEFF',
    },
    logoutBtnCancelText: {
        color: '#0F2C4F',
        fontWeight: '600',
        fontSize: 16,
    },
    logoutBtnConfirm: {
        backgroundColor: '#205EA6',
    },
    logoutBtnConfirmText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
});