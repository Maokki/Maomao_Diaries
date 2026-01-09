//app/components/BackupButton.jsx

import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Modal, 
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import React, { useState, useEffect } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useBackupManager } from '../hooks/useBackupManager';
import { Image } from 'react-native';

const BackupButton = ({ onDataRefresh }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [backupInfo, setBackupInfo] = useState(null);
  
  const { exportBackup, importBackup, getBackupInfo, isProcessing } = useBackupManager(onDataRefresh);

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
    const result = await importBackup(false);
    
    if (result.success && !result.cancelled) {
      await loadBackupInfo();
    }
  };

  const handleImportReplace = async () => {
    setModalVisible(false);
    const result = await importBackup(true);
    
    if (result.success && !result.cancelled) {
      await loadBackupInfo();
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="flask-outline" size={26} color="white" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.headerTitleContainer}>
                <Ionicons name="flask" size={28} color="#6B8E4E" />
                <Text style={styles.modalTitle}> Backup Data</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={30} color="#8B8680" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.infoCard}>
                <View style={styles.infoHeader}>
                  <View style={styles.iconCircle}>
                    <Ionicons name="leaf" size={24} color="#6B8E4E" />
                  </View>
                  <Text style={styles.infoTitle}>Current Collection</Text>
                </View>
                {backupInfo ? (
                  <View style={styles.infoStats}>
                    <View style={styles.statRow}>
                      <View style={styles.statItem}>
                        <Ionicons name="folder-open" size={20} color="#7B5E7B" />
                        <Text style={styles.statLabel}>Sections</Text>
                        <Text style={styles.statValue}>{backupInfo.sections}</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Ionicons name="book" size={20} color="#7B5E7B" />
                        <Text style={styles.statLabel}>Total Items</Text>
                        <Text style={styles.statValue}>{backupInfo.totalItems}</Text>
                      </View>
                    </View>
                    <View style={styles.imageContainer}>
                      <Image 
                        source={require('../../assets/jinshi_export.jpg')} 
                        style={styles.decorativeImage} 
                        resizeMode="contain" 
                      />
                    </View>
                  </View>
                ) : (
                  <ActivityIndicator size="small" color="#6B8E4E" />
                )}
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconContainer}>
                    <Ionicons name="download" size={20} color="#6B8E4E" />
                  </View>
                  <Text style={styles.sectionTitle}>Preserve Knowledge</Text>
                </View>
                <Text style={styles.sectionDescription}>
                  Create a precious archive of your medicinal notes. Store them safely like Maomao's treasured herbal remedies.
                </Text>
                <TouchableOpacity
                  style={[styles.actionButton, styles.exportButton]}
                  onPress={handleExport}
                  disabled={isProcessing}
                >
                  <View style={styles.buttonContent}>
                    <Ionicons name="download-outline" size={22} color="white" />
                    <Text style={styles.buttonText}>
                      {isProcessing ? 'Preserving...' : 'Export Archive'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIconContainer, { backgroundColor: '#EDE7F6' }]}>
                    <Ionicons name="arrow-up-circle" size={20} color="#7B5E7B" />
                  </View>
                  <Text style={styles.sectionTitle}>Restore Archive</Text>
                </View>
                <Text style={styles.sectionDescription}>
                  Retrieve your carefully documented findings. Choose to merge wisdom or start fresh.
                </Text>

                <TouchableOpacity
                  style={[styles.actionButton, styles.mergeButton]}
                  onPress={handleImportMerge}
                  disabled={isProcessing}
                >
                  <View style={styles.buttonContent}>
                    <Ionicons name="git-merge-outline" size={22} color="white" />
                    <Text style={styles.buttonText}>
                      Merge with Current
                    </Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.optionNote}>
                  <View style={styles.noteItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#6B8E4E" />
                    <Text style={styles.noteText}>Preserves existing knowledge</Text>
                  </View>
                  <View style={styles.noteItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#6B8E4E" />
                    <Text style={styles.noteText}>Combines both archives</Text>
                  </View>
                  <View style={styles.noteItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#6B8E4E" />
                    <Text style={styles.noteText}>Safe restoration method</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.actionButton, styles.replaceButton]}
                  onPress={handleImportReplace}
                  disabled={isProcessing}
                >
                  <View style={styles.buttonContent}>
                    <Ionicons name="refresh-outline" size={22} color="white" />
                    <Text style={styles.buttonText}>
                      Replace Completely
                    </Text>
                  </View>
                </TouchableOpacity>

                <View style={[styles.optionNote, styles.warningNote]}>
                  <View style={styles.noteItem}>
                    <Ionicons name="alert-circle" size={16} color="#C85C5C" />
                    <Text style={[styles.noteText, { color: '#C85C5C' }]}>Removes all current data</Text>
                  </View>
                  <View style={styles.noteItem}>
                    <Ionicons name="alert-circle" size={16} color="#C85C5C" />
                    <Text style={[styles.noteText, { color: '#C85C5C' }]}>Replaces with archive</Text>
                  </View>
                  <View style={styles.noteItem}>
                    <Ionicons name="alert-circle" size={16} color="#C85C5C" />
                    <Text style={[styles.noteText, { color: '#C85C5C' }]}>Cannot be reversed</Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            {isProcessing && (
              <View style={styles.loadingOverlay}>
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color="#6B8E4E" />
                  <Text style={styles.loadingText}>Processing with care...</Text>
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
    top: 47,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#6B8E4E',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4A7C59',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 999,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(74, 64, 58, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#F5EFE6',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 28,
    borderBottomWidth: 2,
    borderBottomColor: '#D4A574',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#4A403A',
    letterSpacing: 0.5,
  },
  modalBody: {
    padding: 24,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    borderWidth: 3,
    borderColor: '#9CAF88',
    shadowColor: '#6B8E4E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4A403A',
  },
  infoStats: {
    marginTop: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    backgroundColor: '#F5EFE6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    minWidth: 140,
  },
  statLabel: {
    fontSize: 13,
    color: '#8B8680',
    marginTop: 6,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4A403A',
  },
  imageContainer: {
    marginTop: 12,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#D4A574',
  },
  decorativeImage: {
    width: '100%',
    height: 250,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4A403A',
  },
  sectionDescription: {
    fontSize: 15,
    color: '#8B8680',
    marginBottom: 18,
    lineHeight: 22,
    paddingLeft: 4,
  },
  divider: {
    height: 2,
    backgroundColor: '#D4A574',
    marginVertical: 24,
    opacity: 0.3,
  },
  actionButton: {
    borderRadius: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 12,
  },
  exportButton: {
    backgroundColor: '#6B8E4E',
  },
  mergeButton: {
    backgroundColor: '#7B5E7B',
  },
  replaceButton: {
    backgroundColor: '#C85C5C',
  },
  buttonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  optionNote: {
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#6B8E4E',
  },
  warningNote: {
    backgroundColor: '#FFEBEE',
    borderLeftColor: '#C85C5C',
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    color: '#4A403A',
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(245, 239, 230, 0.95)',
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
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 3,
    borderColor: '#9CAF88',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 17,
    color: '#4A403A',
    fontWeight: '600',
  },
});