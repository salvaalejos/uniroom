import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    Image,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Alert,
    ActivityIndicator,
    TextInput,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';

const hostUri = Constants.expoConfig?.hostUri?.split(':').shift();
const API_BASE_URL = hostUri ? `http://${hostUri}:3000` : 'http://localhost:3000';

export default function EditProfileScreen({ navigation, route }: any) {
    const { userId, token, userData } = route.params;

    const nombreCompleto = `${userData.nombre || ''} ${userData.apellidos || ''}`.trim();
    const [fullName, setFullName] = useState(nombreCompleto);
    const [email] = useState(userData.email || '');
    const [phone, setPhone] = useState(userData.numero_contacto || '');
    const [gender, setGender] = useState(
        userData.genero === 'MASCULINO' ? 'man' :
        userData.genero === 'FEMENINO' ? 'woman' : 'non-binary'
    );
    const [picture, setPicture] = useState(
        userData.foto ? `${API_BASE_URL}${userData.foto}` : ''
    );
    const [photoChanged, setPhotoChanged] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const selectPic = async () => {
        const revision = await ImagePicker.requestMediaLibraryPermissionsAsync();
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 4],
            quality: 1,
        });
        if (!result.canceled) {
            setPicture(result.assets[0].uri);
            setPhotoChanged(true);
        }
    };

    const handleSave = async () => {
        const fullNameParts = fullName.trim().split(/\s+/).filter(Boolean);
        if (fullNameParts.length < 2) {
            Alert.alert('Error', 'Ingresa tu nombre y al menos un apellido');
            return;
        }

        const [nombre, ...apellidosParts] = fullNameParts;
        const apellidos = apellidosParts.join(' ');

        let backendGender = 'OTRO';
        if (gender === 'man') backendGender = 'MASCULINO';
        else if (gender === 'woman') backendGender = 'FEMENINO';

        setIsLoading(true);

        try {
            let fotoPath = userData.foto;

            if (photoChanged && picture && picture.includes(':')) {
                const formData = new FormData();
                const uriParts = picture.split('.');
                const fileType = uriParts[uriParts.length - 1];

                formData.append('foto', {
                    uri: Platform.OS === 'android' ? picture : picture.replace('file://', ''),
                    name: `profile_${Date.now()}.${fileType}`,
                    type: `image/${fileType}`,
                } as any);

                const uploadResponse = await fetch(`${API_BASE_URL}/users/${userId}/upload-foto`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                    body: formData,
                });

                const uploadText = await uploadResponse.text();
                console.log('Upload response status:', uploadResponse.status);
                console.log('Upload response body:', uploadText);

                if (uploadResponse.ok) {
                    const uploadData = JSON.parse(uploadText);
                    fotoPath = uploadData.foto;
                } else {
                    try {
                        const errData = JSON.parse(uploadText);
                        Alert.alert('Error al subir foto', errData.error || 'Error desconocido');
                    } catch {
                        Alert.alert('Error al subir foto', uploadText);
                    }
                    setIsLoading(false);
                    return;
                }
            }

            const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    nombre,
                    apellidos,
                    numero_contacto: phone,
                    genero: backendGender,
                    foto: fotoPath,
                }),
            });

            const responseText = await response.text();
            console.log('Update response status:', response.status);
            console.log('Update response body:', responseText);

            if (response.ok) {
                Alert.alert('Éxito', 'Perfil actualizado correctamente', [
                    { text: 'OK', onPress: () => navigation.goBack() },
                ]);
            } else {
                try {
                    const data = JSON.parse(responseText);
                    Alert.alert('Error', data.error || 'No se pudo actualizar el perfil');
                } catch {
                    Alert.alert('Error', responseText);
                }
            }
        } catch (error: any) {
            console.error('Error al actualizar perfil:', error);
            Alert.alert('Error', 'Error de conexión. Revisa tu red.');
        } finally {
            setIsLoading(false);
        }
    };

    const imagenPerfil = picture ? { uri: picture } : require('../default_images/profile_photo.jpg');

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Editar Perfil</Text>
                    </View>

                    <View style={styles.photoSection}>
                        <Image source={imagenPerfil} style={styles.profilePic} />
                        <TouchableOpacity style={styles.changePhotoBtn} onPress={selectPic}>
                            <Ionicons name="camera" size={18} color="#FFFFFF" />
                            <Text style={styles.changePhotoText}>Cambiar foto</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.inputLabel}>Nombre completo</Text>
                        <TextInput
                            style={styles.input}
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder="Nombre y apellidos"
                            placeholderTextColor="#abcdef"
                            autoCapitalize="words"
                        />

                        <Text style={styles.inputLabel}>Correo electrónico</Text>
                        <View style={styles.readOnlyInput}>
                            <Text style={styles.readOnlyText}>{email}</Text>
                        </View>

                        <Text style={styles.inputLabel}>Teléfono</Text>
                        <TextInput
                            style={styles.input}
                            value={phone}
                            onChangeText={setPhone}
                            placeholder="Número de teléfono"
                            placeholderTextColor="#abcdef"
                            keyboardType="phone-pad"
                        />

                        <Text style={styles.inputLabel}>Género</Text>
                        <View style={styles.genderContainer}>
                            <TouchableOpacity
                                style={[styles.genderCard, gender === 'man' && styles.genderCardActive]}
                                onPress={() => setGender('man')}
                            >
                                <MaterialCommunityIcons
                                    name="human-male"
                                    size={28}
                                    color={gender === 'man' ? '#3498DB' : '#7F8C8D'}
                                />
                                <Text style={[styles.genderText, gender === 'man' && styles.genderTextActive]}>Hombre</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.genderCard, gender === 'woman' && styles.genderCardActive]}
                                onPress={() => setGender('woman')}
                            >
                                <MaterialCommunityIcons
                                    name="human-female"
                                    size={28}
                                    color={gender === 'woman' ? '#3498DB' : '#7F8C8D'}
                                />
                                <Text style={[styles.genderText, gender === 'woman' && styles.genderTextActive]}>Mujer</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.genderCard, gender === 'non-binary' && styles.genderCardActive]}
                                onPress={() => setGender('non-binary')}
                            >
                                <MaterialCommunityIcons
                                    name="human-non-binary"
                                    size={28}
                                    color={gender === 'non-binary' ? '#3498DB' : '#7F8C8D'}
                                />
                                <Text style={[styles.genderText, gender === 'non-binary' && styles.genderTextActive]}>No Binario</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <>
                                <MaterialCommunityIcons name="content-save" size={22} color="#FFFFFF" />
                                <Text style={styles.saveButtonText}>Guardar cambios</Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#DCEEFF',
    },
    scrollContent: {
        padding: 20,
        alignItems: 'center',
    },
    header: {
        width: '100%',
        marginBottom: 20,
        marginTop: 40,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#0F2C4F',
    },
    photoSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    profilePic: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: '#FFFFFF',
        marginBottom: 15,
    },
    changePhotoBtn: {
        flexDirection: 'row',
        backgroundColor: '#205EA6',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        alignItems: 'center',
    },
    changePhotoText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
    },
    card: {
        backgroundColor: '#FFFFFF',
        width: '100%',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        marginBottom: 30,
    },
    inputLabel: {
        fontSize: 12,
        color: '#7F8C8D',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 6,
        marginTop: 12,
    },
    input: {
        backgroundColor: '#F5F7FA',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#DBDBDB',
        fontSize: 16,
        color: '#0F2C4F',
    },
    readOnlyInput: {
        backgroundColor: '#EBF5FB',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#D6EAF8',
    },
    readOnlyText: {
        fontSize: 16,
        color: '#7F8C8D',
        fontStyle: 'italic',
    },
    genderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
        marginBottom: 8,
    },
    genderCard: {
        flex: 1,
        backgroundColor: '#F5F7FA',
        padding: 12,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#DBDBDB',
        alignItems: 'center',
        marginHorizontal: 4,
    },
    genderCardActive: {
        borderColor: '#3498DB',
        backgroundColor: '#EBF5FB',
    },
    genderText: {
        marginTop: 6,
        fontSize: 13,
        color: '#7F8C8D',
        fontWeight: '600',
    },
    genderTextActive: {
        color: '#3498DB',
    },
    saveButton: {
        backgroundColor: '#205EA6',
        flexDirection: 'row',
        width: '100%',
        padding: 16,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    cancelButton: {
        width: '100%',
        padding: 16,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 80,
        borderWidth: 2,
        borderColor: '#205EA6',
    },
    cancelButtonText: {
        color: '#205EA6',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
