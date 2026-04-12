import {ScrollView, Text, View, StyleSheet, Pressable} from 'react-native';
const Lessor_Renthouse = () => {

    const saludo = () => {
        console.log("hola mundo")
    }


    return (
        <ScrollView style={styles.background}>
            <View >
                <Pressable onPress={saludo} style={styles.container}>
                    <Text style={styles.title}>
                        Burras noches
                    </Text>
                </Pressable>
            </View>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    background: {
        backgroundColor: '#aafeff',
        flex: 1,
        
    }, 
    container: {
        flex: 1,
        padding: 24,
        alignItems: 'center', 
    }, 
    title: {
        color: '#0000ff'

    }
    
})



export default Lessor_Renthouse