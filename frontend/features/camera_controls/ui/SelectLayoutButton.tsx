import { Pressable, Text, View, StyleSheet} from "react-native"
import { BodyFrameType } from "../model/useSelectLayout";

const button = [
    {type: 'topBody', label: 'Top Body'},
    {type: 'bottomBody', label: 'Bottom Body'},
    {type: 'fullBody', label: 'Full Body'},
]

export const SelectLayoutButton = ({ currentLayout, changeLayout }: { currentLayout: BodyFrameType, changeLayout: (layout: BodyFrameType) => void }) => {

    return (
        <View style={styles.container}>
            {button.map((item) => (
                <Pressable key={item.type} style={({ pressed }) => [styles.button, { opacity: pressed ? 0.7 : 1 }]} onPress={() => {
                    changeLayout(item.type);
                }}>
                    <Text style={[styles.buttonText, { color: currentLayout === item.type ? 'white' : 'gray' }]}>{item.label}</Text>
                </Pressable>
            ))}
        </View>

    )
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: 20,
        paddingHorizontal: 20,
    },
    button: {
        backgroundColor: 'rgba(27, 26, 26, 0.5)',
        height: 40,
        width: '30%',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
})