import React, { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
    StyleSheet, Text, View, TextInput, TouchableOpacity,
    KeyboardAvoidingView, Platform, ScrollView, Image, Pressable,
    ActivityIndicator, Alert, Modal, Linking
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { API_BASE_URL } from '../config';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function EditProfileScreen({ navigation, route }: any) {
    const userToEdit = route.params?.userData; // Data passed from ProfileScreen
    const token = route.params?.token;

    const [fullName, setFullName] = useState(userToEdit ? `${userToEdit.nombre} ${userToEdit.apellidos}` : '');
    const [phone, setPhone] = useState(userToEdit?.numero_contacto || '');
    const email = userToEdit?.email || ''; // Email is now a constant, not editable
    const [password, setPassword] = useState('');
    const [gender, setGender] = useState<string | null>(
        userToEdit?.genero === 'MASCULINO' ? 'man' : 
        userToEdit?.genero === 'FEMENINO' ? 'woman' : 
        userToEdit?.genero ? 'non-binary' : null
    );
    const [picture, setPicture] = useState(userToEdit?.foto ? `${API_BASE_URL}${userToEdit.foto}` : "");
    const [errorMessage, setErrorMessage] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState({ title: '', message: '', isEmailChange: false });
    const { colors, isDark } = useTheme();
    const [mpLinked, setMpLinked] = useState(!!userToEdit?.mp_vendedor_id);
    const [linkingMP, setLinkingMP] = useState(false);
    const queryClient = useQueryClient();

    const handleLinkMercadoPago = async () => {
        setLinkingMP(true);
        try {
            const response = await fetch(`${API_BASE_URL}/users/oauth/url`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.url) {
                await Linking.openURL(data.url);
            } else {
                Alert.alert('Error', 'No se pudo obtener la URL de vinculación.');
            }
        } catch (error) {
            Alert.alert('Error', 'No se pudo conectar con el servidor.');
        } finally {
            setLinkingMP(false);
        }
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
    };

    const handleUpdate = async () => {
        setErrorMessage('');
        
        // 1. Sanitización de entradas
        const cleanFullName = fullName.trim();
        const cleanPhone = phone.trim();
        const cleanPassword = password.trim();

        // 2. Validaciones de robustez
        if (!cleanFullName) {
            setErrorMessage('Por favor ingresa tu nombre completo');
            return;
        }

        const fullNameParts = cleanFullName.split(/\s+/).filter(Boolean);
        if (fullNameParts.length < 2) {
            setErrorMessage('Por favor ingresa al menos un nombre y un apellido');
            return;
        }

        if (!cleanPhone) {
            setErrorMessage('El número de teléfono es obligatorio');
            return;
        }

        // Validación de formato de teléfono (ejemplo: 10 dígitos)
        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(cleanPhone)) {
            setErrorMessage('El número de teléfono debe tener 10 dígitos numéricos');
            return;
        }

        if (cleanPassword && cleanPassword.length < 6) {
            setErrorMessage('La nueva contraseña debe tener al menos 6 caracteres');
            return;
        }

        setIsLoading(true);

        const nombre = fullNameParts[0];
        const apellidos = fullNameParts.slice(1).join(' ');

        let backendGender = 'OTRO';
        if (gender === 'man') backendGender = 'MASCULINO';
        else if (gender === 'woman') backendGender = 'FEMENINO';

        const formData = new FormData();
        formData.append('nombre', nombre);
        formData.append('apellidos', apellidos);
        formData.append('numero_contacto', cleanPhone);
        formData.append('genero', backendGender);
        
        if (cleanPassword !== '') {
            formData.append('password', cleanPassword);
        }

        if (picture && !picture.startsWith(API_BASE_URL)) {
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

        updateProfileMutation.mutate(formData);
    };

    const updateProfileMutation = useMutation({
        mutationFn: async (formData: FormData) => {
            const response = await fetch(`${API_BASE_URL}/users/${userToEdit.id_usuario}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                let errorMsg = data?.error ?? data?.message ?? data?.summary;
                if (typeof errorMsg === 'object') errorMsg = JSON.stringify(errorMsg);
                throw new Error(errorMsg ?? 'No se pudo actualizar el perfil');
            }
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['profile', userToEdit.id_usuario] });
            
            if (data.emailChanged) {
                setModalConfig({
                    title: "¡Correo Actualizado!",
                    message: "Has cambiado tu correo electrónico. Por seguridad, la sesión se cerrará y deberás verificar tu nuevo correo iniciando sesión nuevamente.",
                    isEmailChange: true
                });
                setModalVisible(true);
            } else {
                setModalConfig({
                    title: "¡Perfil Actualizado!",
                    message: "Tus datos se han guardado correctamente.",
                    isEmailChange: false
                });
                setModalVisible(true);
            }
        },
        onError: (error: any) => {
            setErrorMessage(error?.message ?? 'Ocurrió un error de conexión');
        }
    });

    const handleModalClose = async () => {
        setModalVisible(false);
        if (modalConfig.isEmailChange) {
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('userId');
            navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
            });
        } else {
            navigation.goBack();
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'android' ? 'padding' : 'height'} style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }]}>
                <View style={styles.title_container}>
                    <Text style={[styles.title, { color: colors.textPrimary }]}>Editar Perfil</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Actualiza tu información</Text>
                </View>

                <View style={styles.headerContainer}>
                    <Pressable onPress={selectPic} style={{justifyContent: "center", alignItems: "center"}}>
                        {picture ? (
                            <View style={styles.pictureContainer}>
                                <Image style={[styles.profile_picture, { borderColor: colors.border, backgroundColor: colors.cardBackground }]} source={{uri: picture}} />
                                <View style={styles.cameraOverlay}>
                                    <MaterialCommunityIcons name='camera' size={32} color='#FFF' />
                                </View>
                            </View>
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
                        placeholder="Número de teléfono"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={setPhone}
                    />

                    <TextInput
                        style={[styles.input, { backgroundColor: isDark ? colors.backgroundSecondary : '#F2F2F2', borderColor: colors.border, color: colors.textSecondary }]}
                        placeholder="Correo electrónico"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={email}
                        editable={false}
                    />

                    <TextInput
                        style={[styles.input, { backgroundColor: colors.cardBackground, borderColor: colors.border, color: colors.textPrimary }]}
                        placeholder="Nueva contraseña (opcional)"
                        placeholderTextColor={colors.textSecondary}
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                    />

                    <Text style={[styles.roleLabel, { color: colors.textPrimary }]}>¿Con qué género te identificas?</Text>
                    <View style={styles.roleContainer}>
                        <TouchableOpacity
                            style={[styles.genderCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }, gender === 'man' && [styles.genderCardActive, { borderColor: colors.accent, backgroundColor: isDark ? colors.backgroundSecondary : '#EBF5FB' }]]}
                            onPress={() => setGender('man')}
                        >
                            <MaterialCommunityIcons name='human-male' size={32} color={gender === 'man' ? colors.accent : colors.textSecondary} />
                            <Text style={[styles.roleText, { color: colors.textSecondary }, gender === 'man' && [styles.roleTextActive, { color: colors.accent }]]}>Hombre</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.genderCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }, gender === 'woman' && [styles.genderCardActive, { borderColor: colors.accent, backgroundColor: isDark ? colors.backgroundSecondary : '#EBF5FB' }]]}
                            onPress={() => setGender('woman')}
                        >
                            <MaterialCommunityIcons name='human-female' size={32} color={gender === 'woman' ? colors.accent : colors.textSecondary} />
                            <Text style={[styles.roleText, { color: colors.textSecondary }, gender === 'woman' && [styles.roleTextActive, { color: colors.accent }]]}>Mujer</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.genderCard, { backgroundColor: colors.cardBackground, borderColor: colors.border }, gender === 'non-binary' && [styles.genderCardActive, { borderColor: colors.accent, backgroundColor: isDark ? colors.backgroundSecondary : '#EBF5FB' }]]}
                            onPress={() => setGender('non-binary')}
                        >
                            <MaterialCommunityIcons name='human-non-binary' size={32} color={gender === 'non-binary' ? colors.accent : colors.textSecondary} />
                            <Text style={[styles.roleText, { color: colors.textSecondary }, gender === 'non-binary' && [styles.roleTextActive, { color: colors.accent }]]}>No Binario</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Sección de Mercado Pago (solo arrendadores) */}
                    {userToEdit?.rol === 'ARRENDADOR' && (
                        <View style={[styles.mpSection, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                            <View style={styles.mpHeader}>
                                <MaterialCommunityIcons name="credit-card-check-outline" size={24} color={mpLinked ? '#27AE60' : colors.textSecondary} />
                                <Text style={[styles.mpTitle, { color: colors.textPrimary }]}>Mercado Pago</Text>
                            </View>
                            {mpLinked ? (
                                <View style={styles.mpLinkedContainer}>
                                    <View style={[styles.mpStatusBadge, { backgroundColor: '#E8F5E9' }]}>
                                        <MaterialCommunityIcons name="check-circle" size={16} color="#27AE60" />
                                        <Text style={styles.mpStatusText}>Cuenta vinculada</Text>
                                    </View>
                                    <Text style={[styles.mpDescription, { color: colors.textSecondary }]}>Tu cuenta de Mercado Pago está conectada. Los pagos de renta llegarán directamente a tu saldo.</Text>
                                </View>
                            ) : (
                                <View>
                                    <Text style={[styles.mpDescription, { color: colors.textSecondary }]}>Vincula tu cuenta de Mercado Pago para recibir los pagos de tus inquilinos automáticamente.</Text>
                                    <TouchableOpacity
                                        style={[styles.mpLinkButton, linkingMP && { opacity: 0.7 }]}
                                        onPress={handleLinkMercadoPago}
                                        disabled={linkingMP}
                                    >
                                        {linkingMP ? (
                                            <ActivityIndicator color="#fff" />
                                        ) : (
                                            <>
                                                <MaterialCommunityIcons name="link-variant" size={20} color="#fff" />
                                                <Text style={styles.mpLinkButtonText}>Vincular Mercado Pago</Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    )}

                    <TouchableOpacity 
                        style={[styles.registerButton, { backgroundColor: colors.buttonMain }, updateProfileMutation.isPending && styles.registerButtonDisabled]} 
                        onPress={handleUpdate}
                        disabled={updateProfileMutation.isPending}
                    >
                        {updateProfileMutation.isPending ? (
                            <ActivityIndicator color={colors.buttonText} />
                        ) : (
                            <Text style={[styles.registerButtonText, { color: colors.buttonText }]}>Guardar Cambios</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <Modal transparent visible={modalVisible} animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                        <View style={[styles.modalIconContainer, { backgroundColor: modalConfig.isEmailChange ? '#FFF3E0' : '#E8F5E9' }]}>
                            <Ionicons 
                                name={modalConfig.isEmailChange ? 'mail-unread' : 'checkmark-circle'} 
                                size={44} 
                                color={modalConfig.isEmailChange ? '#F39C12' : '#2ecc71'} 
                            />
                        </View>
                        <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{modalConfig.title}</Text>
                        <Text style={[styles.modalMessage, { color: colors.textSecondary }]}>{modalConfig.message}</Text>
                        <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.buttonMain }]} onPress={handleModalClose}>
                            <Text style={styles.modalButtonText}>Entendido</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    scrollContent: { padding: 24, paddingBottom: 60, flexGrow: 1, justifyContent: 'center', backgroundColor: "#DCEEFF" },
    title_container: { marginTop: 20, alignItems: "center" },
    title: { fontSize: 32, fontWeight: 'bold', color: "#0F2C4F", padding: 0 },
    subtitle: { fontSize: 16, color: '#7F8C8D', marginTop: 5, padding: 5 },
    headerContainer: { marginTop: 40, marginBottom: 30, alignItems: "center" },
    profile_placeholder: {
        height: 140, width: 140, borderRadius: 100, backgroundColor: '#EBF5FB',
        borderColor: '#3498DB', borderWidth: 2, borderStyle: 'dashed',
        justifyContent: 'center', alignItems: 'center',
    },
    profile_picture: {
        backgroundColor: "#FFFFFF", height: 140, width: 140, borderRadius: 100,
        borderColor: "#DBDBDB", borderWidth: 2, padding: 5
    },
    pictureContainer: { position: 'relative', height: 140, width: 140, borderRadius: 100, overflow: 'hidden' },
    cameraOverlay: { 
        position: 'absolute', bottom: 0, left: 0, right: 0, 
        backgroundColor: 'rgba(0,0,0,0.5)', height: 40, 
        justifyContent: 'center', alignItems: 'center' 
    },
    addPhotoText: { color: '#3498DB', fontSize: 14, fontWeight: 'bold', marginTop: 5 },
    errorContainer: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#FDEDEC',
        padding: 16, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#FADBD8',
    },
    errorTextUI: { color: '#E74C3C', marginLeft: 8, fontSize: 15, flex: 1 },
    formContainer: { marginBottom: 20 },
    input: {
        backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 16,
        borderWidth: 1, borderColor: '#DBDBDB', fontSize: 16, color: "#0F2C4F"
    },
    roleLabel: {
        fontSize: 16, fontWeight: 'bold', color: "#0F2C4F", marginTop: 10,
        marginBottom: 15, textAlign: 'center',
    },
    roleContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
    genderCard: {
        flex: 1, backgroundColor: '#FFFFFF', padding: 20, borderRadius: 12,
        borderWidth: 2, borderColor: '#DBDBDB', alignItems: 'center', marginHorizontal: 5,
    },
    genderCardActive: { borderColor: '#3498DB', backgroundColor: '#EBF5FB' },
    roleText: { marginTop: 8, fontSize: 14, color: '#7F8C8D', fontWeight: '600', textAlign: 'center' },
    roleTextActive: { color: '#3498DB' },
    registerButton: { backgroundColor: '#205EA6', padding: 16, borderRadius: 12, alignItems: 'center' },
    registerButtonDisabled: { opacity: 0.7 },
    registerButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', padding: 25, borderRadius: 20, alignItems: 'center', borderWidth: 1, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5 },
    modalIconContainer: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
    modalMessage: { fontSize: 15, textAlign: 'center', marginBottom: 25, lineHeight: 22 },
    modalButton: { width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    modalButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
    mpSection: {
        borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 24,
    },
    mpHeader: {
        flexDirection: 'row', alignItems: 'center', marginBottom: 12,
    },
    mpTitle: {
        fontSize: 18, fontWeight: 'bold', marginLeft: 8,
    },
    mpLinkedContainer: {
    },
    mpStatusBadge: {
        flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 8,
    },
    mpStatusText: {
        fontSize: 13, fontWeight: '600', color: '#27AE60', marginLeft: 6,
    },
    mpDescription: {
        fontSize: 14, lineHeight: 20, marginBottom: 12,
    },
    mpLinkButton: {
        backgroundColor: '#009EE3', flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', padding: 14, borderRadius: 12,
    },
    mpLinkButtonText: {
        color: '#fff', fontWeight: 'bold', fontSize: 16, marginLeft: 8,
    },
});
