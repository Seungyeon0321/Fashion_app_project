import React from "react"
import { Button, View, StyleSheet } from "react-native"

const TakePhotoButton = ({ triggerCountdown }: { triggerCountdown: (seconds: number) => void }) => {
    return (
        <View style={styles.container}>
            <Button title="Take Photo" onPress={() => triggerCountdown(3)} />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        width: '80%',
        paddingVertical: 10,
    },
})

export default React.memo(TakePhotoButton);