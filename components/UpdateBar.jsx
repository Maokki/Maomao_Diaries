// components/UpdateBar.jsx
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Updates from 'expo-updates';

export default function UpdateBar() {
  const { isUpdatePending, isUpdateAvailable, isDownloading, isChecking } = Updates.useUpdates();

  // Nothing to show: no update downloaded yet, and nothing in progress
  if (!isUpdatePending && !isDownloading && !isChecking && !isUpdateAvailable) {
    return null;
  }

  const handleReload = async () => {
    try {
      await Updates.reloadAsync();
    } catch (e) {
      console.error('Error reloading app to apply update:', e);
    }
  };

  return (
    <View style={styles.bar}>
      {isUpdatePending ? (
        <>
          <Ionicons name="sparkles" size={18} color="#fff" />
          <Text style={styles.text}>A new update is ready</Text>
          <TouchableOpacity style={styles.button} onPress={handleReload}>
            <Text style={styles.buttonText}>Restart</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.text}>
            {isDownloading ? 'Downloading update…' : 'Checking for updates…'}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#6B8E4E',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#fff',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginLeft: 4,
  },
  buttonText: {
    color: '#4A7C59',
    fontSize: 13,
    fontWeight: '700',
  },
});