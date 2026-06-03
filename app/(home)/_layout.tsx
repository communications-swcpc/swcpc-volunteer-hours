import { Stack } from 'expo-router';
import { Image, TouchableOpacity, Text, View } from 'react-native';
import { useSession } from '@/context/SessionContext';

export default function HomeLayout() {
  const { signOut } = useSession();

  const logoLeft = () => (
    <View style={{
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
    }}>
      <Image
        source={require('../../assets/logo.png')}
        style={{ width: 32, height: 32 }}
        resizeMode="contain"
      />
    </View>
  );

  const signOutRight = () => (
    <TouchableOpacity onPress={signOut} style={{ marginRight: 16 }}>
      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>Sign Out</Text>
    </TouchableOpacity>
  );

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#2d6a4f' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: '#f9fafb' },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: '',
          headerLeft: logoLeft,
          headerRight: signOutRight,
        }}
      />
      <Stack.Screen
        name="log-hours"
        options={{
          title: 'Log Volunteer Hours',
        }}
      />
      <Stack.Screen
        name="reimbursement"
        options={{
          title: 'Reimbursement',
        }}
      />
      <Stack.Screen
        name="review-reimbursements"
        options={{
          title: 'Review Reimbursements',
        }}
      />
    </Stack>
  );
}
