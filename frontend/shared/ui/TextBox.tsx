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
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
    text: {
        fontFamily: 'Manrope_400Regular',
        fontSize: 12,
        letterSpacing: 1.5,
        color: 'rgba(250,249,246,0.95)', // 거의 흰색
        textAlign: 'center',
    },
})