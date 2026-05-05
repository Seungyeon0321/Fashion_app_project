import { View, Text, ActivityIndicator, StyleSheet } from 'react-native'
import { fonts } from '@/shared/lib/tokens'

export const AlbumUploadingOverlay = () => (
  <View style={styles.overlay}>
    <ActivityIndicator size="large" color="rgba(250,249,246,0.9)" />
    <Text style={styles.text}>UPLOADING</Text>
  </View>
)

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  text: {
    ...fonts.label,
    letterSpacing: 2,
    color: 'rgba(250,249,246,0.9)',
    marginTop: 12,
  },
})