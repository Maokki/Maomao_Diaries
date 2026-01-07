// app/index.jsx
import { StyleSheet, View, Text } from 'react-native';
import Sidebar from './components/Sidebar';

export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Maomao Diaries</Text>
      <Sidebar />
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