import {
  ScrollView,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  Linking,
  StyleSheet,
  Switch,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/use-colors';
import { useThemeContext } from '@/lib/theme-provider';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { ApiKeys } from '@/types';

interface ApiKeyConfig {
  key: keyof ApiKeys;
  name: string;
  description: string;
  placeholder: string;
  docsUrl: string;
}

const API_KEYS_CONFIG: ApiKeyConfig[] = [
  {
    key: 'yahooFinance',
    name: 'Yahoo Finance (RapidAPI)',
    description: 'Free tier: 500 requests/month via RapidAPI',
    placeholder: 'Enter your RapidAPI key for Yahoo Finance',
    docsUrl: 'https://rapidapi.com/sparior/api/yahoo-finance15',
  },
  {
    key: 'finnhub',
    name: 'Finnhub',
    description: 'Free tier: 60 requests/min for real-time stock data. Some data may not be available.',
    placeholder: 'Enter your Finnhub API key',
    docsUrl: 'https://finnhub.io/register',
  },
];

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state, updateSettings } = useApp();
  const { colorScheme, setColorScheme } = useThemeContext();
  
  const [apiKeys, setApiKeys] = useState<ApiKeys>(state.settings.apiKeys || {});
  const [showInTHB, setShowInTHB] = useState(state.settings.showInTHB);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Track changes
  useEffect(() => {
    const keysChanged = JSON.stringify(apiKeys) !== JSON.stringify(state.settings.apiKeys || {});
    const thbChanged = showInTHB !== state.settings.showInTHB;
    setHasChanges(keysChanged || thbChanged);
  }, [apiKeys, showInTHB, state.settings]);

  const handleApiKeyChange = (key: keyof ApiKeys, value: string) => {
    setApiKeys(prev => ({
      ...prev,
      [key]: value.trim() || undefined,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update settings
      await updateSettings({
        apiKeys,
        showInTHB,
      });

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      Alert.alert('Success', 'Settings saved successfully');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenDocs = (url: string) => {
    Linking.openURL(url);
  };

  const renderApiKeyInput = (config: ApiKeyConfig, index: number) => (
    <Animated.View
      key={config.key}
      entering={FadeInDown.delay(index * 50).duration(300)}
      style={[styles.apiKeyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={styles.apiKeyHeader}>
        <View style={styles.apiKeyNameRow}>
          <Text style={[styles.apiKeyName, { color: colors.foreground }]}>
            {config.name}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => handleOpenDocs(config.docsUrl)}
          style={[styles.docsButton, { backgroundColor: colors.primary + '15' }]}
        >
          <Text style={[styles.docsButtonText, { color: colors.primary }]}>
            Get API Key
          </Text>
        </TouchableOpacity>
      </View>
      
      <Text style={[styles.apiKeyDescription, { color: colors.foreground, opacity: 0.6 }]}>
        {config.description}
      </Text>
      
      <TextInput
        value={apiKeys[config.key] || ''}
        onChangeText={(value) => handleApiKeyChange(config.key, value)}
        placeholder={config.placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        style={[
          styles.apiKeyInput,
          { 
            backgroundColor: colors.background, 
            color: colors.foreground,
            borderColor: colors.border,
          },
        ]}
      />
      
      {apiKeys[config.key] && (
        <View style={[styles.statusBadge, { backgroundColor: colors.success + '15' }]}>
          <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
          <Text style={[styles.statusText, { color: colors.success }]}>Configured</Text>
        </View>
      )}
    </Animated.View>
  );

  return (
    <ScreenContainer>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View 
          entering={FadeInDown.duration(300)}
          style={styles.header}
        >
          <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
          <Text style={[styles.subtitle, { color: colors.foreground, opacity: 0.6 }]}>
            Configure API keys and preferences
          </Text>
        </Animated.View>

        {/* API Keys Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            API Keys
          </Text>
          <Text style={[styles.sectionDescription, { color: colors.foreground, opacity: 0.6 }]}>
            Add your own API keys to fetch real-time stock data. The app uses Yahoo Finance by default, but you can add additional data sources for more features.
          </Text>
          
          {API_KEYS_CONFIG.map((config, index) => renderApiKeyInput(config, index))}
        </View>

        {/* Display Settings Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Display Settings
          </Text>

          <Animated.View
            entering={FadeInDown.delay(200).duration(300)}
            style={[styles.settingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingName, { color: colors.foreground }]}>
                  Dark Mode
                </Text>
                <Text style={[styles.settingDescription, { color: colors.foreground, opacity: 0.6 }]}>
                  Switch between light and dark theme
                </Text>
              </View>
              <Switch
                value={colorScheme === 'dark'}
                onValueChange={(value) => setColorScheme(value ? 'dark' : 'light')}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingName, { color: colors.foreground }]}>
                  Show values in THB
                </Text>
                <Text style={[styles.settingDescription, { color: colors.foreground, opacity: 0.6 }]}>
                  Display portfolio values in Thai Baht
                </Text>
              </View>
              <Switch
                value={showInTHB}
                onValueChange={setShowInTHB}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          </Animated.View>
        </View>

        {/* Exchange Rate Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Exchange Rate
          </Text>

          <Animated.View
            entering={FadeInDown.delay(250).duration(300)}
            style={[styles.settingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.settingName, { color: colors.foreground }]}>
              USD/THB Rate
            </Text>
            <Text style={[styles.settingDescription, { color: colors.foreground, opacity: 0.6 }]}>
              Real-time exchange rate from market data.
            </Text>

            <View style={styles.rateInputContainer}>
              <Text style={[styles.ratePrefix, { color: colors.foreground }]}>1 USD =</Text>
              <TextInput
                value={state.currencyRate.usdThb.toFixed(2)}
                editable={false}
                style={[
                  styles.rateInput,
                  {
                    backgroundColor: colors.border + '30',
                    color: colors.foreground,
                    borderColor: colors.border,
                  },
                ]}
              />
              <Text style={[styles.rateSuffix, { color: colors.foreground }]}>THB</Text>
            </View>
          </Animated.View>
        </View>

        {/* Backup & Restore Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Data Management
          </Text>
          
          <Animated.View
            entering={FadeInDown.delay(280).duration(300)}
            style={[styles.settingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.settingInfo}>
              <Text style={[styles.settingName, { color: colors.foreground }]}>
                Backup & Restore
              </Text>
              <Text style={[styles.settingDescription, { color: colors.foreground, opacity: 0.6 }]}>
                Export your data as JSON or restore from a backup file
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/backup')}
              style={[styles.backupButton, { backgroundColor: colors.primary + '15' }]}
            >
              <Text style={[styles.backupButtonText, { color: colors.primary }]}>
                Open Backup
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            About
          </Text>

          <Animated.View
            entering={FadeInDown.delay(300).duration(300)}
            style={[styles.settingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.aboutHeader}>
              <Text style={[styles.appName, { color: colors.foreground }]}>TradeMind</Text>
              <Text style={[styles.appTagline, { color: colors.foreground, opacity: 0.6 }]}>
                Track your investments with ease
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.aboutRow}>
              <Text style={[styles.aboutLabel, { color: colors.foreground, opacity: 0.6 }]}>Version</Text>
              <Text style={[styles.aboutValue, { color: colors.foreground }]}>0.1.0</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.aboutRow}>
              <Text style={[styles.aboutLabel, { color: colors.foreground, opacity: 0.6 }]}>Platform</Text>
              <Text style={[styles.aboutValue, { color: colors.foreground }]}>React Native / Expo</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.aboutRow}>
              <Text style={[styles.aboutLabel, { color: colors.foreground, opacity: 0.6 }]}>Data Sources</Text>
              <Text style={[styles.aboutValue, { color: colors.foreground }]}>Yahoo Finance, Finnhub</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.aboutRow}>
              <Text style={[styles.aboutLabel, { color: colors.foreground, opacity: 0.6 }]}>Developer</Text>
              <Text style={[styles.aboutValue, { color: colors.foreground }]}>Pahn Kanchanop</Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <Text style={[styles.aboutFooter, { color: colors.foreground, opacity: 0.5 }]}>
              Built with React Native and Expo. Uses real-time market data from Yahoo Finance and Finnhub APIs.
            </Text>
          </Animated.View>
        </View>

        {/* Save Button */}
        {hasChanges && (
          <Animated.View entering={FadeInDown.duration(200)}>
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving}
              style={[
                styles.saveButton,
                { 
                  backgroundColor: colors.primary,
                  opacity: isSaving ? 0.6 : 1,
                },
              ]}
            >
              <Text style={styles.saveButtonText}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  apiKeyCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  apiKeyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  apiKeyName: {
    fontSize: 16,
    fontWeight: '600',
  },
  apiKeyNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  recommendedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: '600',
  },
  docsButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  docsButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  apiKeyDescription: {
    fontSize: 13,
    marginBottom: 12,
  },
  apiKeyInput: {
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  settingCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
  },
  rateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  ratePrefix: {
    fontSize: 15,
    marginRight: 8,
  },
  rateInput: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    fontWeight: '600',
    borderWidth: 1,
    textAlign: 'center',
  },
  rateSuffix: {
    fontSize: 15,
    marginLeft: 8,
  },
  aboutHeader: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  appName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  appTagline: {
    fontSize: 14,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  aboutLabel: {
    fontSize: 14,
  },
  aboutValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  aboutFooter: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    paddingTop: 8,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 40,
  },
  backupButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  backupButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
