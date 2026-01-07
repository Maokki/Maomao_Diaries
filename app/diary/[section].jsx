// app/diary/[section].jsx
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
import { useDiaryItems } from '../hooks/useDiaryStorage'; // import custom hook

const DiarySections = () => {
  const { section } = useLocalSearchParams();
  const router = useRouter();
  
  // Use our custom hook to manage items for this section
  // Pass the section name to load the correct items
  const { items, addItem, updateItem, deleteItem, isLoading } = useDiaryItems(section);
  
  // State for expanded items (UI only, not stored)
  const [expandedItems, setExpandedItems] = useState({});
  
  // State for modal
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

  // Updated to use the hook's functions
  const saveItem = async () => {
    if (currentItem.trim()) {
      try {
        if (editingIndex !== null) {
          // Update existing item using the hook
          await updateItem(editingIndex, currentItem);
        } else {
          // Add new item using the hook
          await addItem(currentItem);
        }
        
        // Close modal and reset state
        setIsModalVisible(false);
        setCurrentItem('');
        setEditingIndex(null);
      } catch (error) {
        // You can add error handling UI here (like a Toast or Alert)
        console.error('Error saving item:', error);
        alert('Failed to save item. Please try again.');
      }
    }
  };

  // Updated to use the hook's deleteItem function
  const handleDeleteItem = async (index) => {
    try {
      await deleteItem(index);
      
      // Remove from expanded items
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

  // Show loading indicator while data is loading
  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#509107ff" />
        <Text style={styles.loadingText}>Loading {section}...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#509107ff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{section}</Text>
        <TouchableOpacity onPress={openNewItem}>
          <Ionicons name="add-circle" size={28} color="#509107ff" />
        </TouchableOpacity>
      </View>

      {/* Items List */}
      <ScrollView style={styles.scrollView}>
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={80} color="#ccc" />
            <Text style={styles.emptyText}>No items yet</Text>
            <Text style={styles.emptySubtext}>Tap the + button to add your first item</Text>
          </View>
        ) : (
          items.map((item, index) => {
            const isExpanded = expandedItems[item.id];
            
            return (
              <View key={item.id} style={styles.itemCard}>
                {/* Item Content - Click to Expand/Collapse */}
                <TouchableOpacity 
                  style={styles.itemContent}
                  onPress={() => toggleExpand(item.id)}
                  activeOpacity={0.7}
                >
                  <Text 
                    style={styles.itemText} 
                    numberOfLines={isExpanded ? undefined : 3}
                  >
                    {item.text}
                  </Text>
                  <View style={styles.itemFooter}>
                    <Text style={styles.itemDate}>{item.lastModified}</Text>
                    <Ionicons 
                      name={isExpanded ? "chevron-up" : "chevron-down"} 
                      size={16} 
                      color="#999" 
                    />
                  </View>
                </TouchableOpacity>

                {/* Action Buttons - Edit and Delete */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => openEditItem(index)}
                  >
                    <Ionicons name="create-outline" size={20} color="#509107ff" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => handleDeleteItem(index)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#ff3b30" />
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
            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingIndex !== null ? 'Edit Item' : 'New Item'}
            </Text>
            <TouchableOpacity onPress={saveItem}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>

          {/* Big Text Input */}
          <ScrollView style={styles.modalContent}>
            <TextInput
              style={styles.notepad}
              multiline
              placeholder="Write your note here..."
              placeholderTextColor="#999"
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
    backgroundColor: '#f8f8f8',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#999',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollView: {
    flex: 1,
    padding: 15,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#999',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 10,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemContent: {
    marginBottom: 10,
  },
  itemText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    marginBottom: 8,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemDate: {
    fontSize: 12,
    color: '#999',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 10,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f9e8',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fff0f0',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cancelText: {
    fontSize: 16,
    color: '#ff3b30',
  },
  saveText: {
    fontSize: 16,
    color: '#509107ff',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
  },
  notepad: {
    flex: 1,
    padding: 20,
    fontSize: 16,
    color: '#333',
    minHeight: 500,
    lineHeight: 24,
  },
});