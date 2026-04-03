import { View, Text, Image, StyleSheet} from "react-native"

const RoutesScreen = () => {
    return (
        <View style={styles.container}>
            <View style={styles.search_bar}>
                <Text>
                    SOY EL MAPA SOY EL MAPA
                </Text>
            </View>
            <Image source={require("../default_images/mapa.jpg")} style={styles.map}/>
        </View>
    )
} 
export default RoutesScreen

const styles = StyleSheet.create({
    map: {
        height: 325,
        width: 325,
        padding: 5,
        borderRadius: 35
    },
    container: {
        alignItems: "center"
    },
    search_bar: {
        resizeMode: "contain",
        flex: 1,
        width: null,
        height: 270,
        backgroundColor: "#ffffff",
    }
})