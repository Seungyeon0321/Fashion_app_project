import { Pressable, Text, View, StyleSheet } from "react-native"
import { BodyFrameType } from "../model/useSelectLayout";

const BUTTONS = [
    { type: 'topBody',    label: 'TOP' },
    { type: 'bottomBody', label: 'BOTTOM' },
    { type: 'fullBody',   label: 'FULL' },
]

export const SelectLayoutButton = ({ currentLayout, changeLayout }: { currentLayout: BodyFrameType, changeLayout: (layout: BodyFrameType) => void }) => {
    return (
        <View style={styles.container}>
            {BUTTONS.map((item) => {
                const active = currentLayout === item.type;
                return (
                    <Pressable
                        key={item.type}
                        style={({ pressed }) => [
                            styles.button,
                            active && styles.buttonActive,
                            { opacity: pressed ? 0.7 : 1 },
                        ]}
                        onPress={() => changeLayout(item.type)}
                    >
                        <Text style={[styles.buttonText, active && styles.buttonTextActive]}>
                            {item.label}
                        </Text>
                    </Pressable>
                )
            })}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
        gap: 8,
        paddingHorizontal: 24,
    },
    button: {
        flex: 1,
        height: 36,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        borderRadius: 0, // sharp corners
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    buttonActive: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderColor: 'rgba(255,255,255,0.8)',
    },
    buttonText: {
        fontFamily: 'Manrope_500Medium',
        fontSize: 11,
        letterSpacing: 1.5,
        color: 'rgba(255,255,255,0.4)',
    },
    buttonTextActive: {
        color: 'white',
    },
})