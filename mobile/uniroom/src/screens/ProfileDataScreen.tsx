import React from 'react';
import { useEffect } from 'react';
import {
    StyleSheet,
    View,
    Text,
    Image,
    ScrollView,
    TouchableOpacity,
    SafeAreaView
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function ProfileDataScreen({ navigation }: any) {
    useEffect(() => {
        const parent = navigation.getParent()
        if (parent) parent.setOptions({ headerShown: false });
        return () => {
            if (parent) {
                parent.setOptions({headerShown: true})
            }
        }
    }, [navigation])
    // Información de prueba (Simulando la BD)
    const userData = {
        fullName: 'Juan Alberto Sánchez Hernández',
        email: 'jash0144@uniroom.houses.com',
        phone: '4434689407',
        role: 'student', // 'student' o 'landlord'
        gender: 'man',   // 'man', 'woman', 'non-binary'
        rating: 4.8,
        picture: "../default_images/profile_photo.jpg" // URL de prueba
    };

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
                    {/* IMPORTANTE AL DEL BACKEND, cambiar este require por un URI de la BD */}
                    <Image source={require("../default_images/profile_photo.jpg")} style={styles.profilePic} />
                    <Text style={styles.userName}>{userData.fullName}</Text>
                    <View style={styles.ratingBadge}>
                        <Ionicons name="star" size={16} color="#FFD700" />
                        <Text style={styles.ratingText}>{userData.rating}</Text>
                    </View>
                </View>

                {/* Contenedor de Información */}
                <View style={styles.card}>
                    <InfoRow 
                        icon="account-outline" 
                        label="Rol" 
                        value={userData.role === 'student' ? 'Estudiante' : 'Arrendador'} 
                    />
                    <InfoRow 
                        icon="gender-transgender" 
                        label="Género" 
                        value={userData.gender === 'man' ? 'Hombre' : userData.gender === 'woman' ? 'Mujer' : 'No Binario'} 
                    />
                    <InfoRow 
                        icon="email-outline" 
                        label="Correo Electrónico" 
                        value={userData.email} 
                    />
                    <InfoRow 
                        icon="phone-outline" 
                        label="Teléfono" 
                        value={userData.phone} 
                    />
                </View>
                <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => navigation.navigate('Register', { userToEdit: userData })}
                >
                    <MaterialCommunityIcons name="account-edit-outline" size={24} color="#FFFFFF" />
                    <Text style={styles.editButtonText}>Editar Perfil</Text>
                </TouchableOpacity>
                {/* Botón de Temas, pendiente */}
                {/* <TouchableOpacity
                style={styles.editButton}>
                    <MaterialCommunityIcons name='format-paint' size={24} color={"#FFFFFF"}/>
                    <Text style={styles.editButtonText}>Temas de colores (Pendiente) </Text>
                </TouchableOpacity> */}
            </ScrollView>
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
        marginTop: 20,
    },
    profilePic: {
        width: 120,
        height: 120,
        borderRadius: 60,
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
        marginLeft: 5,
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
        marginBottom: 40,
    },
    editButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 10,
    },
});