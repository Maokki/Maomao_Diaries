// app/hooks/useBackupManager.js

import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';

const STORAGE_KEYS = {
  SECTIONS: '@diary_sections',
  ITEMS: '@diary_items_',
};

export const useBackupManager = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * EXPORT BACKUP
   * Creates a JSON file with all diary data and shares it
   */
  const exportBackup = async () => {
    setIsProcessing(true);
    try {
      // 1. Collect all data from AsyncStorage
      const backupData = await collectAllData();

      // 2. Create JSON string with formatting (pretty print)
      const jsonString = JSON.stringify(backupData, null, 2);

      // 3. Create filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `diary-backup-${timestamp}.json`;

      // 4. Save to device's document directory
      const fileUri = FileSystem.documentDirectory + filename;
      await FileSystem.writeAsStringAsync(fileUri, jsonString);

      // 5. Share the file (user can save to Files, Drive, etc.)
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Save your diary backup',
          UTI: 'public.json',
        });
      }

      Alert.alert(
        'Backup Created',
        `Your diary has been backed up successfully!\n\nFile: ${filename}\n\nItems backed up:\n- ${backupData.sections.length} sections\n- ${backupData.totalItems} total items`,
        [{ text: 'OK' }]
      );

      return { success: true, filename };
    } catch (error) {
      console.error('Export backup error:', error);
      Alert.alert(
        'Backup Failed',
        'Could not create backup. Please try again.',
        [{ text: 'OK' }]
      );
      return { success: false, error };
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * IMPORT BACKUP
   * Allows user to select a JSON backup file and restore data
   * @param {boolean} replaceExisting - If true, replaces all data. If false, merges with existing data
   */
  const importBackup = async (replaceExisting = false) => {
    setIsProcessing(true);
    try {
      // 1. Let user pick a JSON file
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      // Check if user cancelled
      if (result.canceled) {
        setIsProcessing(false);
        return { success: false, cancelled: true };
      }

      // 2. Read the file content
      const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);

      // 3. Parse and validate the JSON
      const backupData = JSON.parse(fileContent);
      const validationResult = validateBackupData(backupData);

      if (!validationResult.isValid) {
        Alert.alert(
          'Invalid Backup File',
          `This file is not a valid diary backup.\n\nError: ${validationResult.error}`,
          [{ text: 'OK' }]
        );
        setIsProcessing(false);
        return { success: false, error: validationResult.error };
      }

      // 4. Ask user to confirm restore
      const confirmRestore = await new Promise((resolve) => {
        Alert.alert(
          'Restore Backup?',
          `This backup contains:\n- ${backupData.sections.length} sections\n- ${backupData.totalItems} total items\n\nCreated: ${backupData.metadata.timestamp}\n\n${replaceExisting ? '⚠️ This will REPLACE all current data!' : 'This will MERGE with your current data.'}`,
          [
            { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
            { 
              text: replaceExisting ? 'Replace All' : 'Merge Data', 
              onPress: () => resolve(true),
              style: replaceExisting ? 'destructive' : 'default'
            },
          ]
        );
      });

      if (!confirmRestore) {
        setIsProcessing(false);
        return { success: false, cancelled: true };
      }

      // 5. Restore the data
      await restoreData(backupData, replaceExisting);

      Alert.alert(
        'Restore Complete',
        `Your diary has been restored successfully!\n\n${replaceExisting ? 'All data has been replaced.' : 'Data has been merged with existing content.'}`,
        [{ text: 'OK' }]
      );

      return { success: true };
    } catch (error) {
      console.error('Import backup error:', error);
      Alert.alert(
        'Restore Failed',
        'Could not restore backup. The file may be corrupted or invalid.',
        [{ text: 'OK' }]
      );
      return { success: false, error };
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * COLLECT ALL DATA
   * Gathers all sections and items from AsyncStorage
   */
  const collectAllData = async () => {
    // Get all sections
    const sectionsString = await AsyncStorage.getItem(STORAGE_KEYS.SECTIONS);
    const sections = sectionsString ? JSON.parse(sectionsString) : [];

    // Get items for each section
    const allItems = {};
    let totalItems = 0;

    for (const section of sections) {
      const itemsKey = STORAGE_KEYS.ITEMS + section;
      const itemsString = await AsyncStorage.getItem(itemsKey);
      const items = itemsString ? JSON.parse(itemsString) : [];
      allItems[section] = items;
      totalItems += items.length;
    }

    // Create backup object
    return {
      metadata: {
        version: '1.0',
        timestamp: new Date().toISOString(),
        appName: 'Diary App',
        totalSections: sections.length,
        totalItems: totalItems,
      },
      sections: sections,
      items: allItems,
      totalItems: totalItems,
    };
  };

  /**
   * VALIDATE BACKUP DATA
   * Checks if the imported data has the correct structure
   */
  const validateBackupData = (data) => {
    try {
      // Check if data exists
      if (!data) {
        return { isValid: false, error: 'No data found' };
      }

      // Check required fields
      if (!data.metadata || !data.sections || !data.items) {
        return { isValid: false, error: 'Missing required fields' };
      }

      // Check if sections is an array
      if (!Array.isArray(data.sections)) {
        return { isValid: false, error: 'Sections must be an array' };
      }

      // Check if items is an object
      if (typeof data.items !== 'object') {
        return { isValid: false, error: 'Items must be an object' };
      }

      // Validate each section's items
      for (const section of data.sections) {
        if (data.items[section] && !Array.isArray(data.items[section])) {
          return { isValid: false, error: `Items for section "${section}" must be an array` };
        }
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: error.message };
    }
  };

  /**
   * RESTORE DATA
   * Writes backup data to AsyncStorage
   * @param {Object} backupData - The backup data to restore
   * @param {boolean} replaceExisting - Whether to replace or merge with existing data
   */
  const restoreData = async (backupData, replaceExisting) => {
    try {
      if (replaceExisting) {
        // REPLACE MODE: Clear everything and restore from backup
        
        // 1. Clear all existing sections
        const currentSectionsString = await AsyncStorage.getItem(STORAGE_KEYS.SECTIONS);
        const currentSections = currentSectionsString ? JSON.parse(currentSectionsString) : [];
        
        for (const section of currentSections) {
          const itemsKey = STORAGE_KEYS.ITEMS + section;
          await AsyncStorage.removeItem(itemsKey);
        }

        // 2. Save new sections
        await AsyncStorage.setItem(
          STORAGE_KEYS.SECTIONS,
          JSON.stringify(backupData.sections)
        );

        // 3. Save all items
        for (const [section, items] of Object.entries(backupData.items)) {
          const itemsKey = STORAGE_KEYS.ITEMS + section;
          await AsyncStorage.setItem(itemsKey, JSON.stringify(items));
        }
      } else {
        // MERGE MODE: Combine backup data with existing data
        
        // 1. Get current sections
        const currentSectionsString = await AsyncStorage.getItem(STORAGE_KEYS.SECTIONS);
        const currentSections = currentSectionsString ? JSON.parse(currentSectionsString) : [];

        // 2. Merge sections (remove duplicates)
        const mergedSections = [...new Set([...currentSections, ...backupData.sections])];

        // 3. Save merged sections
        await AsyncStorage.setItem(
          STORAGE_KEYS.SECTIONS,
          JSON.stringify(mergedSections)
        );

        // 4. Merge items for each section
        for (const [section, newItems] of Object.entries(backupData.items)) {
          const itemsKey = STORAGE_KEYS.ITEMS + section;
          
          // Get existing items
          const existingItemsString = await AsyncStorage.getItem(itemsKey);
          const existingItems = existingItemsString ? JSON.parse(existingItemsString) : [];

          // Merge items (newer items first, avoid duplicates by ID)
          const existingIds = new Set(existingItems.map(item => item.id));
          const itemsToAdd = newItems.filter(item => !existingIds.has(item.id));
          const mergedItems = [...existingItems, ...itemsToAdd];

          // Save merged items
          await AsyncStorage.setItem(itemsKey, JSON.stringify(mergedItems));
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Restore data error:', error);
      throw error;
    }
  };

  /**
   * GET BACKUP INFO
   * Returns information about the current data (useful for showing stats)
   */
  const getBackupInfo = async () => {
    try {
      const data = await collectAllData();
      return {
        sections: data.sections.length,
        totalItems: data.totalItems,
        lastModified: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Get backup info error:', error);
      return null;
    }
  };

  return {
    exportBackup,
    importBackup,
    getBackupInfo,
    isProcessing,
  };
};
