import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from 'react-native';
import { useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/use-colors';
import { createBackup, parseBackup, getBackupFileName, getBackupSummary, type BackupData } from '@/lib/backup';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

export default function BackupScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state, restoreFromBackup } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [previewData, setPreviewData] = useState<BackupData | null>(null);

  // Create and download backup
  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const backupJson = createBackup(
        state.portfolios,
        state.holdings,
        state.transactions,
        state.settings,
        state.currencyRate
      );

      const fileName = getBackupFileName();

      if (Platform.OS === 'web') {
        // Web: Create download link
        const blob = new Blob([backupJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        Alert.alert('Success', `Backup saved as ${fileName}`);
      } else {
        // Native: Save to file system and share
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, backupJson);
        
        // Check if sharing is available
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/json',
            dialogTitle: 'Save Backup File',
          });
        } else {
          Alert.alert('Success', `Backup saved to ${fileUri}`);
        }
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to create backup');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle file selection on Web
  const handleWebFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        processBackupFile(content);
      }
    };
    reader.onerror = () => {
      Alert.alert('Error', 'Failed to read file');
      setIsImporting(false);
    };
    reader.readAsText(file);
    
    // Reset input so same file can be selected again
    event.target.value = '';
  };

  // Process backup file content
  const processBackupFile = (content: string) => {
    const result = parseBackup(content);
    
    if (!result.success || !result.data) {
      Alert.alert('Invalid Backup', result.error || 'Could not parse backup file');
      setIsImporting(false);
      return;
    }

    setPreviewData(result.data);
    setIsImporting(false);
  };

  // Handle file picker
  const handlePickFile = async () => {
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', '*/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      if (!file.uri) {
        Alert.alert('Error', 'Could not read file');
        return;
      }

      setIsImporting(true);

      const content = await FileSystem.readAsStringAsync(file.uri);
      processBackupFile(content);
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Failed to read backup file');
      setIsImporting(false);
    }
  };

  // Confirm and restore backup
  const handleRestore = async () => {
    if (!previewData) return;

    Alert.alert(
      'Restore Backup',
      'This will replace all your current data with the backup data. This action cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            setIsImporting(true);
            try {
              await restoreFromBackup(previewData);
              
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              
              Alert.alert(
                'Restore Complete',
                'Your data has been restored successfully.',
                [{ text: 'OK', onPress: () => router.back() }]
              );
            } catch (error) {
              console.error('Restore error:', error);
              Alert.alert('Error', 'Failed to restore backup');
            } finally {
              setIsImporting(false);
              setPreviewData(null);
            }
          },
        },
      ]
    );
  };

  const handleCancelPreview = () => {
    setPreviewData(null);
  };

  const summary = previewData ? getBackupSummary(previewData) : null;

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      {/* Hidden file input for Web */}
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef as any}
          type="file"
          accept=".json,application/json"
          onChange={handleWebFileSelect as any}
          style={{ display: 'none' }}
        />
      )}

      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={{ color: colors.primary, fontSize: 16 }}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Backup & Restore</Text>
        </View>

        {!previewData ? (
          <>
            {/* Export Section */}
            <Animated.View
              entering={FadeInDown.delay(100).duration(300)}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.cardIcon}>
                <IconSymbol name="arrow.up.doc.fill" size={32} color={colors.success} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                Export Backup
              </Text>
              <Text style={[styles.cardDescription, { color: colors.muted }]}>
                Download all your portfolios, holdings, transactions, and settings as a JSON file.
              </Text>
              
              <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.foreground }]}>
                    {state.portfolios.length}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.muted }]}>Portfolios</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.foreground }]}>
                    {state.holdings.length}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.muted }]}>Holdings</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.foreground }]}>
                    {state.transactions.length}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.muted }]}>Transactions</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleExport}
                disabled={isExporting}
                style={[
                  styles.button,
                  { backgroundColor: colors.success, opacity: isExporting ? 0.6 : 1 },
                ]}
              >
                {isExporting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Download Backup</Text>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Import Section */}
            <Animated.View
              entering={FadeInDown.delay(200).duration(300)}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={styles.cardIcon}>
                <IconSymbol name="arrow.down.doc.fill" size={32} color={colors.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                Restore from Backup
              </Text>
              <Text style={[styles.cardDescription, { color: colors.muted }]}>
                Import a previously exported backup file to restore your data. This will replace all current data.
              </Text>

              <TouchableOpacity
                onPress={handlePickFile}
                disabled={isImporting}
                style={[
                  styles.button,
                  { backgroundColor: colors.primary, opacity: isImporting ? 0.6 : 1 },
                ]}
              >
                {isImporting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Select Backup File</Text>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Warning */}
            <Animated.View
              entering={FadeInDown.delay(300).duration(300)}
              style={[styles.warningCard, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '30' }]}
            >
              <IconSymbol name="exclamationmark.triangle.fill" size={20} color={colors.warning} />
              <Text style={[styles.warningText, { color: colors.foreground }]}>
                Restoring a backup will permanently replace all your current data. Make sure to export a backup of your current data first if needed.
              </Text>
            </Animated.View>
          </>
        ) : (
          /* Preview Section */
          <Animated.View
            entering={FadeInUp.duration(300)}
            style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.previewTitle, { color: colors.foreground }]}>
              Backup Preview
            </Text>
            
            <View style={[styles.previewInfo, { borderColor: colors.border }]}>
              <View style={styles.previewRow}>
                <Text style={[styles.previewLabel, { color: colors.muted }]}>Version</Text>
                <Text style={[styles.previewValue, { color: colors.foreground }]}>{summary?.version}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={[styles.previewLabel, { color: colors.muted }]}>Exported At</Text>
                <Text style={[styles.previewValue, { color: colors.foreground }]}>
                  {summary?.exportedAt ? new Date(summary.exportedAt).toLocaleString() : '-'}
                </Text>
              </View>
            </View>

            <View style={styles.previewStats}>
              <View style={[styles.previewStatItem, { backgroundColor: colors.background }]}>
                <Text style={[styles.previewStatValue, { color: colors.primary }]}>
                  {summary?.portfolioCount}
                </Text>
                <Text style={[styles.previewStatLabel, { color: colors.muted }]}>Portfolios</Text>
              </View>
              <View style={[styles.previewStatItem, { backgroundColor: colors.background }]}>
                <Text style={[styles.previewStatValue, { color: colors.primary }]}>
                  {summary?.holdingCount}
                </Text>
                <Text style={[styles.previewStatLabel, { color: colors.muted }]}>Holdings</Text>
              </View>
              <View style={[styles.previewStatItem, { backgroundColor: colors.background }]}>
                <Text style={[styles.previewStatValue, { color: colors.primary }]}>
                  {summary?.transactionCount}
                </Text>
                <Text style={[styles.previewStatLabel, { color: colors.muted }]}>Transactions</Text>
              </View>
            </View>

            <View style={styles.previewActions}>
              <TouchableOpacity
                onPress={handleCancelPreview}
                style={[styles.cancelButton, { borderColor: colors.border }]}
              >
                <Text style={[styles.cancelButtonText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleRestore}
                disabled={isImporting}
                style={[
                  styles.restoreButton,
                  { backgroundColor: colors.error, opacity: isImporting ? 0.6 : 1 },
                ]}
              >
                {isImporting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.restoreButtonText}>Restore Data</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  card: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  cardIcon: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: 16,
    marginBottom: 20,
    borderTopWidth: 1,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  previewCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  previewInfo: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  previewLabel: {
    fontSize: 14,
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  previewStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  previewStatItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  previewStatValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  previewStatLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  restoreButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  restoreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
