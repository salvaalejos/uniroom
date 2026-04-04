import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from "react-native"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import { useEffect, useRef, useState } from "react"
import MapScreen from "./MapScreen"
import RoutesScreen from './RoutesScreen'
import HomeScreen from './HomeScreen'
import NotificationScreen from "./NotificationScreen";
import Profile from "./Profile"
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useIsFocused } from "@react-navigation/native"
import * as Animatable from "react-native-animatable"

const Tabs = [
    {route : 'Inmuebles', label: 'Inmuebles', activeIcon: "map-search", inActiveIcon: "map-search-outline", component: MapScreen},
    {route : 'Rutas Cercanas', label: 'Rutas Cercanas', activeIcon: "car", inActiveIcon: "car-outline", component: RoutesScreen},
    {route : 'Tu inmueble', label: 'Tu inmueble', activeIcon: "home", inActiveIcon: "home-outline", component: HomeScreen},
    {route : 'Notificaciones', label: 'Notificaciones', activeIcon: 'bell', inActiveIcon: "bell-outline", component: NotificationScreen},
    {route : 'Perfil', label: 'Tu Perfil', activeIcon: "account", inActiveIcon: "account-outline", component: Profile}
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
        <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={1}>
            <Animatable.View id="animacion_general"
            ref={viewRef}
            animation="zoomIn"
            duration={750}
            style={styles.container}>
                <View 
                style={styles.button}>
                    <Animatable.View id="circulo_animado"
                    ref={circleRef}
                    style={{...StyleSheet.absoluteFillObject, backgroundColor: "#205EA6", borderRadius: 25}}/>
                        <Animatable.View id="icono_animado"
                        ref={iconRef}
                        duration={1250}>
                            <MaterialCommunityIcons name={item.activeIcon}
                            size={33}
                            color={focused ? "#DCEEFF" : "#205EA6"} />
                        </Animatable.View>
                </View>
                <Animatable.Text 
                ref={textRef} 
                style={{fontSize: 12, color: "#205EA6"}}>
                    {item.label}
                </Animatable.Text>
            </Animatable.View>
        </TouchableOpacity>
    )
}

const Tab = createBottomTabNavigator()

export default function NavigationMenu(){
    return (
       <Tab.Navigator
        screenOptions={{
            animation: "fade",
            headerShown: true,
            tabBarStyle: {
                height: 70,
                position: "absolute",
                left: 1,
                right: 1,
                backgroundColor: "#DCEEFF"
            }
        }}
       >
        {
        Tabs.map((item, index) => {
            const [pressed, setPressed] = useState(false)
            return (
                <Tab.Screen name={item.route} component={item.component}
                    options={{
                        tabBarShowLabel: false,
                        // tabBarLabel: item.label,
                        // tabBarLabelStyle: {fontSize: 10},
                        tabBarIcon: ({focused}) => {
                            return (
                                <MaterialCommunityIcons name={focused ? item.activeIcon : item.inActiveIcon}
                                size={32}
                                color={"blue"}
                                />
                            )
                        },
                        tabBarButton: (props) => <TabButton {...props} item={item} pressed={pressed}/>
                    }}
                />
            )
        })
        }
       </Tab.Navigator>
    )
}

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


