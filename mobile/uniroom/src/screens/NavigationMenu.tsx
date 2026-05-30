import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Platform } from "react-native"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { useNavigationState } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react"
import { NavigationContainer } from '@react-navigation/native';
import MapScreen from "./MapScreen"
import MapRouteScreen from "./MapRouteScreen"
import CalendarScreen from "./CalendarScreen"
import { ComponentType } from "react"
import HomeScreen from './HomeScreen'
import Themes from "./Themes"
import ProfileScreen from "./ProfileScreen"
import EditProfileScreen from "./EditProfileScreen"
import { useTheme } from "../context/ThemeContext"
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import NotificationScreen from "./NotificationScreen";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNotifications } from "../context/NotificationContext";
import { useIsFocused } from "@react-navigation/native"
import * as Animatable from "react-native-animatable"
import { Text } from "react-native" // Import Text if missing or used in TabButton
import Settings from "./Settings"
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createStackNavigator } from "@react-navigation/stack"
import AsyncStorage from "@react-native-async-storage/async-storage";
// agendar cita de vivienda
import AgendarCita from "./AgendarCita";
// Para crear inmuebles sjkfhdsf
import MisInmuebles from "./MisInmuebles"
import Upload_Renta from "./Upload_Renta"
import HousingMapScreen from "./HousingMapScreen";
import HistorialPagosArrendador from "./HistorialPagosArrendador";
import { API_BASE_URL } from '../config';

const InmuebleStack = createStackNavigator()

const InmuebleStackScreen = () => {
    return (
        <InmuebleStack.Navigator screenOptions={{ headerShown: false }}>
            <InmuebleStack.Screen name="MisInmuebles" component={MisInmuebles} />
            <InmuebleStack.Screen name="SubirInmueble" component={Upload_Renta} />
        </InmuebleStack.Navigator>
    )
}

// hay un desmadre dnfdjf xdxdxd

const CitaStack = createStackNavigator()

const CitaStackScreen = ({ route }: any) => {
    const userId = route.params?.userId;
    const token = route.params?.token;
    return (
        <CitaStack.Navigator screenOptions={{ headerShown: false }}>
            <CitaStack.Screen name="MapScreen" component={MapScreen} initialParams={{ userId, token }} />
            <CitaStack.Screen name="AgendarCita" component={AgendarCita} initialParams={{ userId, token }}/>
        </CitaStack.Navigator>
    )
}

const Stack = createNativeStackNavigator()

const Profile_Menu = ({ route }: any) => {
    const userId = route.params?.userId;
    const token = route.params?.token;
    const { colors } = useTheme();
    return (
            <Stack.Navigator initialRouteName="ProfileScreen"
            screenOptions={{
                headerShown: false,
                headerStyle: { backgroundColor: colors.background },
                headerTintColor: colors.textPrimary,
            }}>
                <Stack.Screen
                name="ProfileScreen"
                component={ProfileScreen}
                initialParams={{ userId: userId, token: token }}
                options={{
                    title: "Mi Perfil"
                }}
                >
                </Stack.Screen>
                <Stack.Screen
                name="Themes"
                component={Themes}
                options={{presentation: "modal", title: "Temas", headerShown: true, headerLeft: () => null}}>
                </Stack.Screen>
                <Stack.Screen
                name="Profile_Info"
                component={ProfileScreen}
                options={{presentation: "modal", title: "Tus Datos", headerShown: true}}>

                </Stack.Screen>
                <Stack.Screen
                name="EditProfile"
                component={EditProfileScreen}
                options={{presentation: "modal", title: "Editar Perfil", headerShown: true}}>
                </Stack.Screen>
                <Stack.Screen
                name="HistorialPagosArrendador"
                component={HistorialPagosArrendador}
                options={{presentation: "modal", title: "Historial de Ingresos", headerShown: false}}>
                </Stack.Screen>
            </Stack.Navigator>
        )
}

const StudentTabs = [
    {route : 'Inmuebles', label: 'Inmuebles', activeIcon: "map-search", inActiveIcon: "map-search-outline", component: CitaStackScreen},
    {route : 'Rutas Cercanas', label: 'Rutas Cercanas', activeIcon: "car", inActiveIcon: "car-outline", component: MapRouteScreen},
    {route : 'Tu inmueble', label: 'Tu inmueble', activeIcon: "home", inActiveIcon: "home-outline", component: HomeScreen},
    {route : 'Notificaciones', label: 'Notificaciones', activeIcon: 'bell', inActiveIcon: "bell-outline", component: NotificationScreen},
    {route : 'ProfileTab', label: 'Tu Perfil', activeIcon: "account", inActiveIcon: "account-outline", component: Profile_Menu}
]

const LandlordTabs = [
    {route : 'MisInmuebles', label: 'Mis Inmuebles', activeIcon: "home-city", inActiveIcon: "home-city-outline", component: InmuebleStackScreen},
    {route : 'Notificaciones', label: 'Notificaciones', activeIcon: 'bell', inActiveIcon: "bell-outline", component: NotificationScreen},
    {route : 'ProfileTab', label: 'Tu Perfil', activeIcon: "account", inActiveIcon: "account-outline", component: Profile_Menu}
]

const TabButton = (props: any) => {
    const { item, onPress, accessibilityState } = props
    const { colors } = useTheme();
    const { unreadCount } = useNotifications();
    const activeRouteName = useNavigationState((state) => {
        if (!state) return '';
        return state.routeNames[state.index];
    });
    // Combinamos useIsFocused con accessibilityState para mayor compatibilidad
    // Si estamos en la ruta correcta, React Navigation debería marcarnos como enfocados
    const focused = activeRouteName === item.route;
    
    const viewRef = useRef<any>(null)
    const circleRef = useRef<any>(null)
    const textRef = useRef<any>(null)
    const iconRef = useRef<any>(null)
    const circle1 = { 0: { scale: 0 }, 0.3: { scale: 0.9 }, 0.5: { scale: 0.3 }, 0.8: { scale: 0.7 }, 1: { scale: 1 } };
    const circle2 = { 0: { scale: 1 }, 1: { scale: 0 } };
    const animation1 = { 0: { scale: .5, translateY: 8 }, 0.92: { translateY: -22 }, 1: { scale: 1.12, translateY: -16 } };
    const animation2 = { 0: { scale: 1.12, translateY: -16 }, 1: { scale: 1, translateY: 8 } };
    const imageAnimation = { 0: { rotate: "0deg" }, 1: { rotate: "360deg" } };
    const imageAnimation2 = { 0: { rotate: "360deg" }, 1: { rotate: "0deg" } };
 
    useEffect(() => {
        if (focused && viewRef.current) {
            viewRef.current.animate(animation1);
            circleRef.current.animate(circle1);
            textRef.current.transitionTo({ scale: 1 });
            iconRef.current.animate(imageAnimation);
        } else if (!focused && viewRef.current) {
            viewRef.current.animate(animation2);
            circleRef.current.animate(circle2);
            textRef.current.transitionTo({ scale: 0 });
            iconRef.current.animate(imageAnimation2);
        }
    }, [focused]);
 
    return (
        <TouchableOpacity style={{ flex: 1, alignItems: "center", justifyContent: "center" }} onPress={onPress} activeOpacity={1}>
            <Animatable.View
                ref={viewRef}
                animation="zoomIn"
                duration={750}
                style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                <View style={{ width: 46, height: 46, borderRadius: 23, borderWidth: 4, borderColor: colors.background, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }}>
                    <Animatable.View
                        ref={circleRef}
                        style={{ ...StyleSheet.absoluteFillObject, backgroundColor: colors.buttonMain, borderRadius: 23 }} />
                    <Animatable.View
                        ref={iconRef}
                        duration={1250}>
                        <MaterialCommunityIcons name={focused ? item.activeIcon : item.inActiveIcon}
                            size={24}
                            color={focused ? colors.background : colors.buttonMain} />
                        
                        {/* BADGE DE NOTIFICACIONES */}
                        {item.route === 'Notificaciones' && unreadCount > 0 && (
                            <View style={{
                                position: 'absolute',
                                right: -8,
                                top: -8,
                                backgroundColor: '#E74C3C',
                                borderRadius: 10,
                                minWidth: 18,
                                height: 18,
                                justifyContent: 'center',
                                alignItems: 'center',
                                borderWidth: 1.5,
                                borderColor: colors.background,
                                zIndex: 10
                            }}>
                                <Text style={{ color: 'white', fontSize: 9, fontWeight: 'bold' }}>
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </Text>
                            </View>
                        )}
                    </Animatable.View>
                </View>
                <Animatable.Text
                    ref={textRef}
                    style={{ fontSize: 10, fontWeight: '700', color: colors.buttonMain, marginTop: 4 }}>
                    {item.label}
                </Animatable.Text>
            </Animatable.View>
        </TouchableOpacity>
    )
}

const Tab = createBottomTabNavigator()

export default function NavigationMenu({ route }: any) {
    const [userData, setUserData] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const { colors } = useTheme();
    const [session, setSession] = useState<{userId: string | null, token: string | null}>({
        userId: route.params?.userId || null,
        token: route.params?.token || null
    })

    const getUserData = async (uid: string, tk: string) => {
            try {
                setIsLoading(true);
                const response = await fetch(`${API_BASE_URL}/users/${uid}`, {
                    headers: {
                        'Authorization': `Bearer ${tk}`
                    }
                });
                const contentType = response.headers.get('content-type') || '';
                const data = contentType.includes('application/json')
                    ? await response.json()
                    : { error: await response.text() };

                if (response.ok) {
                    setUserData(data);
                } else {
                    console.error("Error al cargar perfil:", data.error);
                }
            } catch (error) {
                console.error("Error en fetch:", error);
            } finally {
                setIsLoading(false);
            }
        };

    const { refreshUnreadCount } = useNotifications();

    useEffect(() => {
        const loadSession = async () => {
            let uid = session.userId;
            let tk = session.token;

            if (!uid || !tk) {
                uid = await AsyncStorage.getItem('userId');
                tk = await AsyncStorage.getItem('token');
                setSession({ userId: uid, token: tk });
            }

            if (uid && tk) {
                getUserData(uid, tk);
                refreshUnreadCount(); // Cargar contador inicial
            } else {
                setIsLoading(false);
            }
        };
        
        loadSession();
    }, [session.userId]);

    // Solo mostramos el spinner si NO tenemos datos del usuario aún.
    if (isLoading && !userData) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.buttonMain} />
            </View>
        );
    }

    // Lógica de filtrado de pestañas
    const isLandlord = userData?.rol === "ARRENDADOR";
    const currentTabs = isLandlord ? LandlordTabs : StudentTabs;

    return (
        <Tab.Navigator
            screenOptions={{
                tabBarStyle: {
                    height: Platform.OS === 'ios' ? 84 : 76,
                    position: "absolute",
                    left: 1,
                    right: 1,
                    backgroundColor: colors.background,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
                },
            }}
        >
            {currentTabs.map((item) => (
                <Tab.Screen
                    key={item.route}
                    name={item.route}
                    component={item.component}
                    initialParams={{ userId: session.userId, token: session.token }}
                    options={{
                        headerShown: false,
                        headerTitle: item.label,
                        headerStyle: { backgroundColor: colors.background },
                        headerTintColor: colors.textPrimary,
                        tabBarShowLabel: false,
                        tabBarButton: (props) => <TabButton {...props} item={item} />
                    }}
                />
            ))}
        </Tab.Navigator>
    )
}
