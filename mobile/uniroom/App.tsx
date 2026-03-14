import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Importa tus pantallas
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import Upload_renta from './src/screens/Upload_Renta';
import Student_View from './src/screens/Student_View';

// Crea el Stack
const Stack = createNativeStackNavigator();

export default function App() {
    return (
        <NavigationContainer>
            <Stack.Navigator initialRouteName="Login">
                <Stack.Screen
                    name="Login"
                    component={LoginScreen}
                    options={{ headerShown: false }} // Oculta la barra superior por defecto
                />
                <Stack.Screen
                    name="Register"
                    component={RegisterScreen}
                    options={{ title: 'Registro' }} // Muestra "Registro" en la barra superior
                />
                <Stack.Screen 
                    name="Tu Primer Inmueble"
                    component={Upload_renta}
                />
                <Stack.Screen 
                    name='Student'
                    component={Student_View}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}