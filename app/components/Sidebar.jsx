// app/components/Sidebar.jsx - Maomao Aesthetic

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
  ScrollView,
} from 'react-native';
import React, { useRef, useState, useEffect } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Link } from 'expo-router';
import { useDiarySections } from '../hooks/useDiaryStorage';

const SIDEBAR_WIDTH = 280;

const Sidebar = ({ refreshRef }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [sectionText, setSectionText] = useState('');
  const [selectedSection, setSelectedSection] = useState(null);
  const [isContextMenuVisible, setIsContextMenuVisible] = useState(false);
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [renameText, setRenameText] = useState('');

  const { sections, addSection, deleteSection, renameSection, refreshSections, isLoading } = useDiarySections();
  
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

  useEffect(() => {
    if (refreshRef) {
      refreshRef.current = refreshSections;
    }
  }, [refreshRef, refreshSections]);

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
      <TouchableOpacity style={styles.toggleButton} onPress={toggleSidebar}>
        <Ionicons name={isOpen ? "close" : "menu"} size={28} color="white" />
      </TouchableOpacity>

      <Animated.View
        style={[
          styles.sidebar,
          { transform: [{ translateX: slideAnim }] }
        ]}
      >
        <View style={styles.sidebarHeader}>
          <TouchableOpacity style={styles.backButton} onPress={toggleSidebar}>
            <Ionicons name="arrow-back" size={26} color="#6B8E4E" />
          </TouchableOpacity>
          
          <View style={styles.titleContainer}>
            <Ionicons name="book" size={32} color="#7B5E7B" />
            <Text style={styles.sidebarTitle}>Diary Section</Text>
          </View>
        </View>

        <View style={styles.addSection}>
          <TextInput
            style={styles.input}
            placeholder="New section..."
            placeholderTextColor="#B8A5B8"
            value={sectionText}
            onChangeText={setSectionText}
            onSubmitEditing={handleAddSection}
            returnKeyType="done"
          />
          <Pressable onPress={handleAddSection} style={styles.addButton}>
            <Ionicons name="add-circle" size={32} color="#6B8E4E" />
          </Pressable>
        </View>

        <ScrollView 
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.categories}>
            {isLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color="#6B8E4E" />
              </View>
            ) : sections.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="folder-open-outline" size={64} color="#D4A574" />
                </View>
                <Text style={styles.emptyText}>No sections yet</Text>
                <Text style={styles.emptySubtext}>Begin your apothecary journal</Text>
              </View>
            ) : (
              sections.map((section, index) => (
                <View key={index} style={styles.categoryRow}>
                  <Link
                    href={`/diary/${encodeURIComponent(section)}`}
                    asChild
                    style={styles.categoryTouchable}
                  >
                    <Pressable style={styles.categoryItem} onPress={toggleSidebar}>
                      <View style={styles.categoryContent}>
                        <View style={styles.iconCircle}>
                          <Ionicons name="calendar" size={20} color="#6B8E4E" />
                        </View>
                        <Text style={styles.categoryText} numberOfLines={1}>
                          {section}
                        </Text>
                      </View>
                    </Pressable>
                  </Link>

                  <TouchableOpacity
                    onPress={(e) => openContextMenu(section, e)}
                    style={styles.menuButton}
                  >
                    <Ionicons name="ellipsis-vertical" size={22} color="#7B5E7B" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </ScrollView>
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
            <View style={styles.contextMenuHeader}>
              <Ionicons name="leaf" size={24} color="#6B8E4E" />
              <Text style={styles.contextMenuTitle}>{selectedSection}</Text>
            </View>

            <TouchableOpacity style={styles.menuItem} onPress={openRenameModal}>
              <View style={styles.menuIconCircle}>
                <Ionicons name="create-outline" size={20} color="#7B5E7B" />
              </View>
              <Text style={styles.menuItemText}>Rename Section</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuItem, styles.deleteMenuItem]}
              onPress={handleDelete}
            >
              <View style={[styles.menuIconCircle, styles.deleteIconCircle]}>
                <Ionicons name="trash-outline" size={20} color="#C85C5C" />
              </View>
              <Text style={[styles.menuItemText, { color: '#C85C5C' }]}>Delete Section</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelMenuItem} onPress={closeContextMenu}>
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
            <View style={styles.renameHeader}>
              <Ionicons name="create" size={28} color="#6B8E4E" />
              <Text style={styles.modalTitle}>Rename Section</Text>
            </View>

            <TextInput
              style={styles.modalInput}
              value={renameText}
              onChangeText={setRenameText}
              placeholder="Enter new name..."
              placeholderTextColor="#B8A5B8"
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
    right: 0,
    zIndex: 1000,
    pointerEvents: 'box-none',
  },
  toggleButton: {
    position: 'absolute',
    left: 20,
    top: 50,
    width: 56,
    height: 56,
    backgroundColor: '#7B5E7B',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5C4A5C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1001,
  },
  sidebar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: '#F5EFE6',
    paddingTop: 24,
    zIndex: 100,
    shadowColor: '#4A403A',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  sidebarHeader: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#D4A574',
  },
  backButton: {
    marginTop: 20,
    marginBottom: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sidebarTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A403A',
    letterSpacing: 0.5,
  },
  addSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
    gap: 12,
  },
  input: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#9CAF88',
    borderRadius: 16,
    padding: 14,
    fontSize: 15,
    backgroundColor: '#fff',
    color: '#4A403A',
  },
  addButton: {
    padding: 4,
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  categories: {
    paddingTop: 12,
    paddingBottom: 24,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#6B8E4E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#6B8E4E',
  },
  categoryTouchable: {
    flex: 1,
  },
  categoryItem: {
    flex: 1,
    paddingVertical: 16,
    paddingLeft: 16,
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryText: {
    color: "#4A403A",
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  menuButton: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFF8E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#8B8680',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#B8A5B8',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(74, 64, 58, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contextMenu: {
    backgroundColor: '#F5EFE6',
    borderRadius: 24,
    padding: 20,
    width: '75%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 3,
    borderColor: '#D4A574',
  },
  contextMenuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#D4A574',
  },
  contextMenuTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A403A',
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
  },
  menuIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EDE7F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteMenuItem: {
    backgroundColor: '#FFEBEE',
  },
  deleteIconCircle: {
    backgroundColor: '#FFCDD2',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A403A',
    flex: 1,
  },
  cancelMenuItem: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#E0E0E0',
    borderRadius: 16,
    marginTop: 8,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B8680',
  },
  renameModal: {
    backgroundColor: '#F5EFE6',
    borderRadius: 28,
    padding: 28,
    width: '85%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 3,
    borderColor: '#9CAF88',
  },
  renameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4A403A',
  },
  modalInput: {
    borderWidth: 2,
    borderColor: '#9CAF88',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
    backgroundColor: '#fff',
    color: '#4A403A',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#8B8680',
  },
  saveButton: {
    backgroundColor: '#6B8E4E',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});