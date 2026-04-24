import { Platform } from "react-native"

let MapScreen: any

if (Platform.OS === "web") {
  MapScreen = require("./MapWebScreen").default
} else {
  MapScreen = require("./MapMobileScreen").default
}

export default MapScreen as any