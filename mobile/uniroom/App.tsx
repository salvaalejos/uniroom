import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {View} from 'react-native'
// Importa tus pantallas
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import Upload_renta from './src/screens/Upload_Renta';
import NavigationMenu from './src/screens/NavigationMenu';

// Crea el Stack
const Stack = createNativeStackNavigator();

export default function App() {
    return (
        <NavigationContainer>
            <Stack.Navigator initialRouteName="Login">
                <Stack.Screen 
                    name="Navigator"
                    component={NavigationMenu}
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
                    name="Tu Primer Inmueble"
                    component={Upload_renta}
                    options={{ title: 'Tu Primer Inmueble', headerShown: false }}
                />
            </Stack.Navigator>
            <View style={{height: 50, backgroundColor: "#DCEEFF"}}>
            </View>
        </NavigationContainer>
    );
}