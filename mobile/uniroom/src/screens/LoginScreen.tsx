import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Image,
    ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import ThemeToggleButton from '../components/ThemeToggleButton';
import { API_BASE_URL } from '../config';
import { useMutation } from '@tanstack/react-query';
import { validarEmailCliente } from '../utils/validation';

type AuthenticatedUser = {
    name: string;
    role: string;
};

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
    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
    const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null>(null);
    const [isEmailFocused, setIsEmailFocused] = useState(false);
    const [isPasswordFocused, setIsPasswordFocused] = useState(false);

    const { colors, isDark } = useTheme();

    const loginEndpoint = useMemo(() => `${API_BASE_URL}/auth/login`, []);

    useEffect(() => {
        const checkSession = async () => {
            const token = await AsyncStorage.getItem('token');
            const userId = await AsyncStorage.getItem('userId');
            if (token && userId) {
                console.log("[LoginScreen] Sesión previa detectada, navegando...");
                navigation.replace("Navigator", { userId, token });
            }
        };
        checkSession();
    }, []);

    const validateFields = (): boolean => {
        const errors: { email?: string; password?: string } = {};
        const emailErr = validarEmailCliente(email);
        if (emailErr) {
            errors.email = emailErr;
        }

        if (!password) {
            errors.password = 'Ingresa tu contraseña';
        } else if (password.length < 6) {
            errors.password = 'La contraseña debe tener al menos 6 caracteres';
        } else if (password.length > 128) {
            errors.password = 'La contraseña no puede exceder los 128 caracteres';
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const loginMutation = useMutation({
        mutationFn: async () => {
            const cleanEmail = email.trim().toLowerCase();
            console.log("[Login] Intentando login en:", loginEndpoint);
            const response = await fetch(loginEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: cleanEmail, password })
            });

            console.log("[Login] Respuesta recibida con status:", response.status);
            const payload = await response.json().catch(() => ({}));

            if (payload?.needsVerification) {
                return { needsVerification: true, email: cleanEmail };
            }

            if (!response.ok) {
                console.log("[Login] Error en respuesta:", payload);
                const apiError = payload?.error ?? payload?.message ?? 'Credenciales incorrectas o problema para iniciar sesión.';
                const err: any = new Error(apiError);
                err.field = payload?.field;
                throw err;
            }

            const name = getUserName(payload);
            const role = getUserRole(payload);
            const userId = getUserId(payload);
            const token = payload.token;

            if (!name || !role || !userId || !token) {
                throw new Error('El backend no devolvió nombre, rol o token del usuario.');
            }

            await AsyncStorage.setItem('token', token);
            await AsyncStorage.setItem('userId', String(userId));
            await AsyncStorage.setItem('userName', `${name}`);
            await AsyncStorage.setItem('userRole', String(role));

            return { needsVerification: false, name, role, userId, token };
        },
        onSuccess: (data: any) => {
            if (data?.needsVerification) {
                navigation.navigate('VerificarEmail', {
                    email: data.email,
                    fromLogin: true,
                    password: password
                });
                return;
            }
            navigation.replace("Navigator", { userId: data.userId, token: data.token });
            setAuthenticatedUser({ name: data.name, role: data.role });
        },
        onError: (error: any) => {
            console.error("[Login] Error capturado:", error);
            const errorData = error?.message || '';
            const field = error?.field;

            if (errorData.includes('needsVerification') || errorData.includes('verificar')) {
                navigation.navigate('VerificarEmail', { 
                    email: email.trim().toLowerCase(),
                    fromLogin: true,
                    password: password
                });
                return;
            }

            if (field === 'email') {
                setFieldErrors(prev => ({ ...prev, email: errorData }));
            } else if (field === 'password') {
                setFieldErrors(prev => ({ ...prev, password: errorData }));
            } else if (field === 'credentials') {
                setFieldErrors({
                    email: 'Verifica tu correo electrónico',
                    password: 'O verifica tu contraseña'
                });
            }

            setAuthenticatedUser(null);
            setErrorMessage(errorData || 'Ocurrió un error de conexión.');
        }
    });

    const handleLogin = () => {
        setErrorMessage('');
        if (!validateFields()) {
            return;
        }
        loginMutation.mutate();
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.container, { backgroundColor: colors.background }]}
        >
            <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between' }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={styles.formContainer}>
                    <View style={styles.headerContainer}>
                        <Image 
                            source={isDark ? require('../../assets/dark-theme-logo.png') : require('../../assets/light-theme-logo.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <Text style={[styles.title, { color: colors.textPrimary }]}>UniRoomie</Text>
                        <Text style={[styles.slogan, { color: colors.textSecondary }]}>Sin preocuparse de donde vivir</Text>
                    </View>

                    {/* Campo Correo Electrónico */}
                    <View style={styles.fieldWrapper}>
                        <View style={[
                            styles.inputContainer,
                            {
                                backgroundColor: colors.cardBackground,
                                borderColor: fieldErrors.email
                                    ? colors.error
                                    : isEmailFocused
                                    ? colors.buttonMain
                                    : colors.border,
                                borderWidth: fieldErrors.email || isEmailFocused ? 1.5 : 1
                            }
                        ]}>
                            <TextInput
                                style={[styles.inputField, { color: colors.textPrimary }]}
                                placeholder="Correo electrónico"
                                placeholderTextColor={colors.textSecondary}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                maxLength={254}
                                value={email}
                                onChangeText={(text) => {
                                    setEmail(text);
                                    if (fieldErrors.email) {
                                        setFieldErrors(prev => ({ ...prev, email: undefined }));
                                    }
                                    if (errorMessage) setErrorMessage('');
                                }}
                                editable={!loginMutation.isPending}
                                onFocus={() => setIsEmailFocused(true)}
                                onBlur={() => {
                                    setIsEmailFocused(false);
                                    if (email.trim()) {
                                        const err = validarEmailCliente(email);
                                        if (err) setFieldErrors(prev => ({ ...prev, email: err }));
                                    }
                                }}
                            />
                            {fieldErrors.email && (
                                <View style={styles.eyeIconContainer}>
                                    <Ionicons name="alert-circle" size={20} color={colors.error} />
                                </View>
                            )}
                        </View>
                        {fieldErrors.email ? (
                            <View style={styles.fieldErrorRow}>
                                <Ionicons name="information-circle-outline" size={15} color={colors.error} />
                                <Text style={[styles.fieldErrorText, { color: colors.error }]}>{fieldErrors.email}</Text>
                            </View>
                        ) : null}
                    </View>

                    {/* Campo Contraseña */}
                    <View style={styles.fieldWrapper}>
                        <View style={[
                            styles.inputContainer, 
                            { 
                                backgroundColor: colors.cardBackground, 
                                borderColor: fieldErrors.password
                                    ? colors.error
                                    : isPasswordFocused
                                    ? colors.buttonMain
                                    : colors.border,
                                borderWidth: fieldErrors.password || isPasswordFocused ? 1.5 : 1
                            }
                        ]}>
                            <TextInput
                                style={[styles.inputField, { color: colors.textPrimary }]}
                                placeholderTextColor={colors.textSecondary}
                                placeholder="Contraseña"
                                secureTextEntry={!showPassword}
                                maxLength={128}
                                value={password}
                                onChangeText={(text) => {
                                    setPassword(text);
                                    if (fieldErrors.password) {
                                        setFieldErrors(prev => ({ ...prev, password: undefined }));
                                    }
                                    if (errorMessage) setErrorMessage('');
                                }}
                                editable={!loginMutation.isPending}
                                onFocus={() => setIsPasswordFocused(true)}
                                onBlur={() => {
                                    setIsPasswordFocused(false);
                                    if (password && password.length < 6) {
                                        setFieldErrors(prev => ({ ...prev, password: 'La contraseña debe tener al menos 6 caracteres' }));
                                    }
                                }}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIconContainer}>
                                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color={fieldErrors.password ? colors.error : colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        {fieldErrors.password ? (
                            <View style={styles.fieldErrorRow}>
                                <Ionicons name="information-circle-outline" size={15} color={colors.error} />
                                <Text style={[styles.fieldErrorText, { color: colors.error }]}>{fieldErrors.password}</Text>
                            </View>
                        ) : null}
                    </View>

                    <TouchableOpacity style={[styles.loginButton, { backgroundColor: colors.buttonMain }]} onPress={handleLogin} disabled={loginMutation.isPending}>
                        {loginMutation.isPending ? (
                            <ActivityIndicator color={colors.buttonText} />
                        ) : (
                            <Text style={[styles.loginButtonText, { color: colors.buttonText }]}>Iniciar sesión</Text>
                        )}
                    </TouchableOpacity>

                    {errorMessage ? (
                        <View style={[styles.errorContainer, { backgroundColor: colors.errorBackground, borderColor: colors.error }]}>
                            <Ionicons name="alert-circle" size={20} color={colors.error} />
                            <Text style={[styles.errorTextUI, { color: colors.error }]}>{errorMessage}</Text>
                        </View>
                    ) : null}

                    <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                        <Text style={[styles.forgotPasswordText, { color: colors.buttonMain }]}>¿Olvidaste tu contraseña?</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.footerContainer}>
                    <Text style={[styles.footerText, { color: colors.textSecondary }]}>¿Eres nuevo aquí? </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                        <Text style={[styles.registerText, { color: colors.buttonMain }]}>Regístrate</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
            <View style={styles.bottomRightButtonContainer}>
                <ThemeToggleButton />
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'space-between',
        padding: 24,
    },
    bottomRightButtonContainer: {
        position: 'absolute',
        bottom: 40,
        right: 24,
        zIndex: 10,
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 35,
    },
    logo: {
        width: 120,
        height: 120,
        marginBottom: 10,
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
    fieldWrapper: {
        marginBottom: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#DBDBDB',
    },
    inputField: {
        flex: 1,
        padding: 16,
        fontSize: 16,
        color: "#000000"
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
    fieldErrorText: {
        fontSize: 13,
        marginLeft: 5,
        flex: 1,
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
});
