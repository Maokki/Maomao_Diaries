// app/components/Sidebar.jsx
import { StyleSheet, Text, View, TouchableOpacity, Animated, Dimensions, TextInput, Pressable, ActivityIndicator } from 'react-native';
import React, { useRef, useState, useEffect } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { useDiarySections } from '../hooks/useDiaryStorage'; // import custom hook

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.7;

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [sectionText, setSectionText] = useState('');
  
  // Use our custom hook to manage sections
  // This replaces the old useState([]) for sections
  const { sections, addSection, deleteSection, isLoading } = useDiarySections();
  
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

  const toggleSidebar = () => {
    const toValue = isOpen ? -SIDEBAR_WIDTH : 0;
    
    Animated.timing(slideAnim, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    setIsOpen(!isOpen);
  };

  // Updated to use the hook's addSection function
  const handleAddSection = async () => {
    if (sectionText.trim()) {
      await addSection(sectionText); // This now saves to AsyncStorage
      setSectionText('');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.toggleButton}
        onPress={toggleSidebar}
      >
        <Ionicons name={isOpen ? "close" : "menu"} size={32} color="white" />
      </TouchableOpacity>

      <Animated.View 
        style={[
          styles.sidebar,
          {
            transform: [{ translateX: slideAnim }]
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={toggleSidebar}
        >
          <Ionicons name="arrow-back" size={24} color="#509107ff" />
        </TouchableOpacity>

        <Text style={styles.sidebarTitle}>Diary Section</Text>

        <View style={styles.addSection}>
          <TextInput
            style={styles.input}
            placeholder="Add Section..."
            placeholderTextColor="#999"
            value={sectionText}
            onChangeText={setSectionText}
            onSubmitEditing={handleAddSection}
            returnKeyType="done"
          />
          <Pressable onPress={handleAddSection}>
            <Ionicons name="add-circle" size={28} color="#509107ff" />
          </Pressable>
        </View>

        {/* Show loading indicator while data is loading */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#509107ff" />
        ) : (
          // Map through sections loaded from AsyncStorage
          sections.map((section, index) => (
            <Link
              key={index}
              href={`/diary/${encodeURIComponent(section)}`}
              asChild
            >
              <Pressable 
                style={styles.menuItem}
                onPress={toggleSidebar}
              >
                <Text style={styles.menuText}>{section}</Text>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </Pressable>
            </Link>
          ))
        )}

      </Animated.View>
    </View>
  );
};

export default Sidebar;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 1000,
  },
  addSection: {
    flexDirection: 'row',  
    alignItems: 'center',   
    marginBottom: 30,
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  toggleButton: {
    position: 'absolute',
    left: 20,
    top: 50,
    width: 50,
    height: 50,
    backgroundColor: '#509107ff',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1001,
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: '#f8f8f8',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  backButton: {
    marginTop: 40,
    marginBottom: 20,
    padding: 10,
  },
  sidebarTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#333',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  menuText: {
    fontSize: 16,
    color: '#333',
  },
});