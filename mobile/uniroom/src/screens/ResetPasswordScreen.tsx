import React, { useState, useEffect, useRef } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config';

const OTP_LENGTH = 6;

export default function ResetPasswordScreen({ navigation, route }: any) {
    const email = route.params?.email || '';
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    
    const { colors, isDark } = useTheme();
    
    const inputRefs = useRef<(TextInput | null)[]>([]);

    const handleResetPassword = async () => {
        if (otp.length !== OTP_LENGTH) {
            setErrorMessage('Ingresa el código de 6 dígitos completo.');
            return;
        }

        if (newPassword.length < 6) {
            setErrorMessage('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        setIsLoading(true);
        setErrorMessage('');

        try {
            const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, codigo: otp, newPassword })
            });

            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(payload?.error ?? 'Error al restablecer la contraseña.');
            }

            setShowSuccessModal(true);
        } catch (error: any) {
            setErrorMessage(error?.message ?? 'Ocurrió un error de conexión.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChangeText = (text: string, index: number) => {
        const cleanText = text.replace(/[^0-9]/g, '');
        
        if (cleanText.length > 0) {
            const newOtp = otp + cleanText;
            setOtp(newOtp.slice(0, OTP_LENGTH));
            
            if (index < OTP_LENGTH - 1 && newOtp.length < OTP_LENGTH) {
                inputRefs.current[index + 1]?.focus();
            }
        }
    };

    const handleBackspace = (index: number) => {
        if (otp.length > 0 && index > 0) {
            const newOtp = otp.slice(0, -1);
            setOtp(newOtp);
            inputRefs.current[index - 1]?.focus();
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
                        <Ionicons name="lock-closed-outline" size={48} color={colors.accent} />
                    </View>
                    <Text style={[styles.title, { color: colors.textPrimary }]}>Nueva contraseña</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Ingresa el código que enviamos a{' '}
                        <Text style={[styles.emailText, { color: colors.accent }]}>{email}</Text>
                    </Text>
                </View>

                <View style={styles.otpContainer}>
                    {Array.from({ length: OTP_LENGTH }).map((_, index) => (
                        <TextInput
                            key={index}
                            ref={(ref) => (inputRefs.current[index] = ref)}
                            style={[
                                styles.otpInput,
                                { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.textPrimary },
                                otp[index] && [styles.otpInputFilled, { borderColor: colors.accent, backgroundColor: isDark ? colors.backgroundSecondary : '#EEF2FF' }],
                                errorMessage && [styles.otpInputError, { borderColor: colors.error, backgroundColor: colors.errorBackground }],
                            ]}
                            keyboardType="number-pad"
                            maxLength={2}
                            value={otp[index] || ''}
                            onChangeText={(text) => handleChangeText(text, index)}
                            onKeyPress={({ nativeEvent }) => {
                                if (nativeEvent.key === 'Backspace') {
                                    handleBackspace(index);
                                }
                            }}
                            onFocus={() => {
                                if (otp.length < index) {
                                    inputRefs.current[otp.length]?.focus();
                                }
                            }}
                            editable={!isLoading}
                            selectTextOnFocus
                        />
                    ))}
                </View>

                <TextInput
                    style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.textPrimary }]}
                    placeholder="Nueva contraseña"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry
                    value={newPassword}
                    onChangeText={setNewPassword}
                    editable={!isLoading}
                />

                {errorMessage ? (
                    <View style={[styles.errorContainer, { backgroundColor: colors.errorBackground, borderColor: colors.error }]}>
                        <Ionicons name="alert-circle" size={20} color={colors.error} />
                        <Text style={[styles.errorText, { color: colors.error }]}>{errorMessage}</Text>
                    </View>
                ) : null}

                <TouchableOpacity
                    style={[
                        styles.resetButton,
                        { backgroundColor: colors.buttonMain },
                        (isLoading || otp.length !== OTP_LENGTH || newPassword.length < 6) && styles.resetButtonDisabled,
                    ]}
                    onPress={handleResetPassword}
                    disabled={isLoading || otp.length !== OTP_LENGTH || newPassword.length < 6}
                >
                    {isLoading ? (
                        <ActivityIndicator color={colors.buttonText} />
                    ) : (
                        <Text style={[styles.resetButtonText, { color: colors.buttonText }]}>Restablecer contraseña</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.navigate('Login')}
                >
                    <Ionicons name="close" size={20} color={colors.textSecondary} />
                    <Text style={[styles.backLink, { color: colors.textSecondary }]}>Cancelar</Text>
                </TouchableOpacity>
            </View>

            <Modal
                animationType="fade"
                transparent={true}
                visible={showSuccessModal}
                onRequestClose={() => {}}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
                        <View style={[styles.modalIconContainer, { backgroundColor: '#EEF2FF' }]}>
                            <Ionicons name="checkmark-circle" size={60} color="#4CAF50" />
                        </View>
                        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>¡Contraseña Actualizada!</Text>
                        <Text style={[styles.modalText, { color: colors.textSecondary }]}>
                            Tu contraseña ha sido restablecida exitosamente. Ahora puedes iniciar sesión con tu nueva contraseña.
                        </Text>
                        <TouchableOpacity
                            style={[styles.modalButton, { backgroundColor: colors.buttonMain }]}
                            onPress={() => {
                                setShowSuccessModal(false);
                                navigation.navigate('Login');
                            }}
                        >
                            <Text style={[styles.modalButtonText, { color: colors.buttonText }]}>Ir al Inicio de Sesión</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
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
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    },
    emailText: {
        fontWeight: '600',
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 24,
    },
    otpInput: {
        width: 45,
        height: 55,
        borderRadius: 12,
        borderWidth: 2,
        textAlign: 'center',
        fontSize: 24,
        fontWeight: 'bold',
        marginHorizontal: 4,
    },
    otpInputFilled: {
    },
    otpInputError: {
    },
    input: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        fontSize: 16,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
    },
    errorText: {
        marginLeft: 8,
        fontSize: 14,
        flex: 1,
    },
    resetButton: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    resetButtonDisabled: {
        opacity: 0.7,
    },
    resetButtonText: {
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        width: '100%',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    modalIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    modalText: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    modalButton: {
        width: '100%',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    modalButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
});
