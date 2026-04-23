import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ProfileHeaderProps = {
  name: string;
  email: string;
  avatarUrl?: string | null;
  onEditPress: () => void;
};

export function ProfileHeader({ name, email, avatarUrl, onEditPress }: ProfileHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.avatarWrapper}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <TouchableOpacity style={styles.editButton} onPress={onEditPress} activeOpacity={0.8}>
          <Ionicons name="pencil" size={13} color="#faf7f6" />
        </TouchableOpacity>
      </View>

      <Text style={styles.name}>{name.toUpperCase()}</Text>
      <Text style={styles.email}>{email}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 1,
    borderColor: 'rgba(47, 52, 48, 0.08)',
  },
  avatarFallback: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#e5e2e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: 'Epilogue_800ExtraBold',
    fontSize: 40,
    color: '#5f5e5e',
  },
  editButton: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2f3430',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontFamily: 'Epilogue_900Black',
    fontSize: 26,
    letterSpacing: -0.8,
    color: '#1a1a1a',
    marginBottom: 6,
  },
  email: {
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    letterSpacing: 0.3,
    color: '#5c605c',
  },
});
