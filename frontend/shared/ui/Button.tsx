// shared/ui/Button.tsx
import {
    TouchableOpacity,
    Text,
    ActivityIndicator,
    StyleSheet,
    ViewStyle,
    View,
  } from 'react-native';
  
  type ButtonVariant = 'primary' | 'ghost' | 'text';
  
  type Props = {
    label: string;
    onPress: () => void;
    variant?: ButtonVariant;
    loading?: boolean;
    disabled?: boolean;
    style?: ViewStyle;
    icon?: React.ReactNode;
  };
  
  export function Button({
    label,
    onPress,
    variant = 'primary',
    loading = false,
    disabled = false,
    style,
    icon,
  }: Props) {
    return (
      <TouchableOpacity
        style={[styles.base, styles[variant], disabled && styles.disabled, style]}
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.75}
      >
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? '#0d0d0b' : '#fff'} />
        ) : (
          <View style={styles.inner}>
          {icon && <View style={styles.iconWrap}>{icon}</View>}
          <Text style={[styles.label, styles[`${variant}Label`]]}>{label}</Text>
        </View>
        )}
      </TouchableOpacity>
    );
  }
  
  const styles = StyleSheet.create({
    base: {
      width: '100%',
      paddingVertical: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // variant: primary
    primary: {
      backgroundColor: '#faf9f6',
    },
    primaryLabel: {
      fontFamily: 'Manrope_700Bold',
      fontSize: 10,
      letterSpacing: 4,
      color: '#0d0d0b',
    },
    // variant: ghost (테두리만)
    ghost: {
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.3)',
      backgroundColor: 'transparent',
    },
    ghostLabel: {
      fontFamily: 'Manrope_500Medium',
      fontSize: 10,
      letterSpacing: 5,
      color: '#fff',
    },
    // variant: text (텍스트 링크)
    text: {
      backgroundColor: 'transparent',
    },
    textLabel: {
      fontFamily: 'Manrope_500Medium',
      fontSize: 10,
      letterSpacing: 4,
      color: 'rgba(255,255,255,0.35)',
    },
    label: {},
    disabled: { opacity: 0.4 },
    inner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrap: {
      marginRight: 8,
    },
  });