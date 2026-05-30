import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, Text } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage';
// Importa tus pantallas
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import VerificarEmailScreen from './src/screens/VerificarEmailScreen';
import Upload_renta from './src/screens/Upload_Renta';
import NavigationMenu from './src/screens/NavigationMenu';
import InmuebleScreen from './src/screens/InmuebleScreen';
import PaymentScreen from './src/screens/PaymentScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { NotificationProvider } from './src/context/NotificationContext';
import { AlertProvider } from './src/context/AlertContext';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Polyfill para fontFamily global (hack funcional en RN)
const oldTextRender = (Text as any).render;
if (oldTextRender) {
    (Text as any).render = function (...args: any[]) {
        const origin = oldTextRender.call(this, ...args);
        return React.cloneElement(origin, {
            style: [{ fontFamily: 'Inter_400Regular' }, origin.props.style],
        });
    };
}

const queryClient = new QueryClient();

// Crea el Stack
const Stack = createNativeStackNavigator();

function MainApp() {
    const [isLoading, setIsLoading] = useState(true);
    const [initialRoute, setInitialRoute] = useState<string>("Login");
    const [authParams, setAuthParams] = useState<any>(null);

    useEffect(() => {
        const checkToken = async () => {
            try {
                const token = await AsyncStorage.getItem('token');
                const userId = await AsyncStorage.getItem('userId');

                if (token && userId) {
                    console.log("[App] Sesión detectada, redirigiendo...");
                    setInitialRoute("Navigator");
                    setAuthParams({ token, userId });
                } else {
                    console.log("[App] No hay sesión activa.");
                }
            } catch (e) {
                console.error("[App] Error al verificar token:", e);
            } finally {
                setIsLoading(false);
            }
        };

        checkToken();
    }, []);

    const { colors } = useTheme();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.buttonMain} />
            </View>
        );
    }

    return (
        <NotificationProvider>
            <NavigationContainer>
                <Stack.Navigator 
                    initialRouteName={initialRoute}
                    screenOptions={{
                        headerStyle: { backgroundColor: colors.background },
                        headerTintColor: colors.textPrimary,
                        headerTitleStyle: { color: colors.textPrimary },
                    }}
                >
                    <Stack.Screen 
                        name="Navigator"
                        component={NavigationMenu}
                        initialParams={authParams}
                        options={{headerShown: false}}
                    />
                    <Stack.Screen
                        name="Login"
                        component={LoginScreen}
                        options={{ headerShown: false }} // Oculta la barra superior por defecto
                    />
                    <Stack.Screen
                        name="Register"
                        component={RegisterScreen}
                        options={{ title: 'Registro', headerShown: true }} // Muestra "Registro" en la barra superior
                    />
                    <Stack.Screen
                        name="VerificarEmail"
                        component={VerificarEmailScreen}
                        options={{ title: 'Verificar Correo', headerShown: true }}
                    />
                    <Stack.Screen 
                        name="Tu Primer Inmueble"
                        component={Upload_renta}
                        options={{ title: 'Tu Primer Inmueble', headerShown: false }}
                    />
                    <Stack.Screen 
                        name="PaymentScreen"
                        component={PaymentScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen 
                        name="InmuebleScreen"
                        component={InmuebleScreen}
                        options={{ presentation: 'modal', headerShown: false }}
                    />
                    <Stack.Screen
                        name="EditProfile"
                        component={EditProfileScreen}
                        options={{ title: 'Editar Perfil', headerShown: true }}
                    />
                    <Stack.Screen
                        name="ForgotPassword"
                        component={ForgotPasswordScreen}
                        options={{ headerShown: false }}
                    />
                    <Stack.Screen
                        name="ResetPassword"
                        component={ResetPasswordScreen}
                        options={{ headerShown: false }}
                    />
                </Stack.Navigator>
                <View style={{height: 50, backgroundColor: colors.background}}>
                </View>
            </NavigationContainer>
        </NotificationProvider>
    );
}

export default function App() {
    const [fontsLoaded] = useFonts({
        Inter_400Regular,
        Inter_500Medium,
        Inter_600SemiBold,
        Inter_700Bold,
        Inter_800ExtraBold,
    });

    if (!fontsLoaded) {
        return null; // o un SplashScreen
    }

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <AlertProvider>
                    <MainApp />
                </AlertProvider>
            </ThemeProvider>
        </QueryClientProvider>
    );
}
