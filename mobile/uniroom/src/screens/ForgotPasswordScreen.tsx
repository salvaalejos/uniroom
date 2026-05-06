import React, { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useTheme } from '../context/ThemeContext';
import ThemeToggleButton from '../components/ThemeToggleButton';

const hostUri = Constants.expoConfig?.hostUri?.split(':').shift();
const API_BASE_URL = hostUri ? `http://${hostUri}:3000` : 'http://localhost:3000';

export default function ForgotPasswordScreen({ navigation }: any) {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const { colors, isDark } = useTheme();

    const handleSendCode = async () => {
        if (!email.trim()) {
            setErrorMessage('Ingresa tu correo electrónico.');
            return;
        }

        setIsLoading(true);
        setErrorMessage('');

        try {
            const response = await fetch(`${API_BASE_URL}/auth/forgot-password-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: email.trim() })
            });

            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(payload?.error ?? 'Error al enviar el código de recuperación.');
            }

            navigation.navigate('ResetPassword', { email: email.trim() });
        } catch (error: any) {
            setErrorMessage(error?.message ?? 'Ocurrió un error de conexión.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'android' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: colors.background }]}
        >
            <View style={styles.content}>
                <View style={styles.header}>
                    <View style={[styles.iconContainer, { backgroundColor: isDark ? colors.cardBackground : '#EEF2FF' }]}>
                        <Ionicons name="key-outline" size={48} color={colors.accent} />
                    </View>
                    <Text style={[styles.title, { color: colors.textPrimary }]}>Recuperar contraseña</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Ingresa el correo electrónico asociado a tu cuenta para enviarte un código de recuperación.
                    </Text>
                </View>

                <TextInput
                    style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.textPrimary }]}
                    placeholder="Correo electrónico"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={setEmail}
                    editable={!isLoading}
                />

                {errorMessage ? (
                    <View style={[styles.errorContainer, { backgroundColor: colors.errorBackground, borderColor: colors.error }]}>
                        <Ionicons name="alert-circle" size={20} color={colors.error} />
                        <Text style={[styles.errorText, { color: colors.error }]}>{errorMessage}</Text>
                    </View>
                ) : null}

                <TouchableOpacity
                    style={[styles.sendButton, { backgroundColor: colors.buttonMain }]}
                    onPress={handleSendCode}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color={colors.buttonText} />
                    ) : (
                        <Text style={[styles.sendButtonText, { color: colors.buttonText }]}>Enviar código</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
                    <Text style={[styles.backLink, { color: colors.textSecondary }]}>Volver al inicio de sesión</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.bottomRightButtonContainer}>
                <ThemeToggleButton />
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    bottomRightButtonContainer: {
        position: 'absolute',
        bottom: 40,
        right: 24,
        zIndex: 10,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    },
    input: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        fontSize: 16,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
    },
    errorText: {
        marginLeft: 8,
        fontSize: 15,
        flex: 1,
    },
    sendButton: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    sendButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 32,
    },
    backLink: {
        fontSize: 16,
        marginLeft: 8,
    },
});
