import { View, Text, Image, StyleSheet } from "react-native"

const Profile = () => {
    return (
        <View style={styles.main_container}>
            <View style={styles.pic_and_callif_container}>
                <View style={styles.image_container}>
                    <Image 
                        source={require("../default_images/profile_photo.jpg")}
                        style={styles.picture}
                    />
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
    pic_and_callif_container: {
        width: 100,
        alignItems: "flex-start",
        backgroundColor: "#fdecba",
        padding: 20
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
    calificacion: {
        padding: 1
    }
})
