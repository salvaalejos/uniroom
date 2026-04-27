import { View, Image, StyleSheet, TouchableOpacity, Text, Dimensions } from "react-native"
import { useState } from "react"
import InmuebleScreen from "./InmuebleScreen"

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const MAP_SIZE = SCREEN_WIDTH

const PROPIEDADES = [
  { id: 1, precio: 3200, x: 0.28, y: 0.18 },
  { id: 2, precio: 4800, x: 0.62, y: 0.22 },
  { id: 3, precio: 2700, x: 0.45, y: 0.38 },
  { id: 4, precio: 5500, x: 0.72, y: 0.41 },
  { id: 5, precio: 3900, x: 0.18, y: 0.52 },
  { id: 6, precio: 2400, x: 0.55, y: 0.55 },
  { id: 7, precio: 6200, x: 0.38, y: 0.65 },
  { id: 8, precio: 3100, x: 0.80, y: 0.60 },
  { id: 9, precio: 4100, x: 0.25, y: 0.75 },
  { id: 10, precio: 2900, x: 0.60, y: 0.78 },
]

const MapScreen = ({ navigation }: any) => {
  const [modalVisible, setModalVisible] = useState(false)

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <Image
          source={require("../default_images/mapa.jpg")}
          style={styles.map}
        />
        {PROPIEDADES.map((prop) => (
          <TouchableOpacity
            key={prop.id}
            style={[
              styles.pin,
              { left: prop.x * MAP_SIZE - 32, top: prop.y * MAP_SIZE - 18 },
            ]}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.pinText}>
              ${prop.precio.toLocaleString('es-MX')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <InmuebleScreen
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        navigation={navigation}
      />
    </View>
  )
}

export default MapScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EEF4FF",
  },
  mapContainer: {
    width: MAP_SIZE,
    height: MAP_SIZE,
    position: "relative",
  },
  map: {
    width: MAP_SIZE,
    height: MAP_SIZE,
  },
  pin: {
    position: "absolute",
    backgroundColor: "#1a1a2e",
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 5,
  },
  pinText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
})