import { Pressable, StyleSheet, View } from "react-native"
import FontAwesome6 from "@expo/vector-icons/FontAwesome6"

export const ToggleFacingButton = ({ toggleFacing }: { toggleFacing: () => void }) => {
    return (
        <Pressable
            onPress={toggleFacing}
            style={({ pressed }) => [
                styles.button,
                { opacity: pressed ? 0.6 : 1 },
            ]}
        >
            <FontAwesome6 name="rotate-left" size={18} color="white" />
        </Pressable>
    )
}

const styles = StyleSheet.create({
    button: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        borderRadius: 0,
        padding: 10,
    },
})
