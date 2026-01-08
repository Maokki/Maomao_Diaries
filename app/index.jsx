//app/index.jsx
import { StyleSheet, View, Text } from 'react-native';
import { useRef } from 'react';
import Sidebar from './components/Sidebar';
import BackupButton from './components/BackupButton';

export default function Home() {
  const sidebarRefreshRef = useRef(null);

  const handleDataRefresh = async () => {
    console.log('🔄 Refreshing data after import...');
    
    // call the sidebar's refresh function if it exists
    if (sidebarRefreshRef.current) {
      await sidebarRefreshRef.current();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Maomao Diaries</Text>
      
      <Sidebar refreshRef={sidebarRefreshRef} />
      <BackupButton onDataRefresh={handleDataRefresh} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 60,
    color: '#333',
  },
});

