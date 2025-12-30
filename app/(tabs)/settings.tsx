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
import { useState, useEffect } from 'react';
import { ScreenContainer } from '@/components/screen-container';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/use-colors';
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
    key: 'alphaVantage',
    name: 'Alpha Vantage',
    description: 'Free stock data API with 25 requests/day',
    placeholder: 'Enter your Alpha Vantage API key',
    docsUrl: 'https://www.alphavantage.co/support/#api-key',
  },
  {
    key: 'finnhub',
    name: 'Finnhub',
    description: 'Real-time stock data with 60 requests/min',
    placeholder: 'Enter your Finnhub API key',
    docsUrl: 'https://finnhub.io/register',
  },
  {
    key: 'twelveData',
    name: 'Twelve Data',
    description: 'Stock market data with 800 requests/day',
    placeholder: 'Enter your Twelve Data API key',
    docsUrl: 'https://twelvedata.com/account/api-keys',
  },
  {
    key: 'polygonIo',
    name: 'Polygon.io',
    description: 'Comprehensive market data API',
    placeholder: 'Enter your Polygon.io API key',
    docsUrl: 'https://polygon.io/dashboard/api-keys',
  },
];

export default function SettingsScreen() {
  const colors = useColors();
  const { state, updateSettings, updateCurrencyRate } = useApp();
  
  const [apiKeys, setApiKeys] = useState<ApiKeys>(state.settings.apiKeys || {});
  const [showInTHB, setShowInTHB] = useState(state.settings.showInTHB);
  const [manualRate, setManualRate] = useState(
    state.settings.manualExchangeRate?.toString() || ''
  );
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Track changes
  useEffect(() => {
    const keysChanged = JSON.stringify(apiKeys) !== JSON.stringify(state.settings.apiKeys || {});
    const thbChanged = showInTHB !== state.settings.showInTHB;
    const rateChanged = manualRate !== (state.settings.manualExchangeRate?.toString() || '');
    setHasChanges(keysChanged || thbChanged || rateChanged);
  }, [apiKeys, showInTHB, manualRate, state.settings]);

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
        manualExchangeRate: manualRate ? parseFloat(manualRate) : undefined,
      });

      // Update currency rate if manual rate is set
      if (manualRate) {
        await updateCurrencyRate(parseFloat(manualRate));
      }

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
        <Text style={[styles.apiKeyName, { color: colors.foreground }]}>
          {config.name}
        </Text>
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
              Manual USD/THB Rate
            </Text>
            <Text style={[styles.settingDescription, { color: colors.foreground, opacity: 0.6 }]}>
              Override the automatic exchange rate. Leave empty to use real-time rate.
            </Text>
            
            <View style={styles.rateInputContainer}>
              <Text style={[styles.ratePrefix, { color: colors.foreground }]}>1 USD =</Text>
              <TextInput
                value={manualRate}
                onChangeText={setManualRate}
                placeholder={state.currencyRate.usdThb.toFixed(2)}
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                style={[
                  styles.rateInput,
                  { 
                    backgroundColor: colors.background, 
                    color: colors.foreground,
                    borderColor: colors.border,
                  },
                ]}
              />
              <Text style={[styles.rateSuffix, { color: colors.foreground }]}>THB</Text>
            </View>
            
            <Text style={[styles.currentRate, { color: colors.foreground, opacity: 0.5 }]}>
              Current rate: ฿{state.currencyRate.usdThb.toFixed(2)}
            </Text>
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
            <View style={styles.aboutRow}>
              <Text style={[styles.aboutLabel, { color: colors.foreground, opacity: 0.6 }]}>Version</Text>
              <Text style={[styles.aboutValue, { color: colors.foreground }]}>1.0.0</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.aboutRow}>
              <Text style={[styles.aboutLabel, { color: colors.foreground, opacity: 0.6 }]}>Data Source</Text>
              <Text style={[styles.aboutValue, { color: colors.foreground }]}>Yahoo Finance</Text>
            </View>
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
  currentRate: {
    fontSize: 12,
    marginTop: 8,
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
});
