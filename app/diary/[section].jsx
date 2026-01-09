// app/diary/[section].jsx - Maomao Aesthetic
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  ScrollView, 
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native'
import React, { useState } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import { useDiaryItems } from '../hooks/useDiaryStorage';
import { Image } from 'react-native';

const DiarySections = () => {
  const { section } = useLocalSearchParams();
  const router = useRouter();
  
  const { items, addItem, updateItem, deleteItem, isLoading } = useDiaryItems(section);
  
  const [expandedItems, setExpandedItems] = useState({});
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentItem, setCurrentItem] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const openNewItem = () => {
    setCurrentItem('');
    setEditingIndex(null);
    setIsModalVisible(true);
  };

  const openEditItem = (index) => {
    setCurrentItem(items[index].text);
    setEditingIndex(index);
    setIsModalVisible(true);
  };

  const saveItem = async () => {
    if (currentItem.trim()) {
      try {
        if (editingIndex !== null) {
          await updateItem(editingIndex, currentItem);
        } else {
          await addItem(currentItem);
        }
        
        setIsModalVisible(false);
        setCurrentItem('');
        setEditingIndex(null);
      } catch (error) {
        console.error('Error saving item:', error);
        alert('Failed to save item. Please try again.');
      }
    }
  };

  const handleDeleteItem = async (index) => {
    try {
      await deleteItem(index);
      
      const itemToDelete = items[index];
      setExpandedItems(prev => {
        const newExpanded = {...prev};
        delete newExpanded[itemToDelete.id];
        return newExpanded;
      });
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#6B8E4E" />
          <Text style={styles.loadingText}>Loading {section}...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={26} color="#7B5E7B" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Ionicons name="leaf" size={24} color="#6B8E4E" />
          <Text style={styles.headerTitle} numberOfLines={1}>{section}</Text>
        </View>
        
        <TouchableOpacity onPress={openNewItem} style={styles.addButton}>
          <Ionicons name="add-circle" size={32} color="#6B8E4E" />
        </TouchableOpacity>
      </View>

      {/* Items List */}
      <ScrollView style={styles.scrollView}>
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyImageContainer}>
              <Image 
                source={require('../../assets/hmmm.jpg')} 
                style={styles.emptyImage} 
              />
            </View>
            <Text style={styles.emptyText}>No diaries made yet</Text>
            <Text style={styles.emptySubtext}>Add your first diary as Maomao demands you to</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={openNewItem}>
              <Ionicons name="flask" size={20} color="white" />
              <Text style={styles.emptyButtonText}>Start Writing</Text>
            </TouchableOpacity>
          </View>
        ) : (
          items.map((item, index) => {
            const isExpanded = expandedItems[item.id];
            
            return (
              <View key={item.id} style={styles.itemCard}>
                <TouchableOpacity 
                  style={styles.itemContent}
                  onPress={() => toggleExpand(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemHeader}>
                    <View style={styles.itemIconCircle}>
                      <Ionicons name="document-text" size={18} color="#7B5E7B" />
                    </View>
                    <View style={styles.expandIndicator}>
                      <Ionicons 
                        name={isExpanded ? "chevron-up-circle" : "chevron-down-circle"} 
                        size={20} 
                        color="#6B8E4E" 
                      />
                    </View>
                  </View>
                  
                  <Text 
                    style={styles.itemText} 
                    numberOfLines={isExpanded ? undefined : 1}
                  >
                    {item.text}
                  </Text>
                  
                  <View style={styles.itemFooter}>
                    <View style={styles.dateContainer}>
                      <Ionicons name="time-outline" size={14} color="#B8A5B8" />
                      <Text style={styles.itemDate}>{item.lastModified}</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => openEditItem(index)}
                  >
                    <Ionicons name="create-outline" size={20} color="#7B5E7B" />
                    <Text style={styles.actionText}>Edit</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.buttonDivider} />
                  
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => handleDeleteItem(index)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#C85C5C" />
                    <Text style={[styles.actionText, { color: '#C85C5C' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Modal for Adding/Editing Items */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setIsModalVisible(false)}
              style={styles.modalCancelButton}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            
            <View style={styles.modalTitleContainer}>
              <Ionicons 
                name={editingIndex !== null ? "create" : "flask"} 
                size={24} 
                color="#6B8E4E" 
              />
              <Text style={styles.modalTitle}>
                {editingIndex !== null ? 'Edit Entry' : 'New Entry'}
              </Text>
            </View>
            
            <TouchableOpacity 
              onPress={saveItem}
              style={styles.modalSaveButton}
            >
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>

          {/* Big Text Input */}
          <ScrollView style={styles.modalContent}>
            <TextInput
              style={styles.notepad}
              multiline
              placeholder="Document your findings like Maomao..."
              placeholderTextColor="#B8A5B8"
              value={currentItem}
              onChangeText={setCurrentItem}
              textAlignVertical="top"
              autoFocus
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

export default DiarySections

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5EFE6',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    backgroundColor: 'white',
    padding: 40,
    borderRadius: 28,
    alignItems: 'center',
    shadowColor: '#6B8E4E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#9CAF88',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 17,
    color: '#4A403A',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 3,
    borderBottomColor: '#D4A574',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EDE7F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A403A',
    letterSpacing: 0.5,
  },
  addButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
    padding: 10,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    paddingHorizontal: 32,
  },
  emptyImageContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 4,
    borderColor: '#D4A574',
    shadowColor: '#6B8E4E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  emptyImage: {
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4A403A',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#8B8680',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#6B8E4E',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 24,
    marginTop: 24,
    shadowColor: '#4A7C59',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 18,
    paddingTop: 14,
    marginBottom: 16,
    shadowColor: '#6B8E4E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 5,
    borderLeftColor: '#7B5E7B',
  },
  itemContent: {
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EDE7F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandIndicator: {
    padding: 4,
  },
  itemText: {
    fontSize: 16,
    color: '#4A403A',
    lineHeight: 24,
    marginBottom: 12,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5EFE6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  itemDate: {
    fontSize: 12,
    color: '#8B8680',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 2,
    borderTopColor: '#F5EFE6',
    paddingTop: 14,
    marginTop: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  buttonDivider: {
    width: 2,
    height: 24,
    backgroundColor: '#E0E0E0',
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#7B5E7B',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5EFE6',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 3,
    borderBottomColor: '#D4A574',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  modalCancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4A403A',
  },
  modalSaveButton: {
    backgroundColor: '#6B8E4E',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  cancelText: {
    fontSize: 16,
    color: '#C85C5C',
    fontWeight: '600',
  },
  saveText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
  },
  modalContent: {
    flex: 1,
  },
  notepad: {
    flex: 1,
    padding: 24,
    fontSize: 17,
    color: '#4A403A',
    minHeight: 500,
    lineHeight: 26,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#9CAF88',
    shadowColor: '#6B8E4E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
});