import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useEffect } from 'react';
import { router } from 'expo-router';
import { SessionProvider, useSession } from '@/context/SessionContext';

function RootLayoutNav() {
  const { session, isHydrating } = useSession();

  useEffect(() => {
    if (isHydrating) return;
    if (!session) {
      router.replace('/sign-in');
    } else {
      router.replace('/(home)');
    }
  }, [isHydrating, session]);

  // While hydrating, render nothing (splash screen is still visible)
  if (isHydrating) return null;

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#f9fafb' },
        }}
      />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SessionProvider>
      <RootLayoutNav />
    </SessionProvider>
  );
}
