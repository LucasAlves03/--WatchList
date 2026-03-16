import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

export default function Layout() {
  return(
    <Stack
     screenOptions={{
      headerShown: false,
      contentStyle: { backgroundColor: '#0F172A'},
      animation: 'fade' }} />

  ); 
}