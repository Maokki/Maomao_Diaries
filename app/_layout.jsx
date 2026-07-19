// app/_layout.jsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import { Observe, ObserveRoot, useObserve } from 'expo-observe';
import UpdateBar from '../components/UpdateBar';

// Configure Observe for analytics and event tracking
Observe.configure({
  integrations: { 'expo-router': true },
});

function RootLayout() {
  const { markInteractive } = useObserve();

  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden');
    }

    markInteractive();
  }, [markInteractive]);

  return (
    <>
      <UpdateBar />
      <Stack screenOptions={{ headerShown: false }} />
      <StatusBar style="light" hidden={true} />
    </>
  );
}

export default ObserveRoot.wrap(RootLayout);