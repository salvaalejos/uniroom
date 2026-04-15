import { Platform } from "react-native"

let MapScreen

if (Platform.OS === "web") {
  MapScreen = require("./MapMobileScreen").default
} else {
  MapScreen = require("./MapMobileScreen").default
}

export default MapScreen