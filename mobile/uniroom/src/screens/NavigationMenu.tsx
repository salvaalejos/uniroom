import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { useEffect, useRef, useState } from "react"
import MapScreen from "./MapScreen"
import MapRouteScreen from "./MapRouteScreen"
import CalendarScreen from "./CalendarScreen"
import { ComponentType } from "react"
import HomeScreen from './HomeScreen'
import Themes from "./Themes"
import {red, blue, bluePrimaryColor, blueSecondColor} from "../styles"
import ProfileScreen from "./ProfileScreen"
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import NotificationScreen from "./NotificationScreen";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useIsFocused } from "@react-navigation/native"
import * as Animatable from "react-native-animatable"
import Settings from "./Settings"
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createStackNavigator } from "@react-navigation/stack"
import MisInmuebles from "./MisInmuebles"
import Upload_Renta from "./Upload_Renta"
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
            </Stack.Navigator>
        )
}

const StudentTabs = [
    { route: 'Inmuebles', label: 'Explorar', activeIcon: "map-search", component: MapScreen },
    { route: 'Rutas', label: 'Rutas', activeIcon: "car", component: MapRouteScreen },
    { route: 'Notificaciones', label: 'Avisos', activeIcon: 'bell', component: NotificationScreen },
    { route: 'ProfileTab', label: 'Mi Perfil', activeIcon: "account", component: Profile_Menu }
];

const LandlordTabs = [
    { route: 'MisInmuebles', label: 'Mis Casas', activeIcon: "home-city", component: MisInmuebles },
    { route: 'Publicar', label: 'Publicar', activeIcon: "home-plus", component: Upload_Renta },
    { route: 'Calendario', label: 'Agenda', activeIcon: "calendar-month", component: CalendarScreen },
    { route: 'Avisos', label: 'Notificaciones', activeIcon: "bell-check", component: NotificationScreen },
    { route: 'CuentaArrendador', label: 'Mi Cuenta', activeIcon: "account-tie", component: Profile_Menu }
];

const TabButton = (props: any) => {
    const { item, onPress } = props
    const focused = useIsFocused()
    const viewRef = useRef<any>(null)
    const circleRef = useRef<any>(null)
    const textRef = useRef<any>(null)
    const iconRef = useRef<any>(null)

    const circle1 = { 0: { scale: 0 }, 0.3: { scale: 0.9 }, 0.5: { scale: 0.3 }, 0.8: { scale: 0.7 }, 1: { scale: 1 } }
    const circle2 = { 0: { scale: 1 }, 1: { scale: 0 } }
    const animation1 = { 0: { scale: .5, translateY: 8 }, 0.92: { translateY: -34 }, 1: { scale: 1.2, translateY: -24 } }
    const animation2 = { 0: { scale: 1.2, translateY: -24 }, 1: { scale: 1, translateY: 8 } }
    const imageAnimation = {0: {rotate: "0deg"}, 1: {rotate: "360deg"}}
    const imageAnimation2 = {0: {rotate: "360deg"}, 1: {rotate: "0deg"}}

    //Ya luego le cambio los errores xd
    useEffect(() => {
        if (focused && viewRef.current) {
            viewRef.current.animate(animation1)
            circleRef.current.animate(circle1)
            textRef.current.transitionTo({ scale: 1 })
            iconRef.current.animate(imageAnimation)
        } else if (viewRef.current) {
            viewRef.current.animate(animation2)
            circleRef.current.animate(circle2)
            textRef.current.transitionTo({ scale: 0 })
            iconRef.current.animate(imageAnimation2)
        }
    }, [focused])

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

    const userId = route.params?.userId
    const token = route.params?.token

    const getUserData = async () => {
            try {
                setIsLoading(true);
                const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = await response.json();
    
                if (response.ok) {
                    setUserData(data);
                } else {
                    Alert.alert("Error", "No se pudo cargar la información del perfil.");
                }
            } catch (error) {
                console.error("Error en fetch:", error);
                Alert.alert("Error de conexión", "Revisa que tu backend esté encendido.");
            } finally {
                setIsLoading(false);
            }
        };

    useEffect(() => {
        getUserData()
        
    }, [userId]);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bluePrimaryColor }}>
                <ActivityIndicator size="large" color={blueSecondColor} />
            </View>
        );
    }

    // Lógica de filtrado de pestañas
    const isLandlord = userData?.rol === "ARRENDADOR";
    const currentTabs = isLandlord ? LandlordTabs : StudentTabs;

    return (
        <Tab.Navigator
            screenOptions={{
                animation: "fade",
                tabBarStyle: blue.tabBarStyle,
            }}
        >
            {currentTabs.map((item) => (
                <Tab.Screen
                    key={item.route}
                    name={item.route}
                    component={item.component}
                    initialParams={item.component === Profile_Menu ? { userId: userId, token: token } : {}}
                    options={{
                        headerShown: item.route !== 'ProfileTab' && item.route !== 'CuentaArrendador',
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

