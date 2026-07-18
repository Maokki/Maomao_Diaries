import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import UpdateBar from '../components/UpdateBar';

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
    }
  }, []);

  return (
    <>
      <UpdateBar />
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="light" hidden={true} />
    </>
  );
}