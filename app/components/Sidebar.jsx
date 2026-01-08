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
  Alert,
  ScrollView
} from 'react-native';
import React, { useRef, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { useDiarySections } from '../hooks/useDiaryStorage';

const SIDEBAR_WIDTH = 250;

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [sectionText, setSectionText] = useState('');
  
  // State for the context menu (rename/delete popup)
  const [selectedSection, setSelectedSection] = useState(null);
  const [isContextMenuVisible, setIsContextMenuVisible] = useState(false);
  
  // State for rename modal
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [renameText, setRenameText] = useState('');
  
  // Get the hook functions - now includes reloadSections
  const { sections, addSection, deleteSection, renameSection, reloadSections, isLoading } = useDiarySections();
  
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

  /**
   * Add a new section
   * State updates automatically after addSection completes
   */
  const handleAddSection = async () => {
    if (sectionText.trim()) {
      try {
        await addSection(sectionText);
        setSectionText(''); // Clear input after successful add
        // No need to manually refresh - the hook updates state automatically
      } catch (error) {
        console.error('Error adding section:', error);
        Alert.alert('Error', 'Failed to add section. Please try again.');
      }
    }
  };

  /**
   * Open context menu when 3-dot button is pressed
   */
  const openContextMenu = (section, e) => {
    e.stopPropagation();
    setSelectedSection(section);
    setIsContextMenuVisible(true);
  };

  /**
   * Close the context menu
   */
  const closeContextMenu = () => {
    setIsContextMenuVisible(false);
    setSelectedSection(null);
  };

  /**
   * Open the rename modal
   */
  const openRenameModal = () => {
    setRenameText(selectedSection);
    setIsContextMenuVisible(false);
    setIsRenameModalVisible(true);
  };

  /**
   * Rename the selected section
   * State updates automatically after renameSection completes
   */
  const handleRename = async () => {
    if (renameText.trim() && renameText !== selectedSection) {
      try {
        await renameSection(selectedSection, renameText);
        
        // Close modal and reset
        setIsRenameModalVisible(false);
        setRenameText('');
        setSelectedSection(null);
        
        // No need to manually refresh - the hook updates state automatically
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

  /**
   * Delete the selected section with confirmation
   * State updates automatically after deleteSection completes
   */
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
              
              // No need to manually refresh - the hook updates state automatically
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
        <ScrollView
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.scrollContent}
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
        </ScrollView>

      </Animated.View>

      {/* Context Menu Modal */}
      <Modal
        visible={isContextMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeContextMenu}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={closeContextMenu}
        >
          <View style={styles.contextMenu}>
            <Text style={styles.contextMenuTitle}>
              {selectedSection}
            </Text>
            
            <TouchableOpacity 
              style={styles.contextMenuItem}
              onPress={openRenameModal}
            >
              <Ionicons name="create-outline" size={24} color="#509107ff" />
              <Text style={styles.contextMenuText}>Rename</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.contextMenuItem}
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={24} color="#ff3b30" />
              <Text style={[styles.contextMenuText, styles.deleteText]}>Delete</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.contextMenuItem, styles.cancelButton]}
              onPress={closeContextMenu}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Rename Modal */}
      <Modal
        visible={isRenameModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsRenameModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setIsRenameModalVisible(false)}
        >
          <Pressable style={styles.renameModal}>
            <Text style={styles.renameTitle}>Rename Section</Text>
            
            <TextInput
              style={styles.renameInput}
              value={renameText}
              onChangeText={setRenameText}
              placeholder="Enter new name..."
              placeholderTextColor="#999"
              autoFocus
              onSubmitEditing={handleRename}
            />

            <View style={styles.renameButtons}>
              <TouchableOpacity 
                style={[styles.renameButton, styles.renameCancelButton]}
                onPress={() => {
                  setIsRenameModalVisible(false);
                  setRenameText('');
                }}
              >
                <Text style={styles.renameCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.renameButton, styles.renameSaveButton]}
                onPress={handleRename}
              >
                <Text style={styles.renameSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export default Sidebar;

// Styles remain the same...
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
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
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
  menuItemWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  linkWrapper: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingRight: 10,
  },
  menuText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  menuButton: {
    padding: 10,
    paddingRight: 0,
    justifyContent: 'center',
    alignItems: 'center',
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
    padding: 20,
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  contextMenuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  contextMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#f8f8f8',
  },
  contextMenuText: {
    fontSize: 16,
    marginLeft: 15,
    color: '#333',
  },
  deleteText: {
    color: '#ff3b30',
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
    flex: 1,
  },
  renameModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  renameTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  renameInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f8f8',
    marginBottom: 20,
  },
  renameButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  renameButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  renameCancelButton: {
    backgroundColor: '#e0e0e0',
  },
  renameCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  renameSaveButton: {
    backgroundColor: '#509107ff',
  },
  renameSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});