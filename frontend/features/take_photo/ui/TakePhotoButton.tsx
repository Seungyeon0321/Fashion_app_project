import React from "react"
import { Pressable, Text, View, StyleSheet } from "react-native"

const TakePhotoButton = ({ triggerCountdown }: { triggerCountdown: (seconds: number) => void }) => {
    return (
        <View style={styles.container}>
            <Pressable
                style={({ pressed }) => [
                    styles.button,
                    { opacity: pressed ? 0.7 : 1 }
                ]}
                onPress={() => triggerCountdown(3)}
            >
                <Text style={styles.buttonText}>TAKE PHOTO</Text>
            </Pressable>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        width: '80%',
        paddingVertical: 10,
        alignItems: 'center',
    },
    button: {
        width: '100%',
        paddingVertical: 16,
        backgroundColor: 'rgba(250,249,246,0.9)', // #faf9f6 with slight transparency
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 0, // sharp corners
    },
    buttonText: {
        fontFamily: 'Manrope_500Medium',
        fontSize: 11,
        letterSpacing: 2,
        color: '#1a1a1a',
    },
})

export default React.memo(TakePhotoButton);