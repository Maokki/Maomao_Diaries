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
  ActivityIndicator,
  Alert,
  Image
} from 'react-native'
import React, { useState, useRef, useEffect } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import Ionicons from '@expo/vector-icons/Ionicons'
import * as ImagePicker from 'expo-image-picker'
import { useObserve } from 'expo-observe'
import { useDiaryItems } from '../../hooks/useDiaryStorage';
import { persistPickedImage, deletePersistedImage } from '../../utils/imageStorage';

const imageIdFromUri = (uri) => uri.split('/').pop();

const makeImageMarker = (uri) => `⟦img:${imageIdFromUri(uri)}⟧`;

const newImageMarkerRegex = () => /⟦img:([^⟧]+)⟧/g;

const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findUriForMarkerId = (images, id) =>
  images.find((uri) => imageIdFromUri(uri) === id);

/** Splits diary text into ordered text/image blocks for display. */
const parseDiaryContent = (text, images = []) => {
  const blocks = [];
  const seen = new Set();
  let lastIndex = 0;
  const regex = newImageMarkerRegex();
  let match;
  while ((match = regex.exec(text)) !== null) {
    const chunk = text.slice(lastIndex, match.index);
    if (chunk.trim().length > 0) {
      blocks.push({ type: 'text', value: chunk.trim() });
    }
    const uri = findUriForMarkerId(images, match[1]);
    if (uri) {
      blocks.push({ type: 'image', uri });
      seen.add(uri);
    }
    lastIndex = match.index + match[0].length;
  }
  const tail = text.slice(lastIndex);
  if (tail.trim().length > 0) {
    blocks.push({ type: 'text', value: tail.trim() });
  }
  
  images.forEach((uri) => {
    if (!seen.has(uri)) {
      blocks.push({ type: 'image', uri });
    }
  });
  return blocks;
};


const stripImageMarkers = (text) => {
  const regex = newImageMarkerRegex();
  let result = text.replace(regex, '');
  result = result.replace(/\n[ \t]*\n[ \t]*\n/g, '\n\n');
  return result.trim();
};

const getOrderedImages = (text, imageList) => {
  const ordered = [];
  const seen = new Set();
  const regex = newImageMarkerRegex();
  let match;
  while ((match = regex.exec(text)) !== null) {
    const uri = findUriForMarkerId(imageList, match[1]);
    if (uri && !seen.has(uri)) {
      ordered.push(uri);
      seen.add(uri);
    }
  }
  imageList.forEach((uri) => {
    if (!seen.has(uri)) {
      ordered.push(uri);
      seen.add(uri);
    }
  });
  return ordered;
};

const insertMarkerAtPosition = (text, uri, position) => {
  const pos = Math.max(0, Math.min(position ?? text.length, text.length));
  const before = text.slice(0, pos);
  const after = text.slice(pos);
  const marker = makeImageMarker(uri);
  const needsLeadingNewline = before.length > 0 && !before.endsWith('\n');
  const needsTrailingNewline = after.length > 0 && !after.startsWith('\n');
  const inserted = `${needsLeadingNewline ? '\n' : ''}${marker}\n${needsTrailingNewline ? '' : ''}`;
  const newText = before + inserted + after;
  const newCursor = before.length + inserted.length;
  return { newText, newCursor };
};

const DiarySections = () => {
  const { section } = useLocalSearchParams();
  const router = useRouter();
  
  const { items, addItem, updateItem, deleteItem, isLoading } = useDiaryItems(section);
  const { markInteractive } = useObserve();

  // mark the screen as interactive once the diary items have finished loading
  useEffect(() => {
    if (!isLoading) {
      markInteractive();
    }
  }, [isLoading, markInteractive]);
  
  const [expandedItems, setExpandedItems] = useState({});
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentItem, setCurrentItem] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [images, setImages] = useState([]);
  const [sessionAddedImages, setSessionAddedImages] = useState([]);
  const [isPickingImage, setIsPickingImage] = useState(false);
  const cursorPosRef = useRef(0);
  const [forcedSelection, setForcedSelection] = useState(undefined);

  // Full-screen viewer for a tapped thumbnail
  const [viewerImage, setViewerImage] = useState(null);

  const toggleExpand = (id) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const openNewItem = () => {
    setCurrentItem('');
    setEditingIndex(null);
    setImages([]);
    setSessionAddedImages([]);
    cursorPosRef.current = 0;
    setForcedSelection(undefined);
    setIsModalVisible(true);
  };

  const openEditItem = (index) => {
    const text = items[index].text;
    setCurrentItem(text);
    setEditingIndex(index);
    setImages(items[index].images || []);
    setSessionAddedImages([]);
    // Default the cursor to the end of the existing entry.
    cursorPosRef.current = text.length;
    setForcedSelection(undefined);
    setIsModalVisible(true);
  };

  const closeModal = async () => {
    // Discard any images added during this session that never got saved
    if (sessionAddedImages.length > 0) {
      const stillPresent = sessionAddedImages.filter((uri) => images.includes(uri));
      await Promise.all(stillPresent.map((uri) => deletePersistedImage(uri)));
    }
    setIsModalVisible(false);
    setCurrentItem('');
    setEditingIndex(null);
    setImages([]);
    setSessionAddedImages([]);
  };

  const saveItem = async () => {
    if (currentItem.trim()) {
      try {
        if (editingIndex !== null) {
          await updateItem(editingIndex, currentItem, images);
        } else {
          await addItem(currentItem, images);
        }
        
        setIsModalVisible(false);
        setCurrentItem('');
        setEditingIndex(null);
        setImages([]);
        setSessionAddedImages([]);
      } catch (error) {
        console.error('Error saving item:', error);
        alert('Failed to save item. Please try again.');
      }
    }
  };

  const addPickedImages = async (tempUris) => {
    setIsPickingImage(true);
    let workingText = currentItem;
    let workingCursor = cursorPosRef.current;
    const newlyPersisted = [];

    for (const tempUri of tempUris) {
      try {
        const persistedUri = await persistPickedImage(tempUri);
        const { newText, newCursor } = insertMarkerAtPosition(
          workingText,
          persistedUri,
          workingCursor
        );
        workingText = newText;
        workingCursor = newCursor;
        newlyPersisted.push(persistedUri);
      } catch (error) {
        console.error('Error saving picked image:', error);
        Alert.alert('Error', 'Could not attach that image. Please try again.');
      }
    }

    if (newlyPersisted.length > 0) {
      setCurrentItem(workingText);
      cursorPosRef.current = workingCursor;
      setForcedSelection({ start: workingCursor, end: workingCursor });
      setImages((prev) => [...prev, ...newlyPersisted]);
      setSessionAddedImages((prev) => [...prev, ...newlyPersisted]);
    }

    setIsPickingImage(false);
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Maomao needs access to your gallery to attach photos to your diary.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 5,
    });

    if (!result.canceled) {
      await addPickedImages(result.assets.map((asset) => asset.uri));
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Maomao needs camera access to take a photo for your diary.'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: false,
    });

    if (!result.canceled) {
      await addPickedImages([result.assets[0].uri]);
    }
  };

  // Keeps cursorPosRef current as the user types or taps around, and
  // releases the momentary forced-selection once it's been applied.
  const handleSelectionChange = (e) => {
    cursorPosRef.current = e.nativeEvent.selection.start;
    if (forcedSelection) setForcedSelection(undefined);
  };

  const handleAddImage = () => {
    Alert.alert('Add a Photo', 'Where would you like to add a photo from?', [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Gallery', onPress: pickFromGallery },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const removeImage = async (uriToRemove) => {
    // Strip the marker for this image out of the text too, so it doesn't
    // leave a dangling token where the photo used to be.
    const markerPattern = new RegExp(
      `\\n?⟦img:${escapeRegExp(imageIdFromUri(uriToRemove))}⟧\\n?`,
      'g'
    );
    setCurrentItem((prev) =>
      prev.replace(markerPattern, '\n').replace(/\n{3,}/g, '\n\n')
    );
    setImages((prev) => prev.filter((uri) => uri !== uriToRemove));

    // Only newly-added-this-session images are safe to delete immediately.
    // Pre-existing images stay on disk until Save actually commits the
    // removal (handled by updateItem's own cleanup diff).
    if (sessionAddedImages.includes(uriToRemove)) {
      await deletePersistedImage(uriToRemove);
      setSessionAddedImages((prev) => prev.filter((uri) => uri !== uriToRemove));
    }
  };

  const handleDeleteItem = (index) => {
    const itemToDelete = items[index];
    
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this diary entry? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteItem(index);
              
              // Remove from expanded items
              setExpandedItems(prev => {
                const newExpanded = {...prev};
                delete newExpanded[itemToDelete.id];
                return newExpanded;
              });
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('Error', 'Failed to delete item. Please try again.');
            }
          }
        }
      ]
    );
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
                  
                  {isExpanded ? (
                    <View style={styles.inlineContent}>
                      {parseDiaryContent(item.text, item.images || []).map((block, i) =>
                        block.type === 'text' ? (
                          <Text key={i} style={styles.itemText}>
                            {block.value}
                          </Text>
                        ) : (
                          <TouchableOpacity
                            key={i}
                            onPress={() => setViewerImage(block.uri)}
                            style={styles.inlineImageWrapper}
                          >
                            <Image source={{ uri: block.uri }} style={styles.inlineImage} />
                          </TouchableOpacity>
                        )
                      )}
                    </View>
                  ) : (
                    <Text style={styles.itemText} numberOfLines={3}>
                      {stripImageMarkers(item.text)}
                    </Text>
                  )}

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
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={closeModal}
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
              onSelectionChange={handleSelectionChange}
              selection={forcedSelection}
              textAlignVertical="top"
              autoFocus
            />

            {/* Attached image previews, ordered to match where each photo
                actually sits in the text above */}
            {images.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.imagePreviewRow}
              >
                {getOrderedImages(currentItem, images).map((uri, imgIndex) => (
                  <View key={imgIndex} style={styles.imagePreviewWrapper}>
                    <Image source={{ uri }} style={styles.imagePreview} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(uri)}
                    >
                      <Ionicons name="close-circle" size={22} color="#C85C5C" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Add photo button */}
            <TouchableOpacity
              style={styles.addImageButton}
              onPress={handleAddImage}
              disabled={isPickingImage}
            >
              {isPickingImage ? (
                <ActivityIndicator size="small" color="#6B8E4E" />
              ) : (
                <>
                  <Ionicons name="camera" size={20} color="#6B8E4E" />
                  <Text style={styles.addImageText}>Add Photo</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Full-screen image viewer */}
      <Modal
        visible={!!viewerImage}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerImage(null)}
      >
        <TouchableOpacity
          style={styles.viewerOverlay}
          activeOpacity={1}
          onPress={() => setViewerImage(null)}
        >
          {viewerImage && (
            <Image source={{ uri: viewerImage }} style={styles.viewerImage} resizeMode="contain" />
          )}
          <TouchableOpacity
            style={styles.viewerCloseButton}
            onPress={() => setViewerImage(null)}
          >
            <Ionicons name="close-circle" size={36} color="#fff" />
          </TouchableOpacity>
        </TouchableOpacity>
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
  thumbnailRow: {
    marginBottom: 12,
  },
  inlineContent: {
    marginBottom: 12,
    gap: 10,
  },
  inlineImageWrapper: {
    alignSelf: 'stretch',
  },
  inlineImage: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#EDE7F6',
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#EDE7F6',
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
  imagePreviewRow: {
    marginHorizontal: 16,
    marginTop: -8,
    marginBottom: 12,
  },
  imagePreviewWrapper: {
    marginRight: 12,
    position: 'relative',
  },
  imagePreview: {
    width: 90,
    height: 90,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#9CAF88',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#9CAF88',
    borderStyle: 'dashed',
    backgroundColor: '#fff',
  },
  addImageText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B8E4E',
  },
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerImage: {
    width: '100%',
    height: '80%',
  },
  viewerCloseButton: {
    position: 'absolute',
    top: 50,
    right: 24,
  },
});