/*
Aparentemente utilizando image-picker no me deja poner la foto xd, pero ahorita queda xd
ya quedo btw xd
*/
import React, {useState, useMemo } from 'react';
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
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Íconos incluidos en Expo por default
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';

const hostUri = Constants.expoConfig?.hostUri?.split(':').shift();

const API_BASE_URL = hostUri ? `http://${hostUri}:3000` : 'http://localhost:3000';;

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

    const [picture, setPicture] = useState(userToEdit?.picture || "../default_images/profile_photo.jpg");

    // Estado de carga
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const getUserId = (payload: any) => {
    if (!payload || typeof payload !== 'object') return '';
    return payload.id_usuario ?? payload.usuario?.id_usuario ?? payload.user?.id_usuario ?? '';
    };

    const selectPic = async () => {
        const revision_formal = await ImagePicker.requestMediaLibraryPermissionsAsync()
        let fotito = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4,4],
            quality: 1
        })
        if (!fotito.canceled){
            setPicture(fotito.assets[0].uri)
            console.log(picture)
        }
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

        if (!picture) {
            setErrorMessage("Por favor, selecciona una foto de perfil")
            return
        }

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

            setSuccessMessage('¡Tu cuenta ha sido creada correctamente! Ahora puedes iniciar sesión para acceder a tu cuenta.');
            //Hacer un pequeño login para pasar directamente al navigator, xd
            const responseLogin = await fetch(loginEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                email: email.trim(), 
                password: password 
            })
            });
            const payload = await responseLogin.json().catch(() => ({}));
            if (!responseLogin.ok) {
            throw new Error('Cuenta creada, pero no pudimos iniciar sesión, lo sentimos.');
            }
            const userId = getUserId(payload);
            const token = payload.token;
            if (userId && token) {
            navigation.replace("Navigator", { userId: userId, token: token });
            } else {
                throw new Error('Error al obtener los datos de acceso.');
            }
        } catch (error: any) {
            setErrorMessage(error?.message ?? 'Ocurrió un error de conexión');
        } finally {
            setIsLoading(false);
        }
    };
    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'android' ? 'padding' : 'height'}
            style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Encabezado */}
                <View style={styles.title_container}>
                    <Text style={styles.title}>Crea tu cuenta</Text>
                    <Text style={styles.subtitle}>Únete a UniR00M</Text>
                </View>
                <View style={styles.headerContainer}>
                    <Pressable onPress={selectPic} style={{justifyContent: "center", alignItems: "center"}}>
                        {!selectPic && <MaterialCommunityIcons name='camera'/>}
                        <Image
                            id='foto_de_perfil'
                            style={styles.profile_picture}
                            source={{uri: picture}} />
                    </Pressable>
                </View>

                {errorMessage ? (
                    <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={20} color="#E74C3C" />
                        <Text style={styles.errorTextUI}>{errorMessage}</Text>
                    </View>
                ) : null}

                {successMessage ? (
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
                ) : null}

                {/* Formulario */}
                {!successMessage && (
                    <View style={styles.formContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Nombre completo"
                        autoCapitalize="words"
                        value={fullName}
                        onChangeText={setFullName}
                    />

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
                        placeholder="Número de teléfono"
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={setPhone}
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Contraseña"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Confirmar contraseña"
                        secureTextEntry
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                    />

                    {/* Selección de Rol ---------------------------------------------------------------------------------*/}
                    <Text style={styles.roleLabel}>¿Cómo usarás la app?</Text>
                    <View style={styles.roleContainer}>
                        {/* Botón Estudiante */}
                        <TouchableOpacity
                            style={[
                                styles.roleCard,
                                role === 'student' && styles.roleCardActive
                            ]}
                            onPress={() => setRole('student')}
                            >
                            <Ionicons
                                name="school-outline"
                                size={32}
                                color={role === 'student' ? '#3498DB' : '#7F8C8D'}
                            />
                            <Text style={[
                                styles.roleText,
                                role === 'student' && styles.roleTextActive
                            ]}>Estudiante</Text>
                        </TouchableOpacity>

                        {/* Botón Arrendador */}
                        <TouchableOpacity
                            style={[
                                styles.roleCard,
                                role === 'landlord' && styles.roleCardActive
                            ]}
                            onPress={() => setRole('landlord')}
                        >
                            <Ionicons
                                name="home-outline"
                                size={32}
                                color={role === 'landlord' ? '#3498DB' : '#7F8C8D'}
                            />
                            <Text style={[
                                styles.roleText,
                                role === 'landlord' && styles.roleTextActive
                            ]}>Arrendador</Text>
                        </TouchableOpacity>
                    </View>
                    {/* Selección de SEXO ---------------------------------------------------------------------------------*/}
                    <Text style={styles.roleLabel}>¿Con qué género te identificas?</Text>
                    <View id='seleccion_de_genero' style={styles.roleContainer}>
                        <TouchableOpacity id='man_button'
                        style={[styles.genderCard, gender === 'man' && styles.genderCardActive]}
                        onPress={() => setGenger('man')}
                        >
                            <MaterialCommunityIcons 
                            name='human-male'
                            size={32}
                            color={gender === 'man' ? '#3498DB' : '#7F8C8D'} />
                            <Text style={[
                                styles.roleText,
                                gender === 'man' && styles.roleTextActive
                            ]}>Hombre</Text>
                        </TouchableOpacity>
                        <TouchableOpacity id='woman_button'
                        style={[styles.genderCard, gender === 'woman' && styles.genderCardActive]}
                        onPress={() => setGenger('woman')}>
                            <MaterialCommunityIcons 
                            name='human-female'
                            size={32}
                            color={gender === 'woman' ? '#3498DB' : '#7F8C8D'} />
                            <Text style={[
                                styles.roleText,
                                role === 'woman' && styles.roleTextActive
                            ]}>Mujer</Text>
                        </TouchableOpacity>
                        <TouchableOpacity id='helicopter_button'
                        style={[styles.genderCard, gender === 'non-binary' && styles.genderCardActive]}
                        onPress={() => setGenger('non-binary')}>
                            <MaterialCommunityIcons 
                            name='human-non-binary'
                            size={32}
                            color={gender === 'non-binary' ? '#3498DB' : '#7F8C8D'} />
                            <Text style={[
                                styles.roleText,
                                role === 'non-binary' && styles.roleTextActive
                            ]}>No Binario</Text>
                        </TouchableOpacity>
                    </View>
                    {/* Botón Continuar */}
                    <TouchableOpacity 
                        style={[styles.registerButton, isLoading && styles.registerButtonDisabled]} 
                        onPress={handleRegister}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.registerButtonText}>Continuar</Text>
                        )}
                    </TouchableOpacity>
                </View>
                )}

                {/* Footer */}
                <View style={styles.footerContainer}>
                    <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={styles.loginText}>Iniciar sesión</Text>
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
