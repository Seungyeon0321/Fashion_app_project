import { View, Text, StyleSheet, StyleProp, TextStyle } from 'react-native'

export const TextBox = ({ text, style }: { text: string, style?: StyleProp<TextStyle> }) => {
    return (
        <View style={styles.container}>
            <Text style={[styles.text, style]}>{text}</Text>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
})