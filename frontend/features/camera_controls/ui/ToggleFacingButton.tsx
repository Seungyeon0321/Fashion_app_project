import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native"
import FontAwesome6 from "@expo/vector-icons/FontAwesome6"

export const ToggleFacingButton = ({ toggleFacing }: { toggleFacing: () => void }) => {
    const { width } = useWindowDimensions()
    const iconSize = Math.round(width * 0.05)

    return (
        <View style={[styles.container, { width }]}>
            <Pressable
                onPress={toggleFacing}
                style={({ pressed }) => [
                    styles.button,
                    { opacity: pressed ? 0.6 : 1 },
                ]}
            >
                <FontAwesome6 name="rotate-left" size={iconSize} color="white" />
            </Pressable>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
    },
    button: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        borderRadius: 0, // sharp corners
        padding: 10,
    },
})