import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Image } from 'react-native';

export default function RootLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#2d6a4f' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#f9fafb' },
          headerTitle: () => null,
          headerLeft: () => (
            <Image
              source={require('../assets/logo.png')}
              style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', marginLeft: 8 }}
              resizeMode="contain"
            />
          ),
        }}
      />
    </View>
  );
}
