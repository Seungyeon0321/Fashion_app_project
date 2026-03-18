import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native"
import FontAwesome6 from "@expo/vector-icons/FontAwesome6"

export const ToggleFacingButton = ({ toggleFacing }: { toggleFacing: () => void }) => {
    const { width } = useWindowDimensions()
    const W = width

    // 아이콘 크기 = 화면 너비의 5% (useWindowDimensions로 기기마다 비율 유지)
    const iconSize = Math.round(W * 0.05)
    const padding = Math.round(W * 0.02)

    return (
        <View style={[styles.container, { width: W }]}>
            <Pressable
                onPress={toggleFacing}
                style={({ pressed }) => [
                    styles.button,
                    { padding, opacity: pressed ? 0.8 : 1 },
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
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 50,
    },
})