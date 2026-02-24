import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform
} from 'react-native';

export default function LoginScreen({ navigation }: any) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = () => {
        // Aquí conectaremos con el backend más adelante
        console.log('Intentando iniciar sesión con:', email);
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            {/* Sección del Encabezado */}
            <View style={styles.headerContainer}>
                <Text style={styles.title}>UniRoom</Text>
                <Text style={styles.slogan}>Encuentra tu hogar cerca del campus</Text>
            </View>

            {/* Sección del Formulario */}
            <View style={styles.formContainer}>
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
                    placeholder="Contraseña"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                />

                <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                    <Text style={styles.loginButtonText}>Iniciar sesión</Text>
                </TouchableOpacity>

                <TouchableOpacity>
                    <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
                </TouchableOpacity>
            </View>

            {/* Sección del Footer */}
            <View style={styles.footerContainer}>
                <Text style={styles.footerText}>¿Eres nuevo aquí? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                    <Text style={styles.registerText}>Regístrate</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA', // Un fondo claro y limpio
        justifyContent: 'space-between',
        padding: 24,
    },
    headerContainer: {
        marginTop: 80,
        alignItems: 'center',
    },
    title: {
        fontSize: 42,
        fontWeight: 'bold',
        color: '#2C3E50',
        marginBottom: 8,
    },
    slogan: {
        fontSize: 16,
        color: '#7F8C8D',
        textAlign: 'center',
    },
    formContainer: {
        flex: 1,
        justifyContent: 'center',
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
    loginButton: {
        backgroundColor: '#3498DB', // Azul confiable
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    forgotPasswordText: {
        color: '#3498DB',
        textAlign: 'center',
        marginTop: 20,
        fontSize: 14,
    },
    footerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 40,
    },
    footerText: {
        color: '#7F8C8D',
        fontSize: 15,
    },
    registerText: {
        color: '#3498DB',
        fontSize: 15,
        fontWeight: 'bold',
    },
});