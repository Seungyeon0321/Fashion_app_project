// app/closet/[id].tsx
import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ClothingDetailPage } from '@/pages/closet-detail/ui/ClothingDetailPage';
import { useClosetItems, useToggleFavorite } from '@/features/closet/api/useCloset';
import { colors } from '@/shared/lib/tokens';

export default function ClothingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const numericId = Number(id);

  const { data: items = [] } = useClosetItems();
  const item = items.find((i) => i.id === numericId);
  const toggleFavorite = useToggleFavorite(numericId);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Detail',
          headerBackTitle: '',
          headerTitleAlign: 'center',
          headerStyle: styles.header,
          headerShadowVisible: true,
          headerTintColor: colors.primary,
          headerRight: () => (
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={() => toggleFavorite.mutate(!item?.isFavorite)} hitSlop={12}>
                <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                    stroke={item?.isFavorite ? colors.accentRed : colors.hint}
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill={item?.isFavorite ? colors.accentRed : 'none'}
                  />
                </Svg>
              </TouchableOpacity>

              <TouchableOpacity hitSlop={12}>
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                    stroke={colors.primary}
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <Path
                    d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                    stroke={colors.primary}
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <ClothingDetailPage id={numericId} />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.background,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingRight: 10,
  },
});