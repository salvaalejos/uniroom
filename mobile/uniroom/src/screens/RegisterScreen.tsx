import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Íconos incluidos en Expo

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export default function RegisterScreen({ navigation }: any) {
    // Estados para los campos de texto
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Estado para el rol ('student' | 'landlord' | null)
    const [role, setRole] = useState<string | null>(null);

    // Estado de carga
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleRegister = async () => {
        setErrorMessage('');
        setSuccessMessage('');

        if (!role) {
            setErrorMessage('Falta seleccionar un rol');
            return;
        }

        if (password !== confirmPassword) {
            setErrorMessage('Las contraseñas no coinciden');
            return;
        }

        if (!fullName || !email || !password) {
            setErrorMessage('Por favor completa todos los campos obligatorios');
            return;
        }

        // Validar formato de email antes de enviar al backend
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            setErrorMessage('Ingresa un correo electrónico válido (ej: nombre@dominio.com)');
            return;
        }

        if (password.length <= 5) {
            setErrorMessage('La contraseña debe tener más de 5 caracteres.');
            return;
        }

        setIsLoading(true);

        const [nombre, ...apellidosParts] = fullName.trim().split(' ');
        const apellidos = apellidosParts.join(' ') || '.';
        const backendRole = role === 'student' ? 'ESTUDIANTE' : 'ARRENDADOR';

        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email.trim(),
                    password,
                    nombre,
                    apellidos,
                    rol: backendRole
                })
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                // Elysia devuelve { summary, type, on, property } para errores de validación (422)
                let errorMsg = data?.error ?? data?.message ?? data?.summary;
                if (typeof errorMsg === 'object') errorMsg = JSON.stringify(errorMsg);
                throw new Error(errorMsg ?? 'No se pudo completar el registro');
            }

            setSuccessMessage('¡Tu cuenta ha sido creada correctamente! Ahora puedes iniciar sesión para acceder a tu cuenta.');
        } catch (error: any) {
            setErrorMessage(error?.message ?? 'Ocurrió un error de conexión');
        } finally {
            setIsLoading(false);
        }
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

                {errorMessage ? (
                    <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={20} color="#E74C3C" />
                        <Text style={styles.errorTextUI}>{errorMessage}</Text>
                    </View>
                ) : null}

                {successMessage ? (
                    <View style={styles.successContainer}>
                        <Ionicons name="checkmark-circle" size={24} color="#27AE60" />
                        <View style={styles.successTextContainer}>
                            <Text style={styles.successTitle}>Registrado con éxito</Text>
                            <Text style={styles.successTextUI}>{successMessage}</Text>
                            <TouchableOpacity style={styles.successButton} onPress={() => navigation.goBack()}>
                                <Text style={styles.successButtonText}>Ir a Iniciar Sesión</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : null}

                {/* Formulario */}
                {!successMessage && (
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
                    <TouchableOpacity 
                        style={[styles.registerButton, isLoading && styles.registerButtonDisabled]} 
                        onPress={handleRegister}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.registerButtonText}>Continuar</Text>
                        )}
                    </TouchableOpacity>
                </View>
                )}

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
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FDEDEC',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#FADBD8',
    },
    errorTextUI: {
        color: '#E74C3C',
        marginLeft: 8,
        fontSize: 15,
        flex: 1,
    },
    successContainer: {
        flexDirection: 'row',
        backgroundColor: '#EAFAF1',
        padding: 20,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#D5F5E3',
        alignItems: 'flex-start',
    },
    successTextContainer: {
        marginLeft: 12,
        flex: 1,
    },
    successTitle: {
        color: '#27AE60',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    successTextUI: {
        color: '#2E4053',
        fontSize: 15,
        marginBottom: 16,
        lineHeight: 22,
    },
    successButton: {
        backgroundColor: '#27AE60',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    successButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 15,
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
    registerButtonDisabled: {
        opacity: 0.7,
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