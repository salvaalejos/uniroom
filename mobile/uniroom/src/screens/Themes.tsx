import { useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import {red, blue, bluePrimaryColor, blueSecondColor, redPrimaryColor, redSecondColor} from "../styles"
import { useNavigation } from '@react-navigation/native';


const temas = [
    {index: 1, title: "Frío", primaryColor: bluePrimaryColor, secondColor: blueSecondColor},
    {index: 2, title: "Cálido", primaryColor: redPrimaryColor, secondColor: redSecondColor},
    {index: 3, title: 'Océano', primaryColor: '#0077B6', secondColor: '#FFFFFF' },
    {index: 4, title: 'Pastel', primaryColor: '#FFD1DC', secondColor: '#4A4A4A' },
]

const Themes = () => {
    const navigation = useNavigation();
    const handleThemeSelection = (theme: any) => {
    console.log(`Tema seleccionado: ${theme.name}`);
    navigation.goBack();
  };
    useEffect(() => {
    const parent = navigation.getParent()
    if (parent) parent.setOptions({ headerShown: false });
    return () => {
        if (parent) {
            parent.setOptions({headerShown: true})
        }
    }
}, [navigation])
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Selecciona un tema</Text>
            {temas.map((theme) => (
                <TouchableOpacity
                key={theme.index}
                style={[styles.button, { backgroundColor: theme.primaryColor }]}
                onPress={() => handleThemeSelection(theme)}
                >
                <Text style={[styles.buttonText, { color: theme.secondColor }]}>
                    {theme.title}
                </Text>
                </TouchableOpacity>
            ))}
    </View>
    )
}

export default Themes

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    padding: 15,
    borderRadius: 10,
    marginVertical: 8,
    elevation: 3, // Sombra en Android
    shadowColor: '#000', // Sombra en iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});