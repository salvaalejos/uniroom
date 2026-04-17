import { View, StyleSheet, TouchableOpacity } from "react-native"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { useEffect, useRef, useState } from "react"
import { NavigationContainer } from '@react-navigation/native';
import MapScreen from "./MapScreen"
import RoutesScreen from './RoutesScreen'
<<<<<<< HEAD
import MapRouteScreen from "./MapRouteScreen"
import { ComponentType } from "react"
import HomeScreen from './HomeScreen'
=======
import HomeScreen from './HomeScreen'

// Para crear inmuebles sjkfhdsf
import { createStackNavigator } from "@react-navigation/stack" // npm install @react-navigation/stack
import MisInmuebles from "./MisInmuebles"
import Upload_Renta from "./Upload_Renta"

const InmuebleStack = createStackNavigator()

const InmuebleStackScreen = () => {
    return (
        <InmuebleStack.Navigator screenOptions={{ headerShown: false }}>
            <InmuebleStack.Screen name="MisInmuebles" component={MisInmuebles} />
            <InmuebleStack.Screen name="SubirInmueble" component={Upload_Renta} />
        </InmuebleStack.Navigator>
    )
}

// --------

import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
>>>>>>> JuanSHBranch
import NotificationScreen from "./NotificationScreen";
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useIsFocused } from "@react-navigation/native"
import * as Animatable from "react-native-animatable"
import Profile from "./Profile"
<<<<<<< HEAD
import Settings from "./Settings"
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Profile_Menu = () => {
    return (
            <Stack.Navigator initialRouteName="Perfil">
                <Stack.Screen
                name="Perfil"
                component={Profile}
                options={{headerShown: false}}
                >
                </Stack.Screen>
                <Stack.Screen
                name="Settings"
                component={Settings}>
=======
import Themes from "./Themes"
import {red, blue, bluePrimaryColor, blueSecondColor} from "../styles"
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileDataScreen from "./ProfileDataScreen"
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

>>>>>>> JuanSHBranch
                </Stack.Screen>
            </Stack.Navigator>
        )
}

<<<<<<< HEAD
type TabItem = {
  route: string
  label: string
  activeIcon: any
  inActiveIcon: any
  component: ComponentType<any>
}

const Tabs: TabItem[] = [
    {route : 'Inmuebles', label: 'Inmuebles', activeIcon: "map-search", inActiveIcon: "map-search-outline", component: MapScreen},
    {route : 'Rutas Cercanas', label: 'Rutas Cercanas', activeIcon: "car", inActiveIcon: "car-outline", component: MapRouteScreen},
    {route : 'Tu inmueble', label: 'Tu inmueble', activeIcon: "home", inActiveIcon: "home-outline", component: HomeScreen},
    {route : 'Notificaciones', label: 'Notificaciones', activeIcon: 'bell', inActiveIcon: "bell-outline", component: NotificationScreen},
    {route : 'Perfil', label: 'Tu Perfil', activeIcon: "account", inActiveIcon: "account-outline", component: Profile_Menu}
]


=======
const Tabs = [
    {route : 'Inmuebles', label: 'Inmuebles', activeIcon: "map-search", inActiveIcon: "map-search-outline", component: MapScreen},
    {route : 'Rutas Cercanas', label: 'Rutas Cercanas', activeIcon: "car", inActiveIcon: "car-outline", component: RoutesScreen},
    //{route : 'Tu inmueble', label: 'Tu inmueble', activeIcon: "home", inActiveIcon: "home-outline", component: HomeScreen},
    
    // ruta provicional para los inmuebles
    {route : 'Tu inmueble', label: 'Tu inmueble', activeIcon: "home", inActiveIcon: "home-outline", component: InmuebleStackScreen},


    {route : 'Notificaciones', label: 'Notificaciones', activeIcon: 'bell', inActiveIcon: "bell-outline", component: NotificationScreen},
    {route : 'ProfileTab', label: 'Tu Perfil', activeIcon: "account", inActiveIcon: "account-outline", component: ProfileDataScreen}
]

>>>>>>> JuanSHBranch
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
<<<<<<< HEAD
    useEffect(() => {

    })
=======
>>>>>>> JuanSHBranch

    //Ya luego le cambio los errores xd
    useEffect(() => {
        if (focused) {
<<<<<<< HEAD
            viewRef.current?.animate(animation1)
            circleRef.current?.animate(circle1)
            textRef.current?.transitionTo({scale: 1})
            iconRef.current?.animate(imageAnimation)
        } else {
            viewRef.current?.animate(animation2)
            circleRef.current?.animate(circle2)
            textRef.current?.transitionTo({scale: 0})
            iconRef.current?.animate(imageAnimation2)
=======
            viewRef.current.animate(animation1)
            circleRef.current.animate(circle1)
            textRef.current.transitionTo({scale: 1})
            iconRef.current.animate(imageAnimation)
        } else {
            viewRef.current.animate(animation2)
            circleRef.current.animate(circle2)
            textRef.current.transitionTo({scale: 0})
            iconRef.current.animate(imageAnimation2)
>>>>>>> JuanSHBranch
        }
    },[focused])

    return (
<<<<<<< HEAD
        <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={1}>
=======
        <TouchableOpacity style={blue.navigation_menu_container} onPress={onPress} activeOpacity={1}>
>>>>>>> JuanSHBranch
            <Animatable.View id="animacion_general"
            ref={viewRef}
            animation="zoomIn"
            duration={750}
<<<<<<< HEAD
            style={styles.container}>
                <View 
                style={styles.button}>
                    <Animatable.View id="circulo_animado"
                    ref={circleRef}
                    style={{...StyleSheet.absoluteFillObject, backgroundColor: "#205EA6", borderRadius: 25}}/>
                        <Animatable.View id="icono_animado"
                        ref={iconRef}
                        duration={1250}>
                            <MaterialCommunityIcons name={item.activeIcon as any}
                            size={33}
                            color={focused ? "#DCEEFF" : "#205EA6"} />
=======
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
>>>>>>> JuanSHBranch
                        </Animatable.View>
                </View>
                <Animatable.Text 
                ref={textRef} 
<<<<<<< HEAD
                style={{fontSize: 12, color: "#205EA6"}}>
=======
                style={{fontSize: 12, color: blueSecondColor}}>
>>>>>>> JuanSHBranch
                    {item.label}
                </Animatable.Text>
            </Animatable.View>
        </TouchableOpacity>
    )
}

<<<<<<< HEAD
const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

export default function NavigationMenu(){
=======
const Tab = createBottomTabNavigator()

export default function NavigationMenu(){
    const [theme, setTheme] = useState(blue)
>>>>>>> JuanSHBranch
    return (
       <Tab.Navigator
        screenOptions={{
            animation: "fade",
<<<<<<< HEAD
            headerShown: true,
            tabBarStyle: {
                height: 70,
                position: "absolute",
                left: 1,
                right: 1,
                backgroundColor: "#DCEEFF"
            }
=======
            tabBarStyle: blue.tabBarStyle,
>>>>>>> JuanSHBranch
        }}
       >
        {
        Tabs.map((item, index) => {
<<<<<<< HEAD
            const [pressed, setPressed] = useState(false)
            return (
                <Tab.Screen name={item.route} component={item.component}
                    options={{
                        tabBarShowLabel: false,
                        // tabBarLabel: item.label,
                        // tabBarLabelStyle: {fontSize: 10},
                        tabBarIcon: ({focused}) => {
                            return (
                                <MaterialCommunityIcons name={(focused ? item.activeIcon : item.inActiveIcon) as any}
                                size={32}
                                color={"blue"}
                                />
                            )
                        },
                        tabBarButton: (props) => <TabButton {...props} item={item}/>
                    }}
=======
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
>>>>>>> JuanSHBranch
                />
            )
        })
        }
       </Tab.Navigator>
    )
}

<<<<<<< HEAD
const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center"
    },
    button: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 6,
        borderColor: "#DCEEFF",
        backgroundColor: "#DCEEFF",
        justifyContent: "center",
        alignItems: "center"
    }
})
=======
>>>>>>> JuanSHBranch


