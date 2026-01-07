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
};

/**
 * Hook for managing diary sections (sidebar)
 * Returns: [sections, addSection, deleteSection, isLoading]
 */
export const useDiarySections = () => {
  const [sections, setSections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load sections from storage when component mounts
  useEffect(() => {
    loadSections();
  }, []);

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
      }
    } catch (error) {
      // Log error if something goes wrong
      console.error('Error loading sections:', error);
    } finally {
      // Set loading to false whether success or error
      setIsLoading(false);
    }
  };

  /**
   * Add a new section
   * @param {string} sectionName - Name of the new section
   */
  const addSection = async (sectionName) => {
    try {
      // Create new sections array with the new section at the top
      const newSections = [sectionName, ...sections];
      
      // Update state immediately for better UX
      setSections(newSections);
      
      // Save to AsyncStorage (converts array to JSON string)
      await AsyncStorage.setItem(
        STORAGE_KEYS.SECTIONS, 
        JSON.stringify(newSections)
      );
    } catch (error) {
      console.error('Error adding section:', error);
      // Revert state if save failed
      setSections(sections);
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
      
      // Update state
      setSections(newSections);
      
      // Save updated sections list
      await AsyncStorage.setItem(
        STORAGE_KEYS.SECTIONS, 
        JSON.stringify(newSections)
      );
      
      // Also delete all items associated with this section
      const itemsKey = STORAGE_KEYS.ITEMS + sectionName;
      await AsyncStorage.removeItem(itemsKey);
    } catch (error) {
      console.error('Error deleting section:', error);
    }
  };

  return {
    sections,
    addSection,
    deleteSection,
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
      await AsyncStorage.setItem(itemsKey, JSON.stringify(itemsToSave));
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

/**
 * STORAGE STRUCTURE EXPLANATION:
 * 
 * AsyncStorage stores data as key-value pairs (like a dictionary)
 * 
 * Example of how data is stored:
 * 
 * '@diary_sections' → '["Work", "Personal", "Travel"]'
 * '@diary_items_Work' → '[{id: 1, text: "Meeting notes", ...}, {id: 2, text: "Todo", ...}]'
 * '@diary_items_Personal' → '[{id: 3, text: "Journal entry", ...}]'
 * '@diary_items_Travel' → '[{id: 4, text: "Trip plan", ...}]'
 * 
 * Why this structure?
 * - Easy to query items for a specific section
 * - When you delete a section, you can easily delete its items too
 * - Keeps data organized and prevents conflicts
 */