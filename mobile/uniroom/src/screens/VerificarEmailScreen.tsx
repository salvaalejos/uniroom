import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const hostUri = Constants.expoConfig?.hostUri?.split(':').shift();
const API_BASE_URL = hostUri ? `http://${hostUri}:3000` : 'http://localhost:3000';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export default function VerificarEmailScreen({ navigation, route }: any) {
    const [routeEmail, setRouteEmail] = useState(route.params?.email || '');
    const [routePassword, setRoutePassword] = useState(route.params?.password || '');
    const fromLogin = route.params?.fromLogin || false;
    const [email, setEmail] = useState(route.params?.email || '');
    const [password, setPassword] = useState(route.params?.password || '');

    const [otp, setOtp] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [countdown, setCountdown] = useState(0);
    const [resending, setResending] = useState(false);
    
    const inputRefs = useRef<(TextInput | null)[]>([]);

    //CAMBIO EN LA OBTENCIÓN DE DATOS DEL SUSUARIO =====================================================================================
    // useEffect(() => {
    //     const loadPendingAuth = async () => {
    //         try {
    //             const stored = await AsyncStorage.getItem('pendingAuth');
    //             if (stored) {
    //                 const auth = JSON.parse(stored);
    //                 setEmail(auth.email || routeEmail);
    //                 setPassword(auth.password || routePassword);
    //             } else {
    //                 setEmail(routeEmail);
    //                 setPassword(routePassword);
    //             }
    //         } catch {
    //             setEmail(routeEmail);
    //             setPassword(routePassword);
    //         }
    //     };
    //     loadPendingAuth();
    // }, []);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    useEffect(() => {
        if (otp.length === OTP_LENGTH) {
            verifyCodeAndLogin();
        }
    }, [otp]);

    const getUserId = (payload: any) => {
        if (!payload || typeof payload !== 'object') return '';
        return payload.id_usuario ?? payload.usuario?.id_usuario ?? payload.user?.id_usuario ?? '';
    };

    const getUserName = (payload: any) => {
        if (!payload || typeof payload !== 'object') return '';
        return payload.nombre ?? payload.name ?? payload.usuario?.nombre ?? payload.user?.nombre ?? payload.user?.name ?? '';
    };

    const getUserRole = (payload: any) => {
        if (!payload || typeof payload !== 'object') return '';
        return payload.rol ?? payload.role ?? payload.usuario?.rol ?? payload.user?.rol ?? payload.user?.role ?? '';
    };

    const verifyCodeAndLogin = async () => {
        if (otp.length !== OTP_LENGTH) return;
        
        setIsLoading(true);
        setErrorMessage('');

        try {
            // 1. Verificar el código OTP
            const verifyResponse = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, codigo: otp })
            });

            const verifyPayload = await verifyResponse.json().catch(() => ({}));

            if (!verifyResponse.ok) {
                const apiError = verifyPayload?.error ?? 'Código inválido o expirado';
                throw new Error(apiError);
            }

            // 2. Login Invisible (obtenemos el JWT)
            const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const loginPayload = await loginResponse.json().catch(() => ({}));

            if (!loginResponse.ok) {
                throw new Error('Correo verificado. Por favor, ve a la pantalla de Iniciar Sesión.');
            }

            // 3. Extraer y guardar seguro
            const userId = getUserId(loginPayload);
            const token = loginPayload.token;

            if (!userId || !token) {
                throw new Error('Error al obtener los datos de acceso.');
            }

            // Guardamos el token y limpiamos basura
            await AsyncStorage.setItem('token', token);
            await AsyncStorage.setItem('userId', String(userId));
            await AsyncStorage.removeItem('pendingAuth'); 
            
            setPassword(''); // Limpiamos RAM

            // 4. ¡Adentro!
            navigation.replace('Navigator', { userId, token });

        } catch (error: any) {
            setErrorMessage(error?.message ?? 'Error en la verificación');
            setOtp('');
            inputRefs.current[0]?.focus();
        } finally {
            setIsLoading(false);
        }
    }

    const handleResend = async () => {
        if (countdown > 0 || resending) return;

        setResending(true);
        setErrorMessage('');

        try {
            const response = await fetch(`${API_BASE_URL}/auth/resend-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data?.error ?? 'Error al reenviar el código');
            }

            setCountdown(RESEND_COOLDOWN);
            Alert.alert('Código enviado', 'Se ha enviado un nuevo código a tu correo');

        } catch (error: any) {
            setErrorMessage(error?.message ?? 'Error al reenviar el código');
        } finally {
            setResending(false);
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

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'android' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.content}>
                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="mail-unread" size={48} color="#6366f1" />
                    </View>
                    <Text style={styles.title}>Verifica tu correo</Text>
                    <Text style={styles.subtitle}>
                        Te hemos enviado un código de 6 dígitos a{' '}
                        <Text style={styles.emailText}>{email}</Text>
                    </Text>
                </View>

                <View style={styles.otpContainer}>
                    {Array.from({ length: OTP_LENGTH }).map((_, index) => (
                        <TextInput
                            key={index}
                            ref={(ref) => (inputRefs.current[index] = ref)}
                            style={[
                                styles.otpInput,
                                otp[index] && styles.otpInputFilled,
                                errorMessage && styles.otpInputError,
                            ]}
                            keyboardType="number-pad"
                            maxLength={2}
                            value={otp[index] || ''}
                            onChangeText={(text) => handleChangeText(text, index)}
                            onFocus={() => {
                                if (otp.length < index) {
                                    const fillCount = index - otp.length;
                                    inputRefs.current[otp.length]?.focus();
                                }
                            }}
                            editable={!isLoading}
                            selectTextOnFocus
                        />
                    ))}
                </View>

                {errorMessage ? (
                    <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={20} color="#E74C3C" />
                        <Text style={styles.errorText}>{errorMessage}</Text>
                    </View>
                ) : null}

                <TouchableOpacity
                    style={[
                        styles.verifyButton,
                        (isLoading || otp.length !== OTP_LENGTH) && styles.verifyButtonDisabled,
                    ]}
                    onPress={verifyCodeAndLogin}
                    disabled={isLoading || otp.length !== OTP_LENGTH}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <Text style={styles.verifyButtonText}>Verificar código</Text>
                    )}
                </TouchableOpacity>

                <View style={styles.resendContainer}>
                    {countdown > 0 ? (
                        <Text style={styles.resendText}>
                            Esperar {formatTime(countdown)} para reenviar
                        </Text>
                    ) : (
                        <TouchableOpacity onPress={handleResend} disabled={resending}>
                            {resending ? (
                                <ActivityIndicator size="small" color="#6366f1" />
                            ) : (
                                <Text style={styles.resendLink}>Reenviar código</Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>

                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={20} color="#6366f1" />
                    <Text style={styles.backLink}>Volver</Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
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
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 24,
    },
    emailText: {
        color: '#6366f1',
        fontWeight: '600',
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 32,
    },
    otpInput: {
        width: 48,
        height: 56,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        textAlign: 'center',
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
        marginHorizontal: 4,
    },
    otpInputFilled: {
        borderColor: '#6366f1',
        backgroundColor: '#EEF2FF',
    },
    otpInputError: {
        borderColor: '#E74C3C',
        backgroundColor: '#FEF2F2',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        padding: 14,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    errorText: {
        color: '#E74C3C',
        marginLeft: 8,
        fontSize: 14,
        flex: 1,
    },
    verifyButton: {
        backgroundColor: '#6366f1',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    verifyButtonDisabled: {
        backgroundColor: '#9CA3AF',
    },
    verifyButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    resendContainer: {
        alignItems: 'center',
        marginTop: 24,
    },
    resendText: {
        color: '#9CA3AF',
        fontSize: 14,
    },
    resendLink: {
        color: '#6366f1',
        fontSize: 16,
        fontWeight: '600',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 32,
    },
    backLink: {
        color: '#6366f1',
        fontSize: 16,
        marginLeft: 8,
    },
});