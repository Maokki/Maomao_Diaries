// app/hooks/useDiaryStorage.js

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  SECTIONS: '@diary_sections',
  ITEMS: '@diary_items_',
  BACKUP_SECTIONS: '@backup_diary_sections',
  BACKUP_ITEMS: '@backup_diary_items_',
  BACKUP_METADATA: '@backup_metadata',
};

const createBackup = async (backupKey, data) => {
  try {
    const backupData = {
      data: data,
      timestamp: new Date().toISOString(),
      version: 1,
    };

    await AsyncStorage.setItem(backupKey, JSON.stringify(backupData));

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

const restoreFromBackup = async (backupKey) => {
  try {
    const backupData = await AsyncStorage.getItem(backupKey);

    if (backupData === null) {
      console.warn('No backup found for key:', backupKey);
      return null;
    }

    const parsed = JSON.parse(backupData);
    console.log(`Restored from backup made at: ${parsed.timestamp}`);

    return parsed.data;
  } catch (error) {
    console.error('Restore failed:', error);
    return null;
  }
};

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
 * NOW WITH REFRESH FUNCTION!
 */
export const useDiarySections = () => {
  const [sections, setSections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load sections from storage
  const loadSections = useCallback(async () => {
    setIsLoading(true);
    try {
      const storedSections = await AsyncStorage.getItem(STORAGE_KEYS.SECTIONS);
      
      if (storedSections !== null) {
        setSections(JSON.parse(storedSections));
      } else {
        setSections([]);
      }
    } catch (error) {
      console.error('Error loading sections:', error);
      setSections([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load sections on mount
  useEffect(() => {
    loadSections();
  }, [loadSections]);

  // force reload sections from storage
  const refreshSections = useCallback(async () => {
    await loadSections();
  }, [loadSections]);

  const addSection = async (sectionName) => {
    try {
      const newSections = [sectionName, ...sections];
      setSections(newSections);

      await AsyncStorage.setItem(
        STORAGE_KEYS.SECTIONS,
        JSON.stringify(newSections)
      );

      await createBackup(STORAGE_KEYS.BACKUP_SECTIONS, newSections);
    } catch (error) {
      console.error('Error adding section:', error);
      setSections(sections);
    }
  };

  const deleteSection = async (sectionName) => {
    try {
      const newSections = sections.filter(section => section !== sectionName);
      setSections(newSections);

      await AsyncStorage.setItem(
        STORAGE_KEYS.SECTIONS,
        JSON.stringify(newSections)
      );

      await createBackup(STORAGE_KEYS.BACKUP_SECTIONS, newSections);

      const itemsKey = STORAGE_KEYS.ITEMS + sectionName;
      await AsyncStorage.removeItem(itemsKey);
    } catch (error) {
      console.error('Error deleting section:', error);
    }
  };

  const renameSection = async (oldName, newName) => {
    try {
      if (sections.includes(newName)) {
        throw new Error('Section name already exists');
      }

      const newSections = sections.map(section => 
        section === oldName ? newName : section
      );
      setSections(newSections);

      await AsyncStorage.setItem(
        STORAGE_KEYS.SECTIONS,
        JSON.stringify(newSections)
      );

      const oldItemsKey = STORAGE_KEYS.ITEMS + oldName;
      const newItemsKey = STORAGE_KEYS.ITEMS + newName;
      
      const items = await AsyncStorage.getItem(oldItemsKey);
      if (items) {
        await AsyncStorage.setItem(newItemsKey, items);
        await AsyncStorage.removeItem(oldItemsKey);
      }

      await createBackup(STORAGE_KEYS.BACKUP_SECTIONS, newSections);
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
    refreshSections,  // ← Export the refresh function
    isLoading
  };
};

/**
 * Hook for managing items within a specific diary section
 * NOW WITH REFRESH FUNCTION!
 */
export const useDiaryItems = (sectionName) => {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const itemsKey = STORAGE_KEYS.ITEMS + sectionName;
      const storedItems = await AsyncStorage.getItem(itemsKey);

      if (storedItems !== null) {
        setItems(JSON.parse(storedItems));
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error('Error loading items:', error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [sectionName]);

  useEffect(() => {
    if (sectionName) {
      loadItems();
    }
  }, [sectionName, loadItems]);

  // force reload items from storage
  const refreshItems = useCallback(async () => {
    await loadItems();
  }, [loadItems]);

  const saveItems = async (itemsToSave) => {
    try {
      const itemsKey = STORAGE_KEYS.ITEMS + sectionName;
      await AsyncStorage.setItem(itemsKey, JSON.stringify(itemsToSave));

      const backupKey = STORAGE_KEYS.BACKUP_ITEMS + sectionName;
      await createBackup(backupKey, itemsToSave);
    } catch (error) {
      console.error('Error saving items:', error);
      throw error;
    }
  };

  const addItem = async (text) => {
    try {
      const newItem = {
        id: Date.now(),
        text: text,
        createdAt: new Date().toLocaleString(),
        lastModified: new Date().toLocaleString()
      };
      
      const newItems = [newItem, ...items];
      setItems(newItems);
      await saveItems(newItems);
      
      return newItem;
    } catch (error) {
      console.error('Error adding item:', error);
      setItems(items);
      throw error;
    }
  };

  const updateItem = async (index, text) => {
    try {
      const updatedItems = [...items];
      updatedItems[index] = {
        ...updatedItems[index],
        text: text,
        lastModified: new Date().toLocaleString()
      };
      
      setItems(updatedItems);
      await saveItems(updatedItems);
    } catch (error) {
      console.error('Error updating item:', error);
      setItems(items);
      throw error;
    }
  };

  const deleteItem = async (index) => {
    try {
      const updatedItems = items.filter((_, i) => i !== index);
      setItems(updatedItems);
      await saveItems(updatedItems);
    } catch (error) {
      console.error('Error deleting item:', error);
      setItems(items);
      throw error;
    }
  };

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
    refreshItems,  // export the refresh function
    isLoading
  };
};

export { createBackup, restoreFromBackup, getBackupInfo, STORAGE_KEYS };