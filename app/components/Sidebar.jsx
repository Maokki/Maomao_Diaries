// app/components/Sidebar.jsx
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  TextInput,
  Pressable,
  ActivityIndicator,
  Modal,
  Alert
} from 'react-native';
import React, { useRef, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { useDiarySections } from '../hooks/useDiaryStorage';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.7;

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [sectionText, setSectionText] = useState('');
  
  const [selectedSection, setSelectedSection] = useState(null);
  const [isContextMenuVisible, setIsContextMenuVisible] = useState(false);
  
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [renameText, setRenameText] = useState('');
  
  const { sections, addSection, deleteSection, renameSection, isLoading } = useDiarySections();
  
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

  const handleAddSection = async () => {
    if (sectionText.trim()) {
      try {
        await addSection(sectionText);
        setSectionText('');
      } catch (error) {
        console.error('Error adding section:', error);
        Alert.alert('Error', 'Failed to add section. Please try again.');
      }
    }
  };

  const openContextMenu = (section, e) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    setSelectedSection(section);
    setIsContextMenuVisible(true);
  };

  const closeContextMenu = () => {
    setIsContextMenuVisible(false);
    setSelectedSection(null);
  };

  const openRenameModal = () => {
    setRenameText(selectedSection);
    setIsContextMenuVisible(false);
    setIsRenameModalVisible(true);
  };

  const handleRename = async () => {
    if (renameText.trim() && renameText !== selectedSection) {
      try {
        await renameSection(selectedSection, renameText);
        
        setIsRenameModalVisible(false);
        setRenameText('');
        setSelectedSection(null);
        
        Alert.alert('Success', `Section renamed to "${renameText}"`);
      } catch (error) {
        console.error('Error renaming section:', error);
        
        if (error.message === 'Section name already exists') {
          Alert.alert('Error', 'A section with this name already exists!');
        } else {
          Alert.alert('Error', 'Failed to rename section. Please try again.');
        }
      }
    } else if (renameText.trim() === '') {
      Alert.alert('Error', 'Section name cannot be empty!');
    }
  };

  const handleDelete = () => {
    setIsContextMenuVisible(false);
    
    Alert.alert(
      'Delete Section',
      `Are you sure you want to delete "${selectedSection}"? All items in this section will also be deleted.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setSelectedSection(null)
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const sectionToDelete = selectedSection;
              await deleteSection(selectedSection);
              setSelectedSection(null);
              
              Alert.alert('Deleted', `Section "${sectionToDelete}" has been deleted.`);
            } catch (error) {
              console.error('Error deleting section:', error);
              Alert.alert('Error', 'Failed to delete section. Please try again.');
            }
          }
        }
      ]
    );
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

        {isLoading ? (
          <ActivityIndicator size="large" color="#509107ff" />
        ) : (
          sections.map((section, index) => (
            <View key={index} style={styles.menuItemWrapper}>
              <Link
                href={`/diary/${encodeURIComponent(section)}`}
                asChild
                style={styles.linkWrapper}
              >
                <Pressable 
                  style={styles.menuItem}
                  onPress={toggleSidebar}
                >
                  <Text style={styles.menuText}>{section}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#999" />
                </Pressable>
              </Link>

              <TouchableOpacity
                style={styles.menuButton}
                onPress={(e) => openContextMenu(section, e)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          ))
        )}

      </Animated.View>

      {/* Context Menu Modal */}
      <Modal
        visible={isContextMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeContextMenu}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeContextMenu}
        >
          <View style={styles.contextMenu} onStartShouldSetResponder={() => true}>
            <Text style={styles.contextMenuTitle}>
              {selectedSection}
            </Text>
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={openRenameModal}
            >
              <Ionicons name="create-outline" size={20} color="#509107ff" />
              <Text style={styles.menuItemText}>Rename</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, styles.deleteMenuItem]}
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={20} color="#ff3b30" />
              <Text style={[styles.menuItemText, { color: '#ff3b30' }]}>Delete</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelMenuItem}
              onPress={closeContextMenu}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Rename Modal */}
      <Modal
        visible={isRenameModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsRenameModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsRenameModalVisible(false)}
        >
          <View style={styles.renameModal} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Rename Section</Text>
            
            <TextInput
              style={styles.modalInput}
              value={renameText}
              onChangeText={setRenameText}
              placeholder="Enter new name..."
              placeholderTextColor="#999"
              autoFocus
              onSubmitEditing={handleRename}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setIsRenameModalVisible(false);
                  setRenameText('');
                }}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleRename}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
    position: "absolute",
    top: 0,
    left: 0,
    width: SIDEBAR_WIDTH,
    height: SCREEN_HEIGHT, // Full screen height
    backgroundColor: '#f8f8f8',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 100,
  },
  // ScrollView fills the entire sidebar
  scrollView: {
    flex: 1,
  },
  // Padding is in contentContainerStyle, not on the sidebar
  scrollContent: {
    padding: 16,
    paddingTop: 24,
    paddingBottom: 40, // Extra space at bottom
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  backButton: {
    marginTop: 20,
    marginBottom: 20,
    padding: 10,
  },
  sidebarTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  addSection: {
    flexDirection: 'row',  
    alignItems: 'center',   
    marginBottom: 20,
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#fff',
    color: '#333',
  },
  sectionsContainer: {
    marginTop: 10,
  },
  categoryRow: {
    flexDirection: "row", 
    alignItems: "center", 
    marginBottom: 8,
    borderBottomWidth: 1, 
    borderBottomColor: "#ddd",
    paddingBottom: 4,
  },
  categoryTouchable: {
    flex: 1,
  },
  categoryItem: {
    flex: 1,
    paddingVertical: 12,
  },
  categoryText: {
    color: "#333", 
    fontSize: 16,
  },
  menuButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contextMenu: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '70%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  contextMenuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 8,
  },
  deleteMenuItem: {
    backgroundColor: '#fff0f0',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
  },
  cancelMenuItem: {
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    marginTop: 4,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  renameModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#f8f8f8',
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#666',
  },
  saveButton: {
    backgroundColor: '#509107ff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
