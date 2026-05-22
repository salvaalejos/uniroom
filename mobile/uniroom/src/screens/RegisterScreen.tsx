/*
Aparentemente utilizando image-picker no me deja poner la foto xd, pero ahorita queda xd
ya quedo btw xd
*/
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
import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config';

export default function RegisterScreen({ navigation, route }: any) {
    // Estados para los campos de texto
    const userToEdit = route.params?.userToEdit;
    const [fullName, setFullName] = useState(userToEdit?.fullName || '');
    const [email, setEmail] = useState(userToEdit?.email || '');
    const [phone, setPhone] = useState(userToEdit?.phone || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Estado para el rol ('student' | 'landlord' | null)
    const [role, setRole] = useState<string | null>(userToEdit?.role || null);
    const [gender, setGenger] = useState<string | null>(userToEdit?.gender || null);
    const [selectedPic, setselectedPic] = useState(false)

    const [picture, setPicture] = useState(userToEdit?.picture || "");

    // Estado de carga
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const { colors, isDark } = useTheme();

    const getUserId = (payload: any) => {
    if (!payload || typeof payload !== 'object') return '';
    return payload.id_usuario ?? payload.usuario?.id_usuario ?? payload.user?.id_usuario ?? '';
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
                            quality: 1
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
                            quality: 1
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
    }

    const loginEndpoint = `${API_BASE_URL}/auth/login`

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

        // if (!picture) {
        //     setErrorMessage("Por favor, selecciona una foto de perfil")
        //     return
        // }

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


        const fullNameParts = fullName.trim().split(/\s+/).filter(Boolean);
        if (fullNameParts.length < 2) {
            setErrorMessage('Ingresa tu nombre y al menos un apellido');
            setIsLoading(false);
            return;
        }

        const [nombre, ...apellidosParts] = fullNameParts;
        const apellidos = apellidosParts.join(' ');
        const backendRole = role === 'student' ? 'ESTUDIANTE' : 'ARRENDADOR';
        
        let backendGender = 'OTRO';
        if (gender === 'man') backendGender = 'MASCULINO';
        else if (gender === 'woman') backendGender = 'FEMENINO';

        //Este form data es para enviar la foto y la info en un solo golpe xd
        const formData = new FormData();

        formData.append('email', email.trim());
        formData.append('password', password);
        formData.append('nombre', nombre);
        formData.append('apellidos', apellidos);
        formData.append('rol', backendRole);
        formData.append('numero_contacto', phone)
        formData.append('genero', backendGender);

        if (picture && picture.includes(':/')) {
        if (Platform.OS === 'web') {
        const response = await fetch(picture);
        const blob = await response.blob();
        const fileType = blob.type.split('/')[1] || 'jpg';
        formData.append('foto', blob, `profile_${Date.now()}.${fileType}`); 
        } else {
            const uriParts = picture.split('.');
            const fileType = uriParts[uriParts.length - 1];
            formData.append('foto', {
                uri: Platform.OS === 'android' ? picture : picture.replace('file://', ''),
                name: `profile_${Date.now()}.${fileType}`,
                type: `image/${fileType}`,
            } as any);
        }
        }

        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                // Elysia devuelve { summary, type, on, property } para errores de validación (422)
                let errorMsg = data?.error ?? data?.message ?? data?.summary;
                if (typeof errorMsg === 'object') errorMsg = JSON.stringify(errorMsg);
                throw new Error(errorMsg ?? 'No se pudo completar el registro');
            }

            // setSuccessMessage('¡Tu cuenta ha sido creada! Por favor verifica tu correo electrónico.');
            
            // navigation.navigate('VerificarEmail', 
            //     {email: email.trim(),
            //     password: password, // <-- Se lo pasamos directamente a la siguiente pantalla
            //     fromLogin: false}
            // );
            
            if (data.pendingVerification === false) {
                 Alert.alert("¡Éxito!", "Tu cuenta ha sido creada. Ahora puedes iniciar sesión.");
                 navigation.navigate('Login');
            } else {
                 navigation.navigate('VerificarEmail', {
                     email: email.trim(),
                     password: password,
                     fromLogin: false
                 });
            }

        } catch (error: any) {
            setErrorMessage(error?.message ?? 'Ocurrió un error de conexión');
        } finally {
            setIsLoading(false);
        }
    }
    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
            style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }]}>
                {/* Encabezado */}
                <View style={styles.title_container}>
                    <Text style={[styles.title, { color: colors.textPrimary }]}>Crea tu cuenta</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Únete a UniRoomie</Text>
                </View>
                <View style={styles.headerContainer}>
                    <Pressable onPress={selectPic} style={{justifyContent: "center", alignItems: "center"}}>
                        {picture ? (
                            /* Si hay foto, mostramos la imagen normal */
                            <Image
                                id='foto_de_perfil'
                                style={[styles.profile_picture, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}
                                source={{uri: picture}} 
                            />
                        ) : (
                            /* Si NO hay foto, mostramos un círculo con borde punteado y la cámara */
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

                {/* {successMessage ? (
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
                ) : null} */}

                {/* Formulario */}
                {!successMessage && (
                    <View style={styles.formContainer}>
                    <TextInput
                        style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.textPrimary }]}
                        placeholder="Nombre completo"
                        placeholderTextColor={colors.textSecondary}
                        autoCapitalize="words"
                        value={fullName}
                        onChangeText={setFullName}
                    />

                    <TextInput
                        style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.textPrimary }]}
                        placeholder="Correo electrónico"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={email}
                        onChangeText={setEmail}
                    />

                    <TextInput
                        style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.textPrimary }]}
                        placeholder="Número de teléfono"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={setPhone}
                    />

                    <TextInput
                        style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.textPrimary }]}
                        placeholder="Contraseña"
                        placeholderTextColor={colors.textSecondary}
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                    />

                    <TextInput
                        style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.textPrimary }]}
                        placeholder="Confirmar contraseña"
                        placeholderTextColor={colors.textSecondary}
                        secureTextEntry
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                    />

                    {/* Selección de Rol ---------------------------------------------------------------------------------*/}
                    <Text style={[styles.roleLabel, { color: colors.textPrimary }]}>¿Cómo usarás la app?</Text>
                    <View style={styles.roleContainer}>
                        {/* Botón Estudiante */}
                        <TouchableOpacity
                            style={[
                                styles.roleCard,
                                { backgroundColor: colors.cardBackground, borderColor: colors.border },
                                role === 'student' && [styles.roleCardActive, { borderColor: colors.accent, backgroundColor: isDark ? colors.backgroundSecondary : '#EBF5FB' }]
                            ]}
                            onPress={() => setRole('student')}
                            >
                            <Ionicons
                                name="school-outline"
                                size={32}
                                color={role === 'student' ? colors.accent : colors.textSecondary}
                            />
                            <Text style={[
                                styles.roleText,
                                { color: colors.textSecondary },
                                role === 'student' && [styles.roleTextActive, { color: colors.accent }]
                            ]}>Estudiante</Text>
                        </TouchableOpacity>

                        {/* Botón Arrendador */}
                        <TouchableOpacity
                            style={[
                                styles.roleCard,
                                { backgroundColor: colors.cardBackground, borderColor: colors.border },
                                role === 'landlord' && [styles.roleCardActive, { borderColor: colors.accent, backgroundColor: isDark ? colors.backgroundSecondary : '#EBF5FB' }]
                            ]}
                            onPress={() => setRole('landlord')}
                        >
                            <Ionicons
                                name="home-outline"
                                size={32}
                                color={role === 'landlord' ? colors.accent : colors.textSecondary}
                            />
                            <Text style={[
                                styles.roleText,
                                { color: colors.textSecondary },
                                role === 'landlord' && [styles.roleTextActive, { color: colors.accent }]
                            ]}>Arrendador</Text>
                        </TouchableOpacity>
                    </View>
                    {/* Selección de SEXO ---------------------------------------------------------------------------------*/}
                    <Text style={[styles.roleLabel, { color: colors.textPrimary }]}>¿Con qué género te identificas?</Text>
                    <View id='seleccion_de_genero' style={styles.roleContainer}>
                        <TouchableOpacity id='man_button'
                        style={[styles.genderCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }, gender === 'man' && [styles.genderCardActive, { borderColor: colors.accent, backgroundColor: isDark ? colors.backgroundSecondary : '#EBF5FB' }]]}
                        onPress={() => setGenger('man')}
                        >
                            <MaterialCommunityIcons 
                            name='human-male'
                            size={32}
                            color={gender === 'man' ? colors.accent : colors.textSecondary} />
                            <Text style={[
                                styles.roleText,
                                { color: colors.textSecondary },
                                gender === 'man' && [styles.roleTextActive, { color: colors.accent }]
                            ]}>Hombre</Text>
                        </TouchableOpacity>
                        <TouchableOpacity id='woman_button'
                        style={[styles.genderCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }, gender === 'woman' && [styles.genderCardActive, { borderColor: colors.accent, backgroundColor: isDark ? colors.backgroundSecondary : '#EBF5FB' }]]}
                        onPress={() => setGenger('woman')}>
                            <MaterialCommunityIcons 
                            name='human-female'
                            size={32}
                            color={gender === 'woman' ? colors.accent : colors.textSecondary} />
                            <Text style={[
                                styles.roleText,
                                { color: colors.textSecondary },
                                gender === 'woman' && [styles.roleTextActive, { color: colors.accent }]
                            ]}>Mujer</Text>
                        </TouchableOpacity>
                        <TouchableOpacity id='helicopter_button'
                        style={[styles.genderCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }, gender === 'non-binary' && [styles.genderCardActive, { borderColor: colors.accent, backgroundColor: isDark ? colors.backgroundSecondary : '#EBF5FB' }]]}
                        onPress={() => setGenger('non-binary')}>
                            <MaterialCommunityIcons 
                            name='human-non-binary'
                            size={32}
                            color={gender === 'non-binary' ? colors.accent : colors.textSecondary} />
                            <Text style={[
                                styles.roleText,
                                { color: colors.textSecondary },
                                gender === 'non-binary' && [styles.roleTextActive, { color: colors.accent }]
                            ]}>No Binario</Text>
                        </TouchableOpacity>
                    </View>
                    {/* Botón Continuar */}
                    <TouchableOpacity 
                        style={[styles.registerButton, { backgroundColor: colors.buttonMain }, isLoading && styles.registerButtonDisabled]} 
                        onPress={handleRegister}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color={colors.buttonText} />
                        ) : (
                            <Text style={[styles.registerButtonText, { color: colors.buttonText }]}>Continuar</Text>
                        )}
                    </TouchableOpacity>
                </View>
                )}

                {/* Footer */}
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
    errorStyle: {
        color: "#F02D07",
        padding: 8
    },
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    profile_placeholder: {
        height: 140,
        width: 140,
        borderRadius: 100,
        backgroundColor: '#EBF5FB', // Fondo azul clarito
        borderColor: '#3498DB',     // Borde azul
        borderWidth: 2,
        borderStyle: 'dashed',      // Borde punteado para indicar "zona para subir"
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
        marginTop: 40,
        marginBottom: 30,
        alignItems: "center"
        
    },
    container_titles: {
        alignItems: "flex-end",
        backgroundColor: "#fedcba"
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
        borderColor: '#DBDBDB',
        fontSize: 16,
        color: "#0F2C4F"
    },
    roleLabel: {
        fontSize: 16,
        fontWeight: 'bold',
         color: "#0F2C4F",
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
        borderColor: '#DBDBDB',
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
        backgroundColor: '#205EA6',
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
        padding:10
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
        padding: 20,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#DBDBDB',
        alignItems: 'center',
        marginHorizontal: 5,
    },
    genderCardActive: {
        borderColor: '#3498DB',
        backgroundColor: '#EBF5FB', // Un azul muy clarito de fondo
    },
    title_container: {
        marginTop: 20,
        alignItems: "center"

    }
});
