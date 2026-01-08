//app/hooks/useBackupManager.js

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

export const useBackupManager = (onDataChanged) => {  // ← add callback parameter
  const [isProcessing, setIsProcessing] = useState(false);

  const exportBackup = async () => {
    setIsProcessing(true);
    try {
      const backupData = await collectAllData();
      const jsonString = JSON.stringify(backupData, null, 2);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `diary-backup-${timestamp}.json`;
      const fileUri = FileSystem.documentDirectory + filename;
      
      await FileSystem.writeAsStringAsync(fileUri, jsonString);

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

  const importBackup = async (replaceExisting = false) => {
    setIsProcessing(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setIsProcessing(false);
        return { success: false, cancelled: true };
      }

      const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
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

      // restore the data
      await restoreData(backupData, replaceExisting);

      // call the callback to reload data
      if (onDataChanged) {
        await onDataChanged();
      }

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

  const collectAllData = async () => {
    const sectionsString = await AsyncStorage.getItem(STORAGE_KEYS.SECTIONS);
    const sections = sectionsString ? JSON.parse(sectionsString) : [];

    const allItems = {};
    let totalItems = 0;

    for (const section of sections) {
      const itemsKey = STORAGE_KEYS.ITEMS + section;
      const itemsString = await AsyncStorage.getItem(itemsKey);
      const items = itemsString ? JSON.parse(itemsString) : [];
      allItems[section] = items;
      totalItems += items.length;
    }

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

  const validateBackupData = (data) => {
    try {
      if (!data) {
        return { isValid: false, error: 'No data found' };
      }

      if (!data.metadata || !data.sections || !data.items) {
        return { isValid: false, error: 'Missing required fields' };
      }

      if (!Array.isArray(data.sections)) {
        return { isValid: false, error: 'Sections must be an array' };
      }

      if (typeof data.items !== 'object') {
        return { isValid: false, error: 'Items must be an object' };
      }

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

  const restoreData = async (backupData, replaceExisting) => {
    try {
      if (replaceExisting) {
        const currentSectionsString = await AsyncStorage.getItem(STORAGE_KEYS.SECTIONS);
        const currentSections = currentSectionsString ? JSON.parse(currentSectionsString) : [];
        
        for (const section of currentSections) {
          const itemsKey = STORAGE_KEYS.ITEMS + section;
          await AsyncStorage.removeItem(itemsKey);
        }

        await AsyncStorage.setItem(
          STORAGE_KEYS.SECTIONS,
          JSON.stringify(backupData.sections)
        );

        for (const [section, items] of Object.entries(backupData.items)) {
          const itemsKey = STORAGE_KEYS.ITEMS + section;
          await AsyncStorage.setItem(itemsKey, JSON.stringify(items));
        }
      } else {
        const currentSectionsString = await AsyncStorage.getItem(STORAGE_KEYS.SECTIONS);
        const currentSections = currentSectionsString ? JSON.parse(currentSectionsString) : [];

        const mergedSections = [...new Set([...currentSections, ...backupData.sections])];

        await AsyncStorage.setItem(
          STORAGE_KEYS.SECTIONS,
          JSON.stringify(mergedSections)
        );

        for (const [section, newItems] of Object.entries(backupData.items)) {
          const itemsKey = STORAGE_KEYS.ITEMS + section;
          
          const existingItemsString = await AsyncStorage.getItem(itemsKey);
          const existingItems = existingItemsString ? JSON.parse(existingItemsString) : [];

          const existingIds = new Set(existingItems.map(item => item.id));
          const itemsToAdd = newItems.filter(item => !existingIds.has(item.id));
          const mergedItems = [...existingItems, ...itemsToAdd];

          await AsyncStorage.setItem(itemsKey, JSON.stringify(mergedItems));
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Restore data error:', error);
      throw error;
    }
  };

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