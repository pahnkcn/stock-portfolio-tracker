import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Keyboard,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/use-colors';
import { useApp } from '@/context/AppContext';
import { trpc } from '@/lib/trpc';

interface StockSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

interface SymbolAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelectSymbol: (symbol: string, companyName: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SymbolAutocomplete({
  value,
  onChangeText,
  onSelectSymbol,
  placeholder = 'Enter symbol (e.g., AAPL)',
  autoFocus = false,
}: SymbolAutocompleteProps) {
  const colors = useColors();
  const { state } = useApp();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<TextInput>(null);
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animation values
  const dropdownHeight = useSharedValue(0);

  // Check if any API key is configured
  const hasApiKey = !!(
    state.settings.apiKeys?.alphaVantage ||
    state.settings.apiKeys?.finnhub ||
    state.settings.apiKeys?.twelveData ||
    state.settings.apiKeys?.polygonIo
  );

  // Search query with debounce - only if API key is configured
  const { data: searchResults, isLoading } = trpc.stock.search.useQuery(
    { query: debouncedQuery },
    {
      enabled: debouncedQuery.length >= 1 && hasApiKey,
      staleTime: 30000, // Cache results for 30 seconds
    }
  );

  // Debounce search input
  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    if (value.length >= 1 && hasApiKey) {
      debounceTimeout.current = setTimeout(() => {
        setDebouncedQuery(value.toUpperCase());
        setShowSuggestions(true);
      }, 300);
    } else {
      setDebouncedQuery('');
      setShowSuggestions(false);
    }

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [value, hasApiKey]);

  // Animate dropdown
  useEffect(() => {
    const hasResults = searchResults && searchResults.length > 0;
    const targetHeight = showSuggestions && hasResults ? Math.min(searchResults.length * 60, 300) : 0;
    dropdownHeight.value = withSpring(targetHeight, { damping: 20, stiffness: 200 });
  }, [showSuggestions, searchResults]);

  const dropdownAnimatedStyle = useAnimatedStyle(() => ({
    height: dropdownHeight.value,
    opacity: dropdownHeight.value > 0 ? 1 : 0,
  }));

  const handleSelect = useCallback((result: StockSearchResult) => {
    onChangeText(result.symbol);
    onSelectSymbol(result.symbol, result.name);
    setShowSuggestions(false);
    Keyboard.dismiss();
  }, [onChangeText, onSelectSymbol]);

  const handleFocus = useCallback(() => {
    if (value.length >= 1 && searchResults && searchResults.length > 0 && hasApiKey) {
      setShowSuggestions(true);
    }
  }, [value, searchResults, hasApiKey]);

  const handleBlur = useCallback(() => {
    // Delay hiding to allow tap on suggestion
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  }, []);

  // Handle manual input submission (when no API key)
  const handleSubmitEditing = useCallback(() => {
    if (value.trim()) {
      onSelectSymbol(value.toUpperCase(), '');
    }
  }, [value, onSelectSymbol]);

  return (
    <View style={styles.container}>
      {/* Input Field */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.surface,
            borderColor: showSuggestions ? colors.primary : colors.border,
          },
        ]}
      >
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={handleSubmitEditing}
          placeholder={hasApiKey ? 'Search symbol (e.g., AAPL)' : placeholder}
          placeholderTextColor={colors.muted}
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus={autoFocus}
          style={[styles.input, { color: colors.foreground }]}
          returnKeyType={hasApiKey ? 'search' : 'done'}
        />
        {isLoading && hasApiKey && (
          <ActivityIndicator size="small" color={colors.primary} style={styles.loader} />
        )}
        {!hasApiKey && (
          <View style={[styles.manualBadge, { backgroundColor: colors.warning + '15' }]}>
            <Text style={[styles.manualText, { color: colors.warning }]}>Manual</Text>
          </View>
        )}
      </View>

      {/* Hint text when no API key */}
      {!hasApiKey && (
        <Text style={[styles.hintText, { color: colors.muted }]}>
          Enter stock symbol manually. Add API key in Settings for autocomplete.
        </Text>
      )}

      {/* Suggestions Dropdown - only shown when API key is configured */}
      {hasApiKey && (
        <Animated.View
          style={[
            styles.dropdown,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              ...Platform.select({
                ios: {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 12,
                },
                android: { elevation: 8 },
                web: { boxShadow: '0 4px 20px rgba(0,0,0,0.1)' },
              }),
            },
            dropdownAnimatedStyle,
          ]}
        >
          {searchResults?.map((result, index) => (
            <Animated.View
              key={result.symbol}
              entering={FadeIn.delay(index * 30).duration(150)}
            >
              <Pressable
                onPress={() => handleSelect(result)}
                style={({ pressed }) => [
                  styles.suggestionItem,
                  {
                    backgroundColor: pressed ? colors.border + '30' : 'transparent',
                    borderBottomColor: colors.border,
                    borderBottomWidth: index < searchResults.length - 1 ? 1 : 0,
                  },
                ]}
              >
                <View style={styles.suggestionContent}>
                  <View style={styles.symbolRow}>
                    <Text style={[styles.symbol, { color: colors.foreground }]}>
                      {result.symbol}
                    </Text>
                    <View style={[styles.exchangeBadge, { backgroundColor: colors.primary + '15' }]}>
                      <Text style={[styles.exchangeText, { color: colors.primary }]}>
                        {result.exchange}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={[styles.companyName, { color: colors.foreground, opacity: 0.7 }]}
                    numberOfLines={1}
                  >
                    {result.name}
                  </Text>
                </View>
                <Text style={[styles.typeText, { color: colors.muted }]}>
                  {result.type}
                </Text>
              </Pressable>
            </Animated.View>
          ))}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    height: 52,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  loader: {
    marginLeft: 8,
  },
  manualBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  manualText: {
    fontSize: 11,
    fontWeight: '600',
  },
  hintText: {
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  dropdown: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 1001,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  suggestionContent: {
    flex: 1,
  },
  symbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  symbol: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  exchangeBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  exchangeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  companyName: {
    fontSize: 13,
  },
  typeText: {
    fontSize: 11,
    marginLeft: 8,
  },
});
