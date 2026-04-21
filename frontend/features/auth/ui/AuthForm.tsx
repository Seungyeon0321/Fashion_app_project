// features/auth/components/AuthForm.tsx
import { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Button } from '@/shared/ui/Button';
import { useAuthStore } from '@/shared/store/authStore';
import { api } from '@/shared/lib/api';
import Svg, { Path } from 'react-native-svg';

type Tab = 'signup' | 'signin';

type Props = {
  activeTab: Tab;
};

const GoogleIcon = (
  <Svg width={14} height={14} viewBox="0 0 18 18">
    <Path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <Path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
    <Path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
    <Path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </Svg>
);

export function AuthForm({ activeTab }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const login = useAuthStore((s) => s.login);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const endpoint = activeTab === 'signup' ? '/auth/register' : '/auth/login';
      const { data } = await api.post(endpoint, { email, password });
      await login(data.accessToken);
      router.replace('/(tabs)/home');
    } catch {
      setError(
        activeTab === 'signup'
          ? 'This email is already in use.'
          : 'Incorrect email or password.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      {/* 이메일 */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Email Address</Text>
        <TextInput
          style={styles.fieldInput}
          placeholder="your@email.com"
          placeholderTextColor="rgba(255,255,255,0.12)"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          keyboardAppearance="dark"
        />
        <View style={styles.fieldLine} />
      </View>

      {/* 비밀번호 */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Password</Text>
        <TextInput
          style={styles.fieldInput}
          placeholder={activeTab === 'signup' ? 'Min. 8 characters' : '••••••••'}
          placeholderTextColor="rgba(255,255,255,0.12)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          keyboardAppearance="dark"
        />
        <View style={styles.fieldLine} />
      </View>

      {/* 에러 */}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* 제출 버튼 */}
      <Button
        label={activeTab === 'signup' ? 'JOIN' : 'SIGN IN'}
        onPress={handleSubmit}
        variant="primary"
        loading={loading}
        style={styles.submitBtn}
      />

      {/* OR 구분선 */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerOr}>OR</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Google */}
      <Button
        label="GOOGLE"
        onPress={() => {}}
        variant="ghost"
        icon={GoogleIcon}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 24 },
  fieldLabel: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 9,
    letterSpacing: 2,
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  fieldInput: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    paddingVertical: 8,
    letterSpacing: 0.5,
  },
  fieldLine: {
    height: 1,
    backgroundColor: 'rgba(175,179,174,0.2)',
    marginTop: 2,
  },
  error: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 11,
    color: '#fe8b70',
    marginBottom: 12,
  },
  submitBtn: { marginTop: 8, marginBottom: 12 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.07)' },
  dividerOr: {
    fontFamily: 'Manrope_400Regular',
    fontSize: 9,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.2)',
  },
});