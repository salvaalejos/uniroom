import React, { useState, useRef, useMemo } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Modal,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config';
import { validarPasswordCliente, evaluarPassword } from '../utils/validation';

const OTP_LENGTH = 6;

type ResetFieldErrors = {
    otp?: string;
    newPassword?: string;
    confirmPassword?: string;
};

export default function ResetPasswordScreen({ navigation, route }: any) {
    const email = (route.params?.email || '').trim().toLowerCase();
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [fieldErrors, setFieldErrors] = useState<ResetFieldErrors>({});
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    
    const { colors, isDark } = useTheme();
    const inputRefs = useRef<(TextInput | null)[]>([]);

    const passwordChecks = useMemo(() => evaluarPassword(newPassword), [newPassword]);

    const handleResetPassword = async () => {
        setErrorMessage('');
        const errors: ResetFieldErrors = {};

        if (otp.length !== OTP_LENGTH || !/^\d{6}$/.test(otp)) {
            errors.otp = 'Ingresa el código completo de 6 dígitos enviado a tu correo.';
        }

        const passErr = validarPasswordCliente(newPassword, { email });
        if (passErr) {
            errors.newPassword = passErr;
        }

        if (!confirmPassword) {
            errors.confirmPassword = 'Confirma tu nueva contraseña.';
        } else if (newPassword !== confirmPassword) {
            errors.confirmPassword = 'Las contraseñas no coinciden.';
        }

        setFieldErrors(errors);
        if (Object.keys(errors).length > 0) {
            return;
        }

        setIsLoading(true);

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
                const err: any = new Error(payload?.error ?? 'Error al restablecer la contraseña.');
                err.field = payload?.field;
                throw err;
            }

            setShowSuccessModal(true);
        } catch (error: any) {
            const msg = error?.message ?? 'Ocurrió un error de conexión.';
            const field = error?.field as keyof ResetFieldErrors | undefined;
            if (field) {
                setFieldErrors(prev => ({ ...prev, [field]: msg }));
            }
            setErrorMessage(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleChangeText = (text: string, index: number) => {
        const cleanText = text.replace(/[^0-9]/g, '');
        if (fieldErrors.otp) setFieldErrors(prev => ({ ...prev, otp: undefined }));
        if (errorMessage) setErrorMessage('');
        
        if (cleanText.length > 0) {
            const newOtp = otp + cleanText;
            setOtp(newOtp.slice(0, OTP_LENGTH));
            
            if (index < OTP_LENGTH - 1 && newOtp.length < OTP_LENGTH) {
                inputRefs.current[index + 1]?.focus();
            }
        }
    };

    const handleBackspace = (index: number) => {
        if (otp.length > 0 && index >= 0) {
            const newOtp = otp.slice(0, -1);
            setOtp(newOtp);
            if (index > 0) {
                inputRefs.current[index - 1]?.focus();
            }
        }
    };

    const renderCheckItem = (passed: boolean, label: string) => (
        <View style={styles.checkItemRow}>
            <Ionicons
                name={passed ? "checkmark-circle" : "ellipse-outline"}
                size={15}
                color={passed ? "#27AE60" : colors.textSecondary}
            />
            <Text style={[styles.checkItemText, { color: passed ? "#27AE60" : colors.textSecondary }]}>
                {label}
            </Text>
        </View>
    );

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'android' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: colors.background }]}
        >
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <View style={[styles.iconContainer, { backgroundColor: isDark ? colors.cardBackground : '#EEF2FF' }]}>
                        <Ionicons name="lock-closed-outline" size={48} color={colors.accent} />
                    </View>
                    <Text style={[styles.title, { color: colors.textPrimary }]}>Nueva contraseña</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Ingresa el código de 6 dígitos enviado a{' '}
                        <Text style={[styles.emailText, { color: colors.accent }]}>{email}</Text>
                    </Text>
                </View>

                <View style={styles.fieldWrapper}>
                    <View style={styles.otpContainer}>
                        {Array.from({ length: OTP_LENGTH }).map((_, index) => (
                            <TextInput
                                key={index}
                                ref={(ref) => (inputRefs.current[index] = ref)}
                                style={[
                                    styles.otpInput,
                                    { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.textPrimary },
                                    otp[index] && [styles.otpInputFilled, { borderColor: colors.accent, backgroundColor: isDark ? colors.backgroundSecondary : '#EEF2FF' }],
                                    fieldErrors.otp && [styles.otpInputError, { borderColor: colors.error, backgroundColor: colors.errorBackground }],
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
                    {fieldErrors.otp ? (
                        <View style={styles.fieldErrorRowCenter}>
                            <Ionicons name="alert-circle" size={15} color={colors.error} />
                            <Text style={[styles.fieldErrorText, { color: colors.error }]}>{fieldErrors.otp}</Text>
                        </View>
                    ) : null}
                </View>

                {/* Nueva Contraseña */}
                <View style={styles.fieldWrapper}>
                    <View style={[
                        styles.inputContainer,
                        {
                            backgroundColor: colors.cardBackground,
                            borderColor: fieldErrors.newPassword
                                ? colors.error
                                : focusedField === 'newPassword'
                                ? colors.buttonMain
                                : colors.border,
                            borderWidth: fieldErrors.newPassword || focusedField === 'newPassword' ? 1.5 : 1,
                        }
                    ]}>
                        <TextInput
                            style={[styles.inputField, { color: colors.textPrimary }]}
                            placeholder="Nueva contraseña segura"
                            placeholderTextColor={colors.textSecondary}
                            secureTextEntry={!showPassword}
                            maxLength={128}
                            value={newPassword}
                            onChangeText={(text) => {
                                setNewPassword(text);
                                if (fieldErrors.newPassword) setFieldErrors(prev => ({ ...prev, newPassword: undefined }));
                                if (errorMessage) setErrorMessage('');
                            }}
                            onFocus={() => setFocusedField('newPassword')}
                            onBlur={() => {
                                setFocusedField(null);
                                if (newPassword) {
                                    const err = validarPasswordCliente(newPassword, { email });
                                    if (err) setFieldErrors(prev => ({ ...prev, newPassword: err }));
                                }
                            }}
                            editable={!isLoading}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIconContainer}>
                            <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color={fieldErrors.newPassword ? colors.error : colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    {fieldErrors.newPassword ? (
                        <View style={styles.fieldErrorRow}>
                            <Ionicons name="alert-circle" size={15} color={colors.error} />
                            <Text style={[styles.fieldErrorText, { color: colors.error }]}>{fieldErrors.newPassword}</Text>
                        </View>
                    ) : null}

                    {(focusedField === 'newPassword' || newPassword.length > 0) && (
                        <View style={[styles.passwordChecklist, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                            <Text style={[styles.checklistTitle, { color: colors.textPrimary }]}>Requisitos de seguridad:</Text>
                            {renderCheckItem(passwordChecks.minLength, "Mínimo 8 caracteres")}
                            {renderCheckItem(passwordChecks.hasUppercase, "Al menos una letra mayúscula (A-Z)")}
                            {renderCheckItem(passwordChecks.hasLowercase, "Al menos una letra minúscula (a-z)")}
                            {renderCheckItem(passwordChecks.hasNumber, "Al menos un número (0-9)")}
                            {renderCheckItem(passwordChecks.hasSpecial, "Al menos un símbolo (!@#$%&*)")}
                        </View>
                    )}
                </View>

                {/* Confirmar Nueva Contraseña */}
                <View style={styles.fieldWrapper}>
                    <View style={[
                        styles.inputContainer,
                        {
                            backgroundColor: colors.cardBackground,
                            borderColor: fieldErrors.confirmPassword
                                ? colors.error
                                : focusedField === 'confirmPassword'
                                ? colors.buttonMain
                                : colors.border,
                            borderWidth: fieldErrors.confirmPassword || focusedField === 'confirmPassword' ? 1.5 : 1,
                        }
                    ]}>
                        <TextInput
                            style={[styles.inputField, { color: colors.textPrimary }]}
                            placeholder="Confirmar nueva contraseña"
                            placeholderTextColor={colors.textSecondary}
                            secureTextEntry={!showConfirmPassword}
                            maxLength={128}
                            value={confirmPassword}
                            onChangeText={(text) => {
                                setConfirmPassword(text);
                                if (fieldErrors.confirmPassword) setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }));
                                if (errorMessage) setErrorMessage('');
                            }}
                            onFocus={() => setFocusedField('confirmPassword')}
                            onBlur={() => {
                                setFocusedField(null);
                                if (confirmPassword && newPassword !== confirmPassword) {
                                    setFieldErrors(prev => ({ ...prev, confirmPassword: 'Las contraseñas no coinciden.' }));
                                }
                            }}
                            editable={!isLoading}
                        />
                        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIconContainer}>
                            <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={22} color={fieldErrors.confirmPassword ? colors.error : colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    {fieldErrors.confirmPassword ? (
                        <View style={styles.fieldErrorRow}>
                            <Ionicons name="alert-circle" size={15} color={colors.error} />
                            <Text style={[styles.fieldErrorText, { color: colors.error }]}>{fieldErrors.confirmPassword}</Text>
                        </View>
                    ) : null}
                </View>

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
                        isLoading && styles.resetButtonDisabled,
                    ]}
                    onPress={handleResetPassword}
                    disabled={isLoading}
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
            </ScrollView>

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
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
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
    fieldWrapper: {
        marginBottom: 18,
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    otpInput: {
        width: 44,
        height: 54,
        borderRadius: 12,
        borderWidth: 2,
        textAlign: 'center',
        fontSize: 22,
        fontWeight: 'bold',
        marginHorizontal: 4,
    },
    otpInputFilled: {},
    otpInputError: {},
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
    },
    inputField: {
        flex: 1,
        padding: 16,
        fontSize: 16,
    },
    eyeIconContainer: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        justifyContent: 'center',
    },
    fieldErrorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        paddingHorizontal: 4,
    },
    fieldErrorRowCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    fieldErrorText: {
        fontSize: 13,
        marginLeft: 5,
    },
    passwordChecklist: {
        marginTop: 8,
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
    },
    checklistTitle: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
    },
    checkItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 2,
    },
    checkItemText: {
        fontSize: 12,
        marginLeft: 6,
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
        marginTop: 28,
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
