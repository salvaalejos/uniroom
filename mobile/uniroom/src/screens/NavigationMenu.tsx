import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native"
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
import {red, blue, bluePrimaryColor, blueSecondColor} from "../styles"
import ProfileScreen from "./ProfileScreen"
import EditProfileScreen from "./EditProfile"
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import NotificationScreen from "./NotificationScreen";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useIsFocused } from "@react-navigation/native"
import * as Animatable from "react-native-animatable"
import Settings from "./Settings"
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createStackNavigator } from "@react-navigation/stack"
// agendar cita de vivienda
import AgendarCita from "./AgendarCita";
// Para crear inmuebles sjkfhdsf
import MisInmuebles from "./MisInmuebles"
import Upload_Renta from "./Upload_Renta"
import HousingMapScreen from "./HousingMapScreen";
import Constants from 'expo-constants';
const hostUri = Constants.expoConfig?.hostUri?.split(':').shift();

const API_BASE_URL = hostUri ? `http://${hostUri}:3000` : 'http://localhost:3000';;

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
    return (
            <Stack.Navigator initialRouteName="ProfileScreen"
            screenOptions={{
                headerShown: false,
                headerStyle: { backgroundColor: bluePrimaryColor },
                headerTintColor: blueSecondColor,
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
    const animation1 = { 0: { scale: .5, translateY: 8 }, 0.92: { translateY: -34 }, 1: { scale: 1.2, translateY: -24 } };
    const animation2 = { 0: { scale: 1.2, translateY: -24 }, 1: { scale: 1, translateY: 8 } };
    const imageAnimation = { 0: { rotate: "0deg" }, 1: { rotate: "360deg" } };
    const imageAnimation2 = { 0: { rotate: "360deg" }, 1: { rotate: "0deg" } };

    useEffect(() => {
        // Aseguramos que las referencias existan antes de animar
        if (focused && viewRef.current) {
            viewRef.current.animate(animation1);
            circleRef.current.animate(circle1);
            textRef.current.transitionTo({ scale: 1 });
            iconRef.current.animate(imageAnimation);
        } else if (!focused && viewRef.current) { // Condición más estricta aquí
            viewRef.current.animate(animation2);
            circleRef.current.animate(circle2);
            textRef.current.transitionTo({ scale: 0 });
            iconRef.current.animate(imageAnimation2);
        }
    }, [focused]);

    return (
        <TouchableOpacity style={blue.navigation_menu_container} onPress={onPress} activeOpacity={1}>
            <Animatable.View
                ref={viewRef}
                animation="zoomIn"
                duration={750}
                style={blue.navigation_menu_container}>
                <View style={blue.navigation_menu_button}>
                    <Animatable.View
                        ref={circleRef}
                        style={{ ...StyleSheet.absoluteFillObject, backgroundColor: blueSecondColor, borderRadius: 25 }} />
                    <Animatable.View
                        ref={iconRef}
                        duration={1250}>
                        <MaterialCommunityIcons name={item.activeIcon}
                            size={33}
                            color={focused ? bluePrimaryColor : blueSecondColor} />
                    </Animatable.View>
                </View>
                <Animatable.Text
                    ref={textRef}
                    style={{ fontSize: 12, color: blueSecondColor }}>
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
                const data = await response.json();
    
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
            } else {
                setIsLoading(false);
            }
        };
        
        loadSession();
    }, [session.userId]);

    // Solo mostramos el spinner si NO tenemos datos del usuario aún.
    if (isLoading && !userData) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bluePrimaryColor }}>
                <ActivityIndicator size="large" color="#fff" />
            </View>
        );
    }

    // Lógica de filtrado de pestañas
    const isLandlord = userData?.rol === "ARRENDADOR";
    const currentTabs = isLandlord ? LandlordTabs : StudentTabs;

    return (
        <Tab.Navigator
            screenOptions={{
                tabBarStyle: blue.tabBarStyle,
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
                        headerStyle: { backgroundColor: bluePrimaryColor },
                        headerTintColor: blueSecondColor,
                        tabBarShowLabel: false,
                        tabBarButton: (props) => <TabButton {...props} item={item} />
                    }}
                />
            ))}
        </Tab.Navigator>
    )
}

