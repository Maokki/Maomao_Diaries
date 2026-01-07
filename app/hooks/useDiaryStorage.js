// app/hooks/useDiaryStorage.js

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Custom hook for managing diary storage
 * This hook handles all the localStorage operations for diary sections and items
 * 
 * Why use a custom hook?
 * - Separates storage logic from UI components
 * - Reusable across different components
 * - Easier to test and maintain
 * - Centralized data management
 */

// Storage keys - used to identify data in AsyncStorage
const STORAGE_KEYS = {
  SECTIONS: '@diary_sections', // Key for storing the list of diary sections
  ITEMS: '@diary_items_',      // Prefix for storing items (will be combined with section name)
  // Backup keys - stores copies of data for recovery purposes
  BACKUP_SECTIONS: '@backup_diary_sections', // Backup of sections list
  BACKUP_ITEMS: '@backup_diary_items_',      // Backup of section items
  BACKUP_METADATA: '@backup_metadata',       // Stores info about last backup (timestamp, version)
};

/**
 * BACKUP SYSTEM EXPLANATION:
 *
 * How Backup Works:
 * ─────────────────
 * 1. AUTOMATIC BACKUPS: Every time you add/update/delete data, a backup copy is created
 * 2. STORAGE LOCATIONS: Main data and backup data are stored separately in AsyncStorage
 *    - Main data: @diary_sections, @diary_items_*
 *    - Backup copies: @backup_diary_sections, @backup_diary_items_*
 * 3. METADATA TRACKING: The system records when the last backup was made
 * 4. RECOVERY: If main data gets corrupted, you can restore from the backup copy
 *
 * Example Flow:
 * ─────────────
 * User adds a note:
 *   1. Current note is saved to main storage
 *   2. Previous version is automatically backed up
 *   3. Timestamp of backup is recorded in metadata
 *   4. If something goes wrong, restore function can retrieve the backup
 *
 * Why This Works:
 * ───────────────
 * - AsyncStorage is reliable but can sometimes fail during writes
 * - Having a backup copy ensures you don't lose data if write fails
 * - Metadata helps identify which backup is most recent
 * - Separate storage keys prevent main data from overwriting backups
 */

/**
 * Utility function: Create a backup of current data
 * This is called automatically after every save operation
 * @param {string} backupKey - The key to store the backup under
 * @param {*} data - The data to backup (will be JSON stringified)
 * @returns {Promise<boolean>} - True if backup succeeded, false otherwise
 */
const createBackup = async (backupKey, data) => {
  try {
    // Save a copy of the data with a timestamp
    const backupData = {
      data: data,
      timestamp: new Date().toISOString(), // When was this backup made?
      version: 1,                         // For future versioning support
    };

    await AsyncStorage.setItem(backupKey, JSON.stringify(backupData));

    // Update the backup metadata to track when last backup happened
    const metadata = {
      lastBackup: new Date().toISOString(),
      backupKey: backupKey,
      status: 'success',
    };

    await AsyncStorage.setItem(STORAGE_KEYS.BACKUP_METADATA, JSON.stringify(metadata));

    return true;
  } catch (error) {
    console.error('Backup failed:', error);
    return false;
  }
};

/**
 * Utility function: Restore data from backup
 * Called when main data is corrupted or lost
 * @param {string} backupKey - The key where backup is stored
 * @returns {Promise<*>} - The restored data, or null if restore failed
 */
const restoreFromBackup = async (backupKey) => {
  try {
    // Retrieve the backup copy with metadata
    const backupData = await AsyncStorage.getItem(backupKey);

    if (backupData === null) {
      console.warn('No backup found for key:', backupKey);
      return null;
    }

    // Parse the backup and extract just the data
    const parsed = JSON.parse(backupData);
    console.log(`Restored from backup made at: ${parsed.timestamp}`);

    return parsed.data;
  } catch (error) {
    console.error('Restore failed:', error);
    return null;
  }
};

/**
 * Utility function: Get backup information
 * Shows when the last backup was created
 * @returns {Promise<Object|null>} - Backup metadata or null
 */
const getBackupInfo = async () => {
  try {
    const metadata = await AsyncStorage.getItem(STORAGE_KEYS.BACKUP_METADATA);
    return metadata ? JSON.parse(metadata) : null;
  } catch (error) {
    console.error('Error getting backup info:', error);
    return null;
  }
};

/**
 * Hook for managing diary sections (sidebar)
 * Returns: [sections, addSection, deleteSection, renameSection, reloadSections, isLoading]
 */
export const useDiarySections = () => {
  const [sections, setSections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load sections from AsyncStorage
   * This runs when the app starts to retrieve saved sections
   */
  const loadSections = async () => {
    try {
      // Get the stored sections from AsyncStorage
      const storedSections = await AsyncStorage.getItem(STORAGE_KEYS.SECTIONS);
      
      // If sections exist, parse the JSON string and set state
      if (storedSections !== null) {
        setSections(JSON.parse(storedSections));
      } else {
        setSections([]); // Set empty array if no sections
      }
    } catch (error) {
      // Log error if something goes wrong
      console.error('Error loading sections:', error);
      setSections([]);
    } finally {
      // Set loading to false whether success or error
      setIsLoading(false);
    }
  };

  // Load sections from storage when component mounts
  useEffect(() => {
    loadSections();
  }, []);

  /**
   * Reload sections manually
   * Useful for forcing a refresh after operations
   */
  const reloadSections = async () => {
    await loadSections();
  };

  /**
   * Add a new section
   * @param {string} sectionName - Name of the new section
   */
  const addSection = async (sectionName) => {
    try {
      // Create new sections array with the new section at the top
      const newSections = [sectionName, ...sections];

      // Save to AsyncStorage first (converts array to JSON string)
      await AsyncStorage.setItem(
        STORAGE_KEYS.SECTIONS,
        JSON.stringify(newSections)
      );

      // Create a backup copy for recovery (this happens after main save)
      await createBackup(STORAGE_KEYS.BACKUP_SECTIONS, newSections);

      // Update state AFTER successful save - this triggers immediate UI update
      setSections(newSections);

      return true;
    } catch (error) {
      console.error('Error adding section:', error);
      throw error;
    }
  };

  /**
   * Delete a section and all its items
   * @param {string} sectionName - Name of the section to delete
   */
  const deleteSection = async (sectionName) => {
    try {
      // Remove section from array
      const newSections = sections.filter(section => section !== sectionName);

      // Save updated sections list to AsyncStorage
      await AsyncStorage.setItem(
        STORAGE_KEYS.SECTIONS,
        JSON.stringify(newSections)
      );

      // Backup the new state after deletion
      await createBackup(STORAGE_KEYS.BACKUP_SECTIONS, newSections);

      // Delete all items associated with this section
      const itemsKey = STORAGE_KEYS.ITEMS + sectionName;
      await AsyncStorage.removeItem(itemsKey);

      // Delete the backup items too
      const backupItemsKey = STORAGE_KEYS.BACKUP_ITEMS + sectionName;
      await AsyncStorage.removeItem(backupItemsKey);

      // Update state AFTER successful operations - triggers immediate UI update
      setSections(newSections);

      return true;
    } catch (error) {
      console.error('Error deleting section:', error);
      throw error;
    }
  };

  /**
   * Rename a section
   * @param {string} oldName - Current section name
   * @param {string} newName - New section name
   */
  const renameSection = async (oldName, newName) => {
    try {
      // Check if new name already exists
      if (sections.includes(newName)) {
        throw new Error('Section name already exists');
      }

      // Step 1: Update the sections array - replace old name with new name
      const updatedSections = sections.map(section => 
        section === oldName ? newName : section
      );

      // Step 2: Save the updated sections list to AsyncStorage
      await AsyncStorage.setItem(
        STORAGE_KEYS.SECTIONS,
        JSON.stringify(updatedSections)
      );

      // Step 3: Move items from old section key to new section key
      const oldItemsKey = STORAGE_KEYS.ITEMS + oldName;
      const newItemsKey = STORAGE_KEYS.ITEMS + newName;
      
      const storedItems = await AsyncStorage.getItem(oldItemsKey);
      
      if (storedItems !== null) {
        // Copy items to new key
        await AsyncStorage.setItem(newItemsKey, storedItems);
        
        // Create backup for new items
        const backupKey = STORAGE_KEYS.BACKUP_ITEMS + newName;
        await createBackup(backupKey, JSON.parse(storedItems));
      }

      // Step 4: Delete old items key
      await AsyncStorage.removeItem(oldItemsKey);
      
      // Step 5: Delete old backup
      const oldBackupKey = STORAGE_KEYS.BACKUP_ITEMS + oldName;
      await AsyncStorage.removeItem(oldBackupKey);

      // Step 6: Create backup of updated sections
      await createBackup(STORAGE_KEYS.BACKUP_SECTIONS, updatedSections);

      // Step 7: Update state AFTER all operations - triggers immediate UI update
      setSections(updatedSections);

      return true;
    } catch (error) {
      console.error('Error renaming section:', error);
      throw error;
    }
  };

  return {
    sections,
    addSection,
    deleteSection,
    renameSection,
    reloadSections, 
    isLoading
  };
};

/**
 * Hook for managing items within a specific diary section
 * @param {string} sectionName - The name of the current section
 * Returns: [items, addItem, updateItem, deleteItem, isLoading]
 */
export const useDiaryItems = (sectionName) => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadItems = useCallback(async () => {
    try {
      // Create a unique key for this section's items
      const itemsKey = STORAGE_KEYS.ITEMS + sectionName;

      // Get stored items
      const storedItems = await AsyncStorage.getItem(itemsKey);

      // If items exist, parse and set state
      if (storedItems !== null) {
        setItems(JSON.parse(storedItems));
      } else {
        // If no items exist, set empty array
        setItems([]);
      }
    } catch (error) {
      console.error('Error loading items:', error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [sectionName]);

  // Load items whenever the section changes
  useEffect(() => {
    if (sectionName) {
      loadItems();
    }
  }, [sectionName, loadItems]);

  /**
   * Save items to AsyncStorage
   * Helper function used by add, update, and delete
   * @param {Array} itemsToSave - Array of items to save
   */
  const saveItems = async (itemsToSave) => {
    try {
      const itemsKey = STORAGE_KEYS.ITEMS + sectionName;

      // Save the main copy
      await AsyncStorage.setItem(itemsKey, JSON.stringify(itemsToSave));

      // Create a backup copy for recovery
      // The backup key is specific to this section, so different sections have different backups
      const backupKey = STORAGE_KEYS.BACKUP_ITEMS + sectionName;
      await createBackup(backupKey, itemsToSave);
    } catch (error) {
      console.error('Error saving items:', error);
      throw error; // Re-throw to handle in calling function
    }
  };

  /**
   * Add a new item to the current section
   * @param {string} text - The text content of the new item
   */
  const addItem = async (text) => {
    try {
      // Create new item object with metadata
      const newItem = {
        id: Date.now(), // Unique ID based on timestamp
        text: text,
        createdAt: new Date().toLocaleString(),
        lastModified: new Date().toLocaleString()
      };
      
      // Add new item at the beginning of the array
      const newItems = [newItem, ...items];
      
      // Update state immediately
      setItems(newItems);
      
      // Save to storage
      await saveItems(newItems);
      
      return newItem; // Return the created item
    } catch (error) {
      console.error('Error adding item:', error);
      // Revert state if save failed
      setItems(items);
      throw error;
    }
  };

  /**
   * Update an existing item
   * @param {number} index - Index of the item to update
   * @param {string} text - New text content
   */
  const updateItem = async (index, text) => {
    try {
      // Create a copy of the items array
      const updatedItems = [...items];
      
      // Update the specific item
      updatedItems[index] = {
        ...updatedItems[index],
        text: text,
        lastModified: new Date().toLocaleString()
      };
      
      // Update state
      setItems(updatedItems);
      
      // Save to storage
      await saveItems(updatedItems);
    } catch (error) {
      console.error('Error updating item:', error);
      // Revert state if save failed
      setItems(items);
      throw error;
    }
  };

  /**
   * Delete an item
   * @param {number} index - Index of the item to delete
   */
  const deleteItem = async (index) => {
    try {
      // Filter out the item at the specified index
      const updatedItems = items.filter((_, i) => i !== index);
      
      // Update state
      setItems(updatedItems);
      
      // Save to storage
      await saveItems(updatedItems);
    } catch (error) {
      console.error('Error deleting item:', error);
      // Revert state if delete failed
      setItems(items);
      throw error;
    }
  };

  /**
   * Clear all items in the current section
   * Useful for "delete all" functionality
   */
  const clearAllItems = async () => {
    try {
      setItems([]);
      await saveItems([]);
    } catch (error) {
      console.error('Error clearing items:', error);
      throw error;
    }
  };

  return {
    items,
    addItem,
    updateItem,
    deleteItem,
    clearAllItems,
    isLoading
  };
};

export { createBackup, restoreFromBackup, getBackupInfo, STORAGE_KEYS };