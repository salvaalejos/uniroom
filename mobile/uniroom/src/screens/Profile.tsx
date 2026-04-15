import { View, Text, Image, StyleSheet, TouchableOpacity, Button} from "react-native"
import { useEffect, useRef, useState } from "react"
import  {MaterialCommunityIcons}  from "@expo/vector-icons"
import { AntDesign } from "@expo/vector-icons"
import * as Animatable from "react-native-animatable"
import { useIsFocused } from "@react-navigation/native"

const Profile = ({ navigation }: any) => {

    const [nombre, setNombre] = useState("Juan Alberto")
    const [lastname, setLastname] = useState("Sánchez Hernández")
    const [calif, setCalif] = useState(4.8)
    //Misma madre de la animación pendiente
    // const iconRef = useRef(null)
    // const focused = useIsFocused()
    const buttons = [
        // {name_icon: "format-painter", label: "Temas", component: "Themes"},
        {name_icon: "contacts", label: "Datos Personales", component: "Profile_Info",}, 
        // {name_icon: "eye", label: "Vistos recientemente", component: "Profile_History",},
        // {name_icon: "heart", label: "Favoritos", component: "Profile_Favs",},
        // {name_icon: "star", label: "Calificaciones", component: "Profile_Califs",}
    ]

    //Animaciones de giro en desarrollo para botón seleccionado (No es prioridad ahora mismo xd)
    // const start = {0: {rotate: "0deg"}, 1: {rotate: "360deg"}}
    // const finish = {0: {rotate: "360deg"}, 1: {rotate: "360deg"}}
    // useEffect(() => {
    //     if (focused){
    //         iconRef.current.animate(start)
    //     } else {
    //         iconRef.current.animate(finish)
    //     }
    // })

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
                        {calif + "  "}
                        <AntDesign name="star" size={32}/>
                    </Text>
                </View>
            </View>
            <View style={styles.button_container}>
                {buttons.map((item, index) => {
                return (
                    <TouchableOpacity key={item.label} style={styles.button} onPress={() => navigation.navigate(item.component)}>  
                        <AntDesign style={styles.button_icon} name={item.name_icon} size={32} color={"#DCEEFF"}/>
                        <View style={styles.container_button_text}>
                            <Text style={styles.button_text}>
                                {item.label}
                            </Text>
                        </View>
                    </TouchableOpacity>
                    )
                })}
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
        height: '30%',
        alignItems: "flex-start",
        padding: 15,
        justifyContent: "space-evenly",
        flexDirection: "row"
    },
    image_container:{
        padding: 0,
        height: "100%",
        justifyContent: "center"
    },
    picture: {
        height: 200,
        width: 200,
        borderRadius: 100,
        borderColor: "#0F2C4F",
        borderWidth: 6
    },
    data_container: {
        padding: 10,
        
        height: "100%",
        alignItems: "center",
        justifyContent: "center"
    },
    text_name: {
        fontSize: 20,
        textAlign: "center",
        fontFamily: "monospace"
    },
    callif: {
        fontSize: 30,
        padding: 20
    },
    button_container: {
        padding: 15,
        height: "60%",
        width: "100%",
        justifyContent: "flex-start",
        alignItems: "center"
    },
    button: {
        flexDirection: "row",
        backgroundColor: "#205EA6",
        justifyContent: "flex-start",
        alignItems: "center",
        height: 70,
        padding: 10,
        width: "100%",
        borderRadius: 10,
        margin: "2%"
    },
    button_icon: {
        width: "20%",
        justifyContent: "center",
        alignItems: "center",
        left: "10%",
        // backgroundColor: "blue"

    },
    button_text: {
        fontSize: 22,
        color: "#DCEEFF",
        fontFamily: "monospace"
    },
    container_button_text: {
        alignItems: "center",
        justifyContent: "center",
        width: "75%",
        // backgroundColor: "pink"
    }
})
