import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
      <Tabs>
        <Tabs.Screen name="home" options={{ headerShown: false }} />
        <Tabs.Screen name="camera" options={{ headerShown: false }} />
      </Tabs>
  );
}
