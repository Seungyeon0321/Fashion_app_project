import { Tabs, useRouter, type Href } from 'expo-router';
import { BottomTabBar } from '@/shared/ui/BottomTabBar';

type BarTab = 'home' | 'stylist' | 'style' | 'profile';

function routeNameToBarTab(routeName: string): BarTab {
  console.log(routeName, 'routeNameToBarTab');
  switch (routeName) {
    case 'home':
      return 'home';
    case 'stylist':
      return 'stylist';
    case 'style':
      return 'style';
    case 'profile':
      return 'profile';
    default:
      return 'home';
  }
}

function barTabToHref(tab: BarTab): Href {
  switch (tab) {
    case 'home':
      return '/(tabs)/home';
    case 'stylist':
      return '/(tabs)/stylist';
    case 'style':
      return '/(tabs)/style';
    case 'profile':
      return '/(tabs)/profile';
  }
}

export default function TabLayout() {
  const router = useRouter();

  return (
    <Tabs
      tabBar={(props) => (
        <BottomTabBar
          activeTab={routeNameToBarTab(
            props.state.routes[props.state.index].name as BarTab,
          )}
          onTabPress={(tab) => {
            router.push(barTabToHref(tab as BarTab));
          }}
        />
      )}
    >
      <Tabs.Screen name="home" options={{ headerShown: false }} />
      <Tabs.Screen name="stylist"  options={{ headerShown: false }} />
      <Tabs.Screen name="style"    options={{ headerShown: false }} />
      <Tabs.Screen name="profile"  options={{ headerShown: false }} />
    </Tabs>
  );
}