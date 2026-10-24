import React, { useState, useMemo } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Image,
    Pressable,
    ActivityIndicator,
    Alert
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config';
import { useMutation } from '@tanstack/react-query';
import {
    validarEmailCliente,
    validarNombreCompletoCliente,
    validarTelefonoCliente,
    validarPasswordCliente,
    evaluarPassword,
} from '../utils/validation';

type RegisterErrors = {
    fullName?: string;
    email?: string;
    phone?: string;
    password?: string;
    confirmPassword?: string;
    role?: string;
    gender?: string;
};

export default function RegisterScreen({ navigation, route }: any) {
    const userToEdit = route.params?.userToEdit;
    const [fullName, setFullName] = useState(userToEdit?.fullName || '');
    const [email, setEmail] = useState(userToEdit?.email || '');
    const [phone, setPhone] = useState(userToEdit?.phone || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [role, setRole] = useState<string | null>(userToEdit?.role || null);
    const [gender, setGenger] = useState<string | null>(userToEdit?.gender || null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [picture, setPicture] = useState(userToEdit?.picture || "");
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const [errorMessage, setErrorMessage] = useState('');
    const [fieldErrors, setFieldErrors] = useState<RegisterErrors>({});

    const { colors, isDark } = useTheme();

    const passwordChecks = useMemo(() => evaluarPassword(password), [password]);

    const clearFieldError = (field: keyof RegisterErrors) => {
        if (fieldErrors[field]) {
            setFieldErrors(prev => ({ ...prev, [field]: undefined }));
        }
        if (errorMessage) setErrorMessage('');
    };

    const selectPic = async () => {
        Alert.alert(
            "Foto de perfil",
            "¿De dónde quieres obtener la foto?",
            [
                {
                    text: "Cámara",
                    onPress: async () => {
                        const { status } = await ImagePicker.requestCameraPermissionsAsync();
                        if (status !== 'granted') {
                            Alert.alert("Permiso denegado", "Se necesita acceso a la cámara");
                            return;
                        }
                        let fotito = await ImagePicker.launchCameraAsync({
                            mediaTypes: ['images'],
                            allowsEditing: true,
                            aspect: [4, 4],
                            quality: 0.85
                        });
                        if (!fotito.canceled) {
                            setPicture(fotito.assets[0].uri);
                        }
                    }
                },
                {
                    text: "Galería",
                    onPress: async () => {
                        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (status !== 'granted') {
                            Alert.alert("Permiso denegado", "Se necesita acceso a la galería");
                            return;
                        }
                        let fotito = await ImagePicker.launchImageLibraryAsync({
                            mediaTypes: ['images'],
                            allowsEditing: true,
                            aspect: [4, 4],
                            quality: 0.85
                        });
                        if (!fotito.canceled) {
                            setPicture(fotito.assets[0].uri);
                        }
                    }
                },
                {
                    text: "Cancelar",
                    style: "cancel"
                }
            ]
        );
    };

    const registerMutation = useMutation({
        mutationFn: async (formData: FormData) => {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                let errorMsg = data?.error ?? data?.message ?? data?.summary;
                if (typeof errorMsg === 'object') errorMsg = JSON.stringify(errorMsg);
                const err: any = new Error(errorMsg ?? 'No se pudo completar el registro');
                err.field = data?.field;
                throw err;
            }

            return data;
        },
        onSuccess: (data) => {
            if (data.pendingVerification === false) {
                Alert.alert("¡Éxito!", "Tu cuenta ha sido creada. Ahora puedes iniciar sesión.");
                navigation.navigate('Login');
            } else {
                navigation.navigate('VerificarEmail', {
                    email: email.trim().toLowerCase(),
                    password: password,
                    fromLogin: false
                });
            }
        },
        onError: (error: any) => {
            const msg = error?.message ?? 'Ocurrió un error de conexión';
            const field = error?.field as keyof RegisterErrors | undefined;
            if (field) {
                setFieldErrors(prev => ({ ...prev, [field]: msg }));
            }
            setErrorMessage(msg);
        }
    });

    const validateAll = (): boolean => {
        const errors: RegisterErrors = {};

        const nameErr = validarNombreCompletoCliente(fullName);
        if (nameErr) errors.fullName = nameErr;

        const emailErr = validarEmailCliente(email);
        if (emailErr) errors.email = emailErr;

        const phoneErr = validarTelefonoCliente(phone);
        if (phoneErr) errors.phone = phoneErr;

        const passErr = validarPasswordCliente(password, { email, fullName });
        if (passErr) errors.password = passErr;

        if (!confirmPassword) {
            errors.confirmPassword = 'Confirma tu contraseña';
        } else if (password !== confirmPassword) {
            errors.confirmPassword = 'Las contraseñas no coinciden';
        }

        if (!role) {
            errors.role = 'Selecciona cómo usarás la aplicación (Estudiante o Arrendador)';
        }

        if (!gender) {
            errors.gender = 'Selecciona el género con el que te identificas';
        }

        setFieldErrors(errors);

        if (Object.keys(errors).length > 0) {
            setErrorMessage('Por favor corrige los campos marcados en rojo para continuar.');
            return false;
        }
        return true;
    };

    const handleRegister = async () => {
        setErrorMessage('');

        if (!validateAll()) {
            return;
        }

        const fullNameParts = fullName.trim().split(/\s+/).filter(Boolean);
        const [nombre, ...apellidosParts] = fullNameParts;
        const apellidos = apellidosParts.join(' ');
        const backendRole = role === 'student' ? 'ESTUDIANTE' : 'ARRENDADOR';
        
        let backendGender = 'OTRO';
        if (gender === 'man') backendGender = 'MASCULINO';
        else if (gender === 'woman') backendGender = 'FEMENINO';

        const formData = new FormData();
        formData.append('email', email.trim().toLowerCase());
        formData.append('password', password);
        formData.append('nombre', nombre);
        formData.append('apellidos', apellidos);
        formData.append('rol', backendRole);
        formData.append('numero_contacto', phone.trim());
        formData.append('genero', backendGender);

        if (picture && picture.includes(':/')) {
            if (Platform.OS === 'web') {
                const response = await fetch(picture);
                const blob = await response.blob();
                const fileType = blob.type.split('/')[1] || 'jpg';
                formData.append('foto', blob, `profile_${Date.now()}.${fileType}`); 
            } else {
                const uriParts = picture.split('.');
                const fileType = uriParts[uriParts.length - 1] || 'jpg';
                formData.append('foto', {
                    uri: Platform.OS === 'android' ? picture : picture.replace('file://', ''),
                    name: `profile_${Date.now()}.${fileType}`,
                    type: `image/${fileType === 'jpg' ? 'jpeg' : fileType}`,
                } as any);
            }
        }

        registerMutation.mutate(formData);
    };

    const renderFieldError = (err?: string) => {
        if (!err) return null;
        return (
            <View style={styles.fieldErrorRow}>
                <Ionicons name="alert-circle" size={15} color={colors.error} />
                <Text style={[styles.fieldErrorText, { color: colors.error }]}>{err}</Text>
            </View>
        );
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
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
            style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }]}>
                <View style={styles.title_container}>
                    <Text style={[styles.title, { color: colors.textPrimary }]}>Crea tu cuenta</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Únete a UniRoomie</Text>
                </View>

                <View style={styles.headerContainer}>
                    <Pressable onPress={selectPic} style={{justifyContent: "center", alignItems: "center"}}>
                        {picture ? (
                            <Image
                                id='foto_de_perfil'
                                style={[styles.profile_picture, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}
                                source={{uri: picture}} 
                            />
                        ) : (
                            <View style={[styles.profile_placeholder, { backgroundColor: isDark ? colors.cardBackground : '#EBF5FB', borderColor: colors.accent }]}>
                                <MaterialCommunityIcons name='camera-plus' size={40} color={colors.accent} />
                                <Text style={[styles.addPhotoText, { color: colors.accent }]}>Subir foto</Text>
                            </View>
                        )}
                    </Pressable>
                </View>

                {errorMessage ? (
                    <View style={[styles.errorContainer, { backgroundColor: colors.errorBackground, borderColor: colors.error }]}>
                        <Ionicons name="alert-circle" size={20} color={colors.error} />
                        <Text style={[styles.errorTextUI, { color: colors.error }]}>{errorMessage}</Text>
                    </View>
                ) : null}

                <View style={styles.formContainer}>
                    {/* Nombre Completo */}
                    <View style={styles.fieldWrapper}>
                        <View style={[
                            styles.inputContainer,
                            {
                                backgroundColor: colors.cardBackground,
                                borderColor: fieldErrors.fullName
                                    ? colors.error
                                    : focusedField === 'name'
                                    ? colors.buttonMain
                                    : colors.border,
                                borderWidth: fieldErrors.fullName || focusedField === 'name' ? 1.5 : 1
                            }
                        ]}>
                            <TextInput
                                style={[styles.inputField, { color: colors.textPrimary }]}
                                placeholder="Nombre completo (nombre y apellidos)"
                                placeholderTextColor={colors.textSecondary}
                                autoCapitalize="words"
                                maxLength={100}
                                value={fullName}
                                onChangeText={(text) => {
                                    setFullName(text);
                                    clearFieldError('fullName');
                                }}
                                onFocus={() => setFocusedField('name')}
                                onBlur={() => {
                                    setFocusedField(null);
                                    if (fullName.trim()) {
                                        const err = validarNombreCompletoCliente(fullName);
                                        if (err) setFieldErrors(prev => ({ ...prev, fullName: err }));
                                    }
                                }}
                            />
                            {fieldErrors.fullName && (
                                <View style={styles.eyeIconContainer}>
                                    <Ionicons name="alert-circle" size={20} color={colors.error} />
                                </View>
                            )}
                        </View>
                        {renderFieldError(fieldErrors.fullName)}
                    </View>

                    {/* Correo Electrónico */}
                    <View style={styles.fieldWrapper}>
                        <View style={[
                            styles.inputContainer,
                            {
                                backgroundColor: colors.cardBackground,
                                borderColor: fieldErrors.email
                                    ? colors.error
                                    : focusedField === 'email'
                                    ? colors.buttonMain
                                    : colors.border,
                                borderWidth: fieldErrors.email || focusedField === 'email' ? 1.5 : 1
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
                                    clearFieldError('email');
                                }}
                                onFocus={() => setFocusedField('email')}
                                onBlur={() => {
                                    setFocusedField(null);
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
                        {renderFieldError(fieldErrors.email)}
                    </View>

                    {/* Teléfono */}
                    <View style={styles.fieldWrapper}>
                        <View style={[
                            styles.inputContainer,
                            {
                                backgroundColor: colors.cardBackground,
                                borderColor: fieldErrors.phone
                                    ? colors.error
                                    : focusedField === 'phone'
                                    ? colors.buttonMain
                                    : colors.border,
                                borderWidth: fieldErrors.phone || focusedField === 'phone' ? 1.5 : 1
                            }
                        ]}>
                            <TextInput
                                style={[styles.inputField, { color: colors.textPrimary }]}
                                placeholder="Número de teléfono (10 dígitos)"
                                placeholderTextColor={colors.textSecondary}
                                keyboardType="number-pad"
                                maxLength={10}
                                value={phone}
                                onChangeText={(text) => {
                                    const onlyDigits = text.replace(/\D/g, '').slice(0, 10);
                                    setPhone(onlyDigits);
                                    clearFieldError('phone');
                                }}
                                onFocus={() => setFocusedField('phone')}
                                onBlur={() => {
                                    setFocusedField(null);
                                    if (phone.trim()) {
                                        const err = validarTelefonoCliente(phone);
                                        if (err) setFieldErrors(prev => ({ ...prev, phone: err }));
                                    }
                                }}
                            />
                            {fieldErrors.phone && (
                                <View style={styles.eyeIconContainer}>
                                    <Ionicons name="alert-circle" size={20} color={colors.error} />
                                </View>
                            )}
                        </View>
                        {renderFieldError(fieldErrors.phone)}
                    </View>

                    {/* Contraseña */}
                    <View style={styles.fieldWrapper}>
                        <View style={[
                            styles.inputContainer, 
                            { 
                                backgroundColor: colors.cardBackground, 
                                borderColor: fieldErrors.password
                                    ? colors.error
                                    : focusedField === 'password'
                                    ? colors.buttonMain
                                    : colors.border,
                                borderWidth: fieldErrors.password || focusedField === 'password' ? 1.5 : 1
                            }
                        ]}>
                            <TextInput
                                style={[styles.inputField, { color: colors.textPrimary }]}
                                placeholder="Contraseña segura"
                                placeholderTextColor={colors.textSecondary}
                                secureTextEntry={!showPassword}
                                maxLength={128}
                                value={password}
                                onChangeText={(text) => {
                                    setPassword(text);
                                    clearFieldError('password');
                                }}
                                onFocus={() => setFocusedField('password')}
                                onBlur={() => {
                                    setFocusedField(null);
                                    if (password) {
                                        const err = validarPasswordCliente(password, { email, fullName });
                                        if (err) setFieldErrors(prev => ({ ...prev, password: err }));
                                    }
                                }}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIconContainer}>
                                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} color={fieldErrors.password ? colors.error : colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        {renderFieldError(fieldErrors.password)}

                        {(focusedField === 'password' || password.length > 0) && (
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

                    {/* Confirmar Contraseña */}
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
                                borderWidth: fieldErrors.confirmPassword || focusedField === 'confirmPassword' ? 1.5 : 1
                            }
                        ]}>
                            <TextInput
                                style={[styles.inputField, { color: colors.textPrimary }]}
                                placeholder="Confirmar contraseña"
                                placeholderTextColor={colors.textSecondary}
                                secureTextEntry={!showConfirmPassword}
                                maxLength={128}
                                value={confirmPassword}
                                onChangeText={(text) => {
                                    setConfirmPassword(text);
                                    clearFieldError('confirmPassword');
                                }}
                                onFocus={() => setFocusedField('confirmPassword')}
                                onBlur={() => {
                                    setFocusedField(null);
                                    if (confirmPassword && password !== confirmPassword) {
                                        setFieldErrors(prev => ({ ...prev, confirmPassword: 'Las contraseñas no coinciden' }));
                                    }
                                }}
                            />
                            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIconContainer}>
                                <Ionicons name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} size={22} color={fieldErrors.confirmPassword ? colors.error : colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        {renderFieldError(fieldErrors.confirmPassword)}
                    </View>

                    {/* Selección de Rol */}
                    <View style={styles.fieldWrapper}>
                        <Text style={[styles.roleLabel, { color: colors.textPrimary }]}>¿Cómo usarás la app?</Text>
                        <View style={styles.roleContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.roleCard,
                                    { backgroundColor: colors.cardBackground, borderColor: fieldErrors.role ? colors.error : colors.border },
                                    role === 'student' && [styles.roleCardActive, { borderColor: colors.accent, backgroundColor: isDark ? colors.backgroundSecondary : '#EBF5FB' }]
                                ]}
                                onPress={() => {
                                    setRole('student');
                                    clearFieldError('role');
                                }}
                            >
                                <Ionicons
                                    name="school-outline"
                                    size={32}
                                    color={role === 'student' ? colors.accent : fieldErrors.role ? colors.error : colors.textSecondary}
                                />
                                <Text style={[
                                    styles.roleText,
                                    { color: colors.textSecondary },
                                    role === 'student' && [styles.roleTextActive, { color: colors.accent }]
                                ]}>Estudiante</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.roleCard,
                                    { backgroundColor: colors.cardBackground, borderColor: fieldErrors.role ? colors.error : colors.border },
                                    role === 'landlord' && [styles.roleCardActive, { borderColor: colors.accent, backgroundColor: isDark ? colors.backgroundSecondary : '#EBF5FB' }]
                                ]}
                                onPress={() => {
                                    setRole('landlord');
                                    clearFieldError('role');
                                }}
                            >
                                <Ionicons
                                    name="home-outline"
                                    size={32}
                                    color={role === 'landlord' ? colors.accent : fieldErrors.role ? colors.error : colors.textSecondary}
                                />
                                <Text style={[
                                    styles.roleText,
                                    { color: colors.textSecondary },
                                    role === 'landlord' && [styles.roleTextActive, { color: colors.accent }]
                                ]}>Arrendador</Text>
                            </TouchableOpacity>
                        </View>
                        {renderFieldError(fieldErrors.role)}
                    </View>

                    {/* Selección de Género */}
                    <View style={styles.fieldWrapper}>
                        <Text style={[styles.roleLabel, { color: colors.textPrimary }]}>¿Con qué género te identificas?</Text>
                        <View id='seleccion_de_genero' style={styles.roleContainer}>
                            <TouchableOpacity
                                id='man_button'
                                style={[
                                    styles.genderCard,
                                    { backgroundColor: colors.cardBackground, borderColor: fieldErrors.gender ? colors.error : colors.border },
                                    gender === 'man' && [styles.genderCardActive, { borderColor: colors.accent, backgroundColor: isDark ? colors.backgroundSecondary : '#EBF5FB' }]
                                ]}
                                onPress={() => {
                                    setGenger('man');
                                    clearFieldError('gender');
                                }}
                            >
                                <MaterialCommunityIcons 
                                    name='human-male'
                                    size={32}
                                    color={gender === 'man' ? colors.accent : fieldErrors.gender ? colors.error : colors.textSecondary}
                                />
                                <Text 
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    style={[
                                        styles.genderText,
                                        { color: colors.textSecondary },
                                        gender === 'man' && [styles.genderTextActive, { color: colors.accent }]
                                    ]}
                                >Hombre</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                id='woman_button'
                                style={[
                                    styles.genderCard,
                                    { backgroundColor: colors.cardBackground, borderColor: fieldErrors.gender ? colors.error : colors.border },
                                    gender === 'woman' && [styles.genderCardActive, { borderColor: colors.accent, backgroundColor: isDark ? colors.backgroundSecondary : '#EBF5FB' }]
                                ]}
                                onPress={() => {
                                    setGenger('woman');
                                    clearFieldError('gender');
                                }}
                            >
                                <MaterialCommunityIcons 
                                    name='human-female'
                                    size={32}
                                    color={gender === 'woman' ? colors.accent : fieldErrors.gender ? colors.error : colors.textSecondary}
                                />
                                <Text 
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    style={[
                                        styles.genderText,
                                        { color: colors.textSecondary },
                                        gender === 'woman' && [styles.genderTextActive, { color: colors.accent }]
                                    ]}
                                >Mujer</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                id='helicopter_button'
                                style={[
                                    styles.genderCard,
                                    { backgroundColor: colors.cardBackground, borderColor: fieldErrors.gender ? colors.error : colors.border },
                                    gender === 'non-binary' && [styles.genderCardActive, { borderColor: colors.accent, backgroundColor: isDark ? colors.backgroundSecondary : '#EBF5FB' }]
                                ]}
                                onPress={() => {
                                    setGenger('non-binary');
                                    clearFieldError('gender');
                                }}
                            >
                                <MaterialCommunityIcons 
                                    name='human-non-binary'
                                    size={32}
                                    color={gender === 'non-binary' ? colors.accent : fieldErrors.gender ? colors.error : colors.textSecondary}
                                />
                                <Text 
                                    numberOfLines={1}
                                    adjustsFontSizeToFit
                                    style={[
                                        styles.genderText,
                                        { color: colors.textSecondary },
                                        gender === 'non-binary' && [styles.genderTextActive, { color: colors.accent }]
                                    ]}
                                >No Binario</Text>
                            </TouchableOpacity>
                        </View>
                        {renderFieldError(fieldErrors.gender)}
                    </View>

                    {/* Botón Continuar */}
                    <TouchableOpacity 
                        style={[styles.registerButton, { backgroundColor: colors.buttonMain }, registerMutation.isPending && styles.registerButtonDisabled]} 
                        onPress={handleRegister}
                        disabled={registerMutation.isPending}
                    >
                        {registerMutation.isPending ? (
                            <ActivityIndicator color={colors.buttonText} />
                        ) : (
                            <Text style={[styles.registerButtonText, { color: colors.buttonText }]}>Continuar</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.footerContainer}>
                    <Text style={[styles.footerText, { color: colors.textSecondary }]}>¿Ya tienes cuenta? </Text>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={[styles.loginText, { color: colors.buttonMain }]}>Iniciar sesión</Text>
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
    profile_placeholder: {
        height: 140,
        width: 140,
        borderRadius: 100,
        backgroundColor: '#EBF5FB',
        borderColor: '#3498DB',
        borderWidth: 2,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addPhotoText: {
        color: '#3498DB',
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 5,
    },
    profile_picture: {
        backgroundColor: "#FFFFFF",
        height: 140,
        width: 140,
        borderRadius: 100,
        borderColor: "#DBDBDB",
        borderWidth: 2,
        padding: 5
    },
    scrollContent: {
        padding: 24,
        flexGrow: 1,
        justifyContent: 'center',
        backgroundColor: "#DCEEFF"
    },
    headerContainer: {
        marginTop: 30,
        marginBottom: 24,
        alignItems: "center"
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: "#0F2C4F",
        padding: 0
    },
    subtitle: {
        fontSize: 16,
        color: '#7F8C8D',
        marginTop: 5,
        padding: 5
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
    formContainer: {
        marginBottom: 20,
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
        color: "#0F2C4F"
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
    roleLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: "#0F2C4F",
        marginTop: 6,
        marginBottom: 12,
        textAlign: 'center',
    },
    roleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    roleCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#DBDBDB',
        alignItems: 'center',
        marginHorizontal: 5,
    },
    roleCardActive: {
        borderColor: '#3498DB',
        backgroundColor: '#EBF5FB',
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
        backgroundColor: '#205EA6',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
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
        padding: 10
    },
    footerText: {
        color: '#7F8C8D',
        fontSize: 15,
    },
    loginText: {
        color: '#205EA6',
        fontSize: 15,
        fontWeight: 'bold',
    },
    genderCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        paddingVertical: 14,
        paddingHorizontal: 8,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#DBDBDB',
        alignItems: 'center',
        marginHorizontal: 5,
        justifyContent: 'center',
    },
    genderCardActive: {
        borderColor: '#3498DB',
        backgroundColor: '#EBF5FB',
    },
    genderText: {
        marginTop: 8,
        fontSize: 13,
        color: '#7F8C8D',
        fontWeight: '600',
        textAlign: 'center',
    },
    genderTextActive: {
        color: '#3498DB',
    },
    title_container: {
        marginTop: 20,
        alignItems: "center"
    }
});
