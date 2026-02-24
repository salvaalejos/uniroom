import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Íconos incluidos en Expo

export default function RegisterScreen({ navigation }: any) {
    // Estados para los campos de texto
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Estado para el rol ('student' | 'landlord' | null)
    const [role, setRole] = useState<string | null>(null);

    const handleRegister = () => {
        if (!role) {
            console.log('Falta seleccionar un rol');
            return;
        }
        console.log('Registrando usuario:', { fullName, email, phone, role });
        // Aquí irá la conexión al backend
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Encabezado */}
                <View style={styles.headerContainer}>
                    <Text style={styles.title}>Crea tu cuenta</Text>
                    <Text style={styles.subtitle}>Únete a UniRoom</Text>
                </View>

                {/* Formulario */}
                <View style={styles.formContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Nombre completo"
                        autoCapitalize="words"
                        value={fullName}
                        onChangeText={setFullName}
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Correo electrónico"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={email}
                        onChangeText={setEmail}
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Número de teléfono"
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={setPhone}
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Contraseña"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Confirmar contraseña"
                        secureTextEntry
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                    />

                    {/* Selección de Rol */}
                    <Text style={styles.roleLabel}>¿Cómo usarás la app?</Text>
                    <View style={styles.roleContainer}>
                        {/* Botón Estudiante */}
                        <TouchableOpacity
                            style={[
                                styles.roleCard,
                                role === 'student' && styles.roleCardActive
                            ]}
                            onPress={() => setRole('student')}
                        >
                            <Ionicons
                                name="school-outline"
                                size={32}
                                color={role === 'student' ? '#3498DB' : '#7F8C8D'}
                            />
                            <Text style={[
                                styles.roleText,
                                role === 'student' && styles.roleTextActive
                            ]}>Estudiante</Text>
                        </TouchableOpacity>

                        {/* Botón Arrendador */}
                        <TouchableOpacity
                            style={[
                                styles.roleCard,
                                role === 'landlord' && styles.roleCardActive
                            ]}
                            onPress={() => setRole('landlord')}
                        >
                            <Ionicons
                                name="home-outline"
                                size={32}
                                color={role === 'landlord' ? '#3498DB' : '#7F8C8D'}
                            />
                            <Text style={[
                                styles.roleText,
                                role === 'landlord' && styles.roleTextActive
                            ]}>Arrendador</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Botón Continuar */}
                    <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
                        <Text style={styles.registerButtonText}>Continuar</Text>
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <View style={styles.footerContainer}>
                    <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={styles.loginText}>Iniciar sesión</Text>
                    </TouchableOpacity>
                </View>

            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    scrollContent: {
        padding: 24,
        flexGrow: 1,
        justifyContent: 'center',
    },
    headerContainer: {
        marginTop: 40,
        marginBottom: 30,
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#2C3E50',
    },
    subtitle: {
        fontSize: 16,
        color: '#7F8C8D',
        marginTop: 5,
    },
    formContainer: {
        marginBottom: 20,
    },
    input: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E0E6ED',
        fontSize: 16,
    },
    roleLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2C3E50',
        marginTop: 10,
        marginBottom: 15,
        textAlign: 'center',
    },
    roleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    roleCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E0E6ED',
        alignItems: 'center',
        marginHorizontal: 5,
    },
    roleCardActive: {
        borderColor: '#3498DB',
        backgroundColor: '#EBF5FB', // Un azul muy clarito de fondo
    },
    roleText: {
        marginTop: 8,
        fontSize: 16,
        color: '#7F8C8D',
        fontWeight: '600',
    },
    roleTextActive: {
        color: '#3498DB',
    },
    registerButton: {
        backgroundColor: '#3498DB',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    registerButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    footerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
        marginBottom: 40,
    },
    footerText: {
        color: '#7F8C8D',
        fontSize: 15,
    },
    loginText: {
        color: '#3498DB',
        fontSize: 15,
        fontWeight: 'bold',
    },
});