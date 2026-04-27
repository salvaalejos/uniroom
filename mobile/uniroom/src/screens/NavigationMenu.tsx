import { View, StyleSheet, TouchableOpacity } from "react-native"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { useEffect, useRef, useState } from "react"
import { NavigationContainer } from '@react-navigation/native';
import MapScreen from "./MapScreen"
import MapRouteScreen from "./MapRouteScreen"
import { ComponentType } from "react"
import HomeScreen from './HomeScreen'
import Themes from "./Themes"
import {red, blue, bluePrimaryColor, blueSecondColor} from "../styles"
import ProfileDataScreen from "./ProfileDataScreen"
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import NotificationScreen from "./NotificationScreen";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useIsFocused } from "@react-navigation/native"
import * as Animatable from "react-native-animatable"
import Profile from "./Profile"
import Settings from "./Settings"
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Para crear inmuebles sjkfhdsf
import { createStackNavigator } from "@react-navigation/stack" // npm install @react-navigation/stack
import MisInmuebles from "./MisInmuebles"
import Upload_Renta from "./Upload_Renta"
import HousingMapScreen from "./HousingMapScreen";

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

const Profile_Menu = () => {
    return (
            <Stack.Navigator initialRouteName="ProfileScreen"
            screenOptions={{
                headerShown: false,
                headerStyle: { backgroundColor: bluePrimaryColor },
                headerTintColor: blueSecondColor,
            }}>
                <Stack.Screen
                name="ProfileScreen"
                component={Profile}
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
                component={ProfileDataScreen}
                options={{presentation: "modal", title: "Tus Datos", headerShown: true}}>

                </Stack.Screen>
            </Stack.Navigator>
        )
}

const Tabs = [
    {route : 'Inmuebles', label: 'Inmuebles', activeIcon: "map-search", inActiveIcon: "map-search-outline", component: HousingMapScreen},
    
    //{route : 'Inmuebles', label: 'Inmuebles', activeIcon: "map-search", inActiveIcon: "map-search-outline", component: MapScreen},
    //{route : 'Rutas Cercanas', label: 'Rutas Cercanas', activeIcon: "car", inActiveIcon: "car-outline", component: MapRouteScreen},
    //{route : 'Tu inmueble', label: 'Tu inmueble', activeIcon: "home", inActiveIcon: "home-outline", component: HomeScreen},
    
    // ruta provicional para los inmuebles
    {route : 'Tu inmueble', label: 'Tu inmueble', activeIcon: "home", inActiveIcon: "home-outline", component: InmuebleStackScreen},


    {route : 'Notificaciones', label: 'Notificaciones', activeIcon: 'bell', inActiveIcon: "bell-outline", component: NotificationScreen},
    {route : 'ProfileTab', label: 'Tu Perfil', activeIcon: "account", inActiveIcon: "account-outline", component: ProfileDataScreen}
]

const TabButton = (props: any) => {
    const {item, onPress} = props
    //esta pinche función me tiene desesperado desde las 6 o 7 (son las 9) y la encontré en un rincón de GitHub olvidado por Torvalds, pero FUCK YOU CLAUDE
    const focused = useIsFocused()
    const viewRef = useRef(null)
    const circleRef = useRef(null)
    const textRef = useRef(null)
    const iconRef = useRef(null)

    const circle1 = {0: {scale: 0}, 0.3: {scale: 0.9}, 0.5: {scale: 0.3}, 0.8: {scale: 0.7}, 1: {scale: 1}}
    const circle2 = {0: {scale: 1}, 1: {scale:0}}
    const animation1 = { 0: { scale: .5, translateY: 8 }, 0.92: {translateY: -34}, 1: { scale: 1.2, translateY: -24} }
    const animation2 = { 0: { scale: 1.2, translateY: -24 }, 1: { scale: 1, translateY: 8 } }
    const imageAnimation = {0: {rotate: "0deg"}, 1: {rotate: "360deg"}}
    const imageAnimation2 = {0: {rotate: "360deg"}, 1: {rotate: "0deg"}}
    useEffect(() => {

    })

    //Ya luego le cambio los errores xd
    useEffect(() => {
        if (focused) {
            viewRef.current.animate(animation1)
            circleRef.current.animate(circle1)
            textRef.current.transitionTo({scale: 1})
            iconRef.current.animate(imageAnimation)
        } else {
            viewRef.current.animate(animation2)
            circleRef.current.animate(circle2)
            textRef.current.transitionTo({scale: 0})
            iconRef.current.animate(imageAnimation2)
        }
    },[focused])

    return (
        <TouchableOpacity style={blue.navigation_menu_container} onPress={onPress} activeOpacity={1}>
            <Animatable.View id="animacion_general"
            ref={viewRef}
            animation="zoomIn"
            duration={750}
            style={blue.navigation_menu_container}>
                <View 
                style={blue.navigation_menu_button}>
                    <Animatable.View id="circulo_animado"
                    ref={circleRef}
                    style={{...StyleSheet.absoluteFillObject, backgroundColor: blueSecondColor, borderRadius: 25}}/>
                        <Animatable.View id="icono_animado"
                        ref={iconRef}
                        duration={1250}>
                            <MaterialCommunityIcons name={item.activeIcon}
                            size={33}
                            color={focused ? bluePrimaryColor : blueSecondColor} />
                        </Animatable.View>
                </View>
                <Animatable.Text 
                ref={textRef} 
                style={{fontSize: 12, color: blueSecondColor}}>
                    {item.label}
                </Animatable.Text>
            </Animatable.View>
        </TouchableOpacity>
    )
}

const Tab = createBottomTabNavigator()

export default function NavigationMenu(){
    const [theme, setTheme] = useState(blue)
    return (
       <Tab.Navigator
        screenOptions={{
            animation: "fade",
            tabBarStyle: blue.tabBarStyle,
        }}
       >
        {
        Tabs.map((item, index) => {
            return (
                <Tab.Screen 
                key={index}
                name={item.route} 
                component={item.component}
                options={({ route }) => ({
                    headerShown: item.route !== 'ProfileTab',
                    headerTitle: item.label,
                    headerStyle: { backgroundColor: bluePrimaryColor },
                    headerTintColor: blueSecondColor,
                    tabBarShowLabel: false,
                    tabBarButton: (props) => <TabButton {...props} item={item}/>
                    })}
                />
            )
        })
        }
       </Tab.Navigator>
    )
}

