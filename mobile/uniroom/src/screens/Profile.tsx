import { View, Text, Image, StyleSheet} from "react-native"
import { useState } from "react"
const Profile = () => {

    const [nombre, setNombre] = useState("Juan Alberto")
    const [lastname, setLastname] = useState("Sánchez Hernández")
    const [calif, setCalif] = useState(5)

    return (
        <View style={styles.main_container}>
            <View style={styles.pic_and_data_container}>
                <View style={styles.image_container}>
                    <Image 
                        source={require("../default_images/profile_photo.jpg")}
                        style={styles.picture}
                    />
                </View>
                <View style={styles.data_container}>
                    <Text style={styles.text_name}>
                        {nombre}
                    </Text>
                    <Text style={styles.text_name}>
                        {lastname}
                    </Text>
                    <Text style={styles.callif}>
                        {calif} estrellotas chulo
                    </Text>
                </View>
            </View>
        </View>

    )
}
export default Profile
const styles = StyleSheet.create({
    main_container: {
        flex: 1,
        alignItems: "center",
        backgroundColor: "#abcdef"
    },
    pic_and_data_container: {
        width: '100%',
        alignItems: "flex-start",
        backgroundColor: "#fdecba",
        padding: 20,
        justifyContent: "flex-start",
        flexDirection: "row"
    },
    image_container:{
        padding: 25,
        backgroundColor: "#000000",
    },
    picture: {
        height: 200,
        width: 200,
        borderRadius: 35,
    },
    data_container: {
        padding: 10,
        backgroundColor: "#ffaffa",
        width: "60%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center"
    },
    text_name: {
        fontSize: 30
    },
    callif: {
        fontSize: 30,
        padding: 20
    }
})
