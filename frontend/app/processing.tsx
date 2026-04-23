import { useEffect } from 'react'
import { View, Text, ActivityIndicator, StyleSheet, Pressable } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { getRegisterStatus } from '@/shared/lib/api'

export default function ProcessingScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>()
  const router = useRouter()

  const { data, isError, isLoading } = useQuery({
    queryKey: ['registerStatus', jobId],
    queryFn: () => getRegisterStatus(jobId),
    // 3초마다 자동으로 API 호출
    refetchInterval: (query) => {
      // completed 또는 not_found 상태면 폴링 중단
      const status = query.state.data?.status
      if (status === 'completed') return false
      return 3000
    },
    enabled: !!jobId,
    retry: 3,
    retryDelay: 2000,
  })

  useEffect(() => {
    if (data?.status === 'completed') {
      // 완료되면 결과 화면으로 이동 — items 중 첫 번째 ID 전달
    //   const firstItemId = data.items?.[0]?.id
      router.replace(`/result?items=${encodeURIComponent(JSON.stringify(data.items))}`)
    }
  }, [data?.status])

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#faf9f6" />
      </View>
    )
  }

  // 에러 or not_found 상태
  if (isError) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>Something went wrong</Text>
        <Text style={styles.errorSub}>The analysis could not be completed.</Text>
        <Pressable style={styles.button} onPress={() => router.replace('/')}>
          <Text style={styles.buttonText}>GO BACK</Text>
        </Pressable>
      </View>
    )
  }

  // 처리 중 화면
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#faf9f6" />
      <Text style={styles.title}>ANALYZING</Text>
      <Text style={styles.sub}>detecting your clothing item...</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 24,
  },
  title: {
    fontFamily: 'Epilogue_700Bold',
    fontSize: 20,
    color: '#faf9f6',
    letterSpacing: 3,
    marginTop: 12,
  },
  sub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: 'rgba(250,249,246,0.5)',
    letterSpacing: 1,
  },
  errorTitle: {
    fontFamily: 'Epilogue_700Bold',
    fontSize: 20,
    color: '#faf9f6',
  },
  errorSub: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 13,
    color: 'rgba(250,249,246,0.6)',
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: 'rgba(250,249,246,0.4)',
  },
  buttonText: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 11,
    letterSpacing: 2,
    color: '#faf9f6',
  },
})