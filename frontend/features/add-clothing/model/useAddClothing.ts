// features/add-clothing/model/useAddClothing.ts

import { useState } from 'react'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import type { RegistrationMethodId } from '@/features/select-registration-method/model/registrationMethods'

export const useAddClothing = () => {
  const router = useRouter()
  const [isModalVisible, setIsModalVisible] = useState(false)

  const openModal = () => setIsModalVisible(true)
  const closeModal = () => setIsModalVisible(false)

  const handleSelectMethod = async (methodId: RegistrationMethodId) => {
    switch (methodId) {
      case 'camera':
        router.push('/camera')
        break

      case 'library':
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [3, 4],
          quality: 0.8,
        })
        if (!result.canceled) {
          router.push({
            pathname: '/album-preview',
            params: { imageUri: result.assets[0].uri },
          })
        }
        break

      case 'purchase':
        console.log('Import from purchase - coming soon')
        break
    }
  }

  return {
    isModalVisible,
    openModal,
    closeModal,
    handleSelectMethod,
  }
}