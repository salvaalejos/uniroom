import { View, Text, StyleSheet, ScrollView, Image } from "react-native"
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs"
import MapScreen from "./MapScreen"
import Profile from "./Profile"
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const Tab = createBottomTabNavigator()

export default function NavigationMenu(){
    return (
        <Tab.Navigator>
            <Tab.Screen name="Mapita" component={MapScreen} 
                options={
                    {headerShown: false,
                    tabBarIcon: ({color, size}) => (
                    <MaterialCommunityIcons name="map-search" size={30} color="black" />
                    )
                    }
                        }/>
            <Tab.Screen name="Perfil" component={Profile} 
                options={
                    {
                    tabBarIcon: ({color, size}) => (
                    <MaterialCommunityIcons name="account-heart" size={30} color="black" />
                    )
                    }
                        }/>
        </Tab.Navigator>
    )
}
const styles = StyleSheet.create({
    container_top: {
        width: 50,
        height: 50,
        padding: 80
    },
    container: {
        alignItems: "center",
        padding: 10,
    },
    mapa: {
        height: 120,
        width: 120,
        alignItems: "center"
    }
})
