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

type AuthenticatedUser = {
    name: string;
    role: string;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const getUserName = (payload: any) => {
    if (!payload || typeof payload !== 'object') {
        return '';
    }

    return payload.nombre ?? payload.name ?? payload.usuario?.nombre ?? payload.user?.name ?? '';
};

const getUserRole = (payload: any) => {
    if (!payload || typeof payload !== 'object') {
        return '';
    }

    return payload.rol ?? payload.role ?? payload.usuario?.rol ?? payload.user?.role ?? '';
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
            setErrorMessage('Ingresa tu correo y contraseña.');
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
                body: JSON.stringify({ email, password })
            });

            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(payload?.message ?? 'No se pudo iniciar sesión.');
            }

            const name = getUserName(payload);
            const role = getUserRole(payload);

            if (!name || !role) {
                throw new Error('El backend no devolvió nombre y rol del usuario.');
            }

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

    if (authenticatedUser) {
        return (
            <View style={styles.loggedContainer}>
                <Text style={styles.title}>¡Bienvenido!</Text>
                <View style={styles.userCard}>
                    <Text style={styles.userLabel}>Nombre</Text>
                    <Text style={styles.userValue}>{authenticatedUser.name}</Text>
                    <Text style={styles.userLabel}>Rol</Text>
                    <Text style={styles.userValue}>{authenticatedUser.role}</Text>
                </View>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.headerContainer}>
                <Text style={styles.title}>UniRoom</Text>
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

                {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

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
        backgroundColor: '#F5F7FA',
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
        color: '#2C3E50',
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
        borderColor: '#E0E6ED',
        fontSize: 16,
    },
    loginButton: {
        backgroundColor: '#3498DB',
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
    errorText: {
        marginTop: 12,
        color: '#E74C3C',
        textAlign: 'center',
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
    userCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        marginTop: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#E0E6ED',
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
