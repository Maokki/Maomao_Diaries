// app/components/BackupButton.jsx

import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Modal, 
  ScrollView,
  ActivityIndicator,
  Alert 
} from 'react-native';
import React, { useState, useEffect } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useBackupManager } from '../hooks/useBackupManager';

const BackupButton = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [backupInfo, setBackupInfo] = useState(null);
  const { exportBackup, importBackup, getBackupInfo, isProcessing } = useBackupManager();

  // load backup info when modal opens
  useEffect(() => {
    if (modalVisible) {
      loadBackupInfo();
    }
  }, [modalVisible]);

  const loadBackupInfo = async () => {
    const info = await getBackupInfo();
    setBackupInfo(info);
  };

  const handleExport = async () => {
    setModalVisible(false);
    await exportBackup();
  };

  const handleImportMerge = async () => {
    setModalVisible(false);
    await importBackup(false); // Merge with existing data
  };

  const handleImportReplace = async () => {
    Alert.alert(
      '⚠️ Warning',
      'This will DELETE all your current data and replace it with the backup file. This action cannot be undone!\n\nAre you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Replace All',
          style: 'destructive',
          onPress: async () => {
            setModalVisible(false);
            await importBackup(true); // Replace all data
          },
        },
      ]
    );
  };

  return (
    <>
      {/* Floating Backup Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="cloud-upload-outline" size={24} color="white" />
      </TouchableOpacity>

      {/* Backup Menu Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Backup & Restore</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#999" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Backup Info Card */}
              <View style={styles.infoCard}>
                <View style={styles.infoHeader}>
                  <Ionicons name="information-circle" size={24} color="#509107ff" />
                  <Text style={styles.infoTitle}>Current Data</Text>
                </View>
                {backupInfo ? (
                  <View style={styles.infoStats}>
                    <View style={styles.statRow}>
                      <Text style={styles.statLabel}>Sections:</Text>
                      <Text style={styles.statValue}>{backupInfo.sections}</Text>
                    </View>
                    <View style={styles.statRow}>
                      <Text style={styles.statLabel}>Total Items:</Text>
                      <Text style={styles.statValue}>{backupInfo.totalItems}</Text>
                    </View>
                  </View>
                ) : (
                  <ActivityIndicator size="small" color="#509107ff" />
                )}
              </View>

              {/* Export Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Export Backup</Text>
                <Text style={styles.sectionDescription}>
                  Create a backup file of all your diary data. You can save it to your device, cloud storage, or share it.
                </Text>
                <TouchableOpacity
                  style={[styles.actionButton, styles.exportButton]}
                  onPress={handleExport}
                  disabled={isProcessing}
                >
                  <Ionicons name="download-outline" size={20} color="white" />
                  <Text style={styles.buttonText}>
                    {isProcessing ? 'Exporting...' : 'Export to JSON File'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Import Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Import Backup</Text>
                <Text style={styles.sectionDescription}>
                  Restore your diary from a backup file. Choose to merge with existing data or replace everything.
                </Text>

                {/* Merge Option */}
                <TouchableOpacity
                  style={[styles.actionButton, styles.mergeButton]}
                  onPress={handleImportMerge}
                  disabled={isProcessing}
                >
                  <Ionicons name="git-merge-outline" size={20} color="white" />
                  <Text style={styles.buttonText}>
                    Import & Merge with Current
                  </Text>
                </TouchableOpacity>

                <Text style={styles.optionNote}>
                  ✓ Keeps your current data
                  {'\n'}✓ Adds backup data to existing content
                  {'\n'}✓ Safe option - no data loss
                </Text>

                {/* Replace Option */}
                <TouchableOpacity
                  style={[styles.actionButton, styles.replaceButton]}
                  onPress={handleImportReplace}
                  disabled={isProcessing}
                >
                  <Ionicons name="refresh-outline" size={20} color="white" />
                  <Text style={styles.buttonText}>
                    Import & Replace All
                  </Text>
                </TouchableOpacity>

                <Text style={[styles.optionNote, styles.warningNote]}>
                  ⚠️ Deletes ALL current data
                  {'\n'}⚠️ Replaces with backup file
                  {'\n'}⚠️ Cannot be undone
                </Text>
              </View>
            </ScrollView>

            {/* Loading Overlay */}
            {isProcessing && (
              <View style={styles.loadingOverlay}>
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color="#509107ff" />
                  <Text style={styles.loadingText}>Processing...</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

export default BackupButton;

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    right: 20,
    top: 50,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#509107ff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    zIndex: 999,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#f0f9e8',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#509107ff',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#509107ff',
  },
  infoStats: {
    marginTop: 5,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 10,
    marginBottom: 10,
  },
  exportButton: {
    backgroundColor: '#509107ff',
  },
  mergeButton: {
    backgroundColor: '#2196F3',
  },
  replaceButton: {
    backgroundColor: '#ff3b30',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  optionNote: {
    fontSize: 12,
    color: '#666',
    marginBottom: 15,
    marginLeft: 10,
    lineHeight: 18,
  },
  warningNote: {
    color: '#ff3b30',
  },
  bold: {
    fontWeight: '600',
    color: '#333',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});