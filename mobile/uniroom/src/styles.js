import { StyleSheet } from "react-native"

export const bluePrimaryColor = "#DCEEFF"
export const blueSecondColor = "#205EA6"
export const blue = StyleSheet.create({
    navigation_menu_container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center"
    },
    navigation_menu_button: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 6,
        borderColor: "#DCEEFF",
        backgroundColor: "#DCEEFF",
        justifyContent: "center",
        alignItems: "center"
    },
    tabBarStyle: {
        height: 70,
        position: "absolute",
        left: 1,
        right: 1,
        backgroundColor: "#DCEEFF"
    }
})

export const redPrimaryColor = "#FFD1D1"
export const redSecondColor = "#F23535"
export const red = StyleSheet.create({
    navigation_menu_container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center"
    },
    navigation_menu_button: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 6,
        borderColor: {redPrimaryColor},
        backgroundColor: {redPrimaryColor},
        justifyContent: "center",
        alignItems: "center"
    },
    tabBarStyle: {
        height: 70,
        position: "absolute",
        left: 1,
        right: 1,
        backgroundColor: {redPrimaryColor}
    }
}) 
