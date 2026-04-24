import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type AuthenticatedUser = {
    name: string;
    role: string;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const getUserId = (payload: any) => {
    if (!payload || typeof payload !== 'object') return '';
    return payload.id_usuario ?? payload.usuario?.id_usuario ?? payload.user?.id_usuario ?? '';
};

const getUserName = (payload: any) => {
    if (!payload || typeof payload !== 'object') {
        return '';
    }

    return payload.nombre ?? payload.name ?? payload.usuario?.nombre ?? payload.user?.nombre ?? payload.user?.name ?? '';
};

const getUserRole = (payload: any) => {
    if (!payload || typeof payload !== 'object') {
        return '';
    }

    return payload.rol ?? payload.role ?? payload.usuario?.rol ?? payload.user?.rol ?? payload.user?.role ?? '';
};

export default function LoginScreen({ navigation }: any) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null>(null);

    const loginEndpoint = useMemo(() => `${API_BASE_URL}/auth/login`, []);

    const handleLogin = async () => {
        if (!email || !password) {
            setErrorMessage('Ingresa tu correo y contraseña para continuar.');
            return;
        }

        setIsLoading(true);
        setErrorMessage('');

        try {
            const response = await fetch(loginEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: email.trim(), password })
            });

            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                const apiError = payload?.error ?? payload?.message ?? 'Credenciales incorrectas o problema para iniciar sesión.';
                throw new Error(apiError);
            }

            const name = getUserName(payload);
            const role = getUserRole(payload);
            const userId = getUserId(payload);

            if (!name || !role || !userId) {
                throw new Error('El backend no devolvió nombre y rol del usuario.');
            }

            navigation.replace("Navigator", { userId: userId })
            setAuthenticatedUser({ name, role });

        } catch (error: any) {
            setAuthenticatedUser(null);
            setErrorMessage(error?.message ?? 'Ocurrió un error de conexión.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = () => {
        setAuthenticatedUser(null);
        setPassword('');
        setErrorMessage('');
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'android' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.headerContainer}>
                <Text style={styles.title}>UniR00M</Text>
                <Text style={styles.slogan}>Encuentra tu hogar cerca del campus</Text>
            </View>
            <View style={styles.formContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Correo electrónico"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                    editable={!isLoading}
                />

                <TextInput
                    style={styles.input}
                    placeholder="Contraseña"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    editable={!isLoading}
                />

                <TouchableOpacity style={styles.loginButton} onPress={handleLogin} disabled={isLoading}>
                    {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.loginButtonText}>Iniciar sesión</Text>
                    )}
                </TouchableOpacity>

                {errorMessage ? (
                    <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={20} color="#E74C3C" />
                        <Text style={styles.errorTextUI}>{errorMessage}</Text>
                    </View>
                ) : null}

                <TouchableOpacity>
                    <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
                </TouchableOpacity>
            </View>
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
        backgroundColor: '#DCEEFF',
        justifyContent: 'space-between',
        padding: 24,
    },
    loggedContainer: {
        flex: 1,
        backgroundColor: '#F5F7FA',
        justifyContent: 'center',
        padding: 24,
    },
    headerContainer: {
        marginTop: 80,
        alignItems: 'center',
    },
    title: {
        fontSize: 42,
        fontWeight: 'bold',
        color: '#0F2C4F',
        marginBottom: 8,
        textAlign: 'center',
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
        borderColor: '#DBDBDB',
        fontSize: 16,
    },
    loginButton: {
        backgroundColor: '#205EA6',
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
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FDEDEC',
        padding: 14,
        borderRadius: 12,
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#FADBD8',
    },
    errorTextUI: {
        color: '#E74C3C',
        marginLeft: 8,
        fontSize: 15,
        flex: 1,
    },
    forgotPasswordText: {
        color: '#205EA6',
        textAlign: 'center',
        marginTop: 20,
        fontSize: 14,
    },
    footerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 40,
        padding: 10,
    },
    footerText: {
        color: '#7F8C8D',
        fontSize: 15,
    },
    registerText: {
        color: '#205EA6',
        fontSize: 15,
        fontWeight: 'bold',
    },
    userCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        marginTop: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#DBDBDB',
    },
    userLabel: {
        color: '#7F8C8D',
        fontSize: 14,
        marginTop: 8,
    },
    userValue: {
        color: '#2C3E50',
        fontSize: 20,
        fontWeight: '600',
    },
    logoutButton: {
        backgroundColor: '#E74C3C',
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
    },
    logoutButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
