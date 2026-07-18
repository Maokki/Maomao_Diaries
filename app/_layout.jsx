import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { AppMetrics, AppMetricsRoot } from 'expo-observe';
import UpdateBar from '../components/UpdateBar';

function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
    }
    AppMetrics.markInteractive();
  }, []);

  return (
    <>
      <UpdateBar />
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="light" hidden={true} />
    </>
  );
}

export default AppMetricsRoot.wrap(RootLayout);