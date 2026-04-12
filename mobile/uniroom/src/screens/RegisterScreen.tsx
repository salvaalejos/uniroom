/*
Aparentemente utilizando image-picker no me deja poner la foto xd, pero ahorita queda xd
ya quedo btw xd
*/
import React, {useState } from 'react';
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
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Íconos incluidos en Expo por default
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function RegisterScreen({ navigation }: any) {
    // Estados para los campos de texto
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Estado para el rol ('student' | 'landlord' | null)
    const [role, setRole] = useState<string | null>(null);
    const [gender, setGenger] = useState<string | null>(null);
    const [selectedPic, setselectedPic] = useState(false)

    const [picture, setPicture] = useState("../default_images/default_profile_pic.jpg")

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
    const handleRegister = () => {
        if (!role) {
            Alert.alert("Antes de continuar...", "Favor de seleccionar un rol")
            return;
        } else if (fullName === "" || email === "" || phone === "" || role === "" || picture === ""){
            Alert.alert("Antes de continuar...", "Favor de completar los datos restantes")
            return;
        }
        console.log('Registrando usuario:', { fullName, email, phone, role });
        if (role === "landlord"){
            navigation.navigate("Tu Primer Inmueble")
        } else {
            navigation.navigate("Navigator")
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
                {/* Formulario */}
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
                    <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
                        <Text style={styles.registerButtonText}>Continuar</Text>
                    </TouchableOpacity>
                </View>
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
        borderRadius: 10,
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