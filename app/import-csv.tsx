import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useState, useMemo, useRef } from 'react';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { ScreenContainer } from '@/components/screen-container';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/use-colors';
import { parseCSV, calculateHoldingsFromTransactions, validateCSV } from '@/lib/csv-parser';
import type { ParsedCSVRow, Transaction, Holding } from '@/types';
import { generateId } from '@/lib/storage';

export default function ImportCSVScreen() {
  const colors = useColors();
  const router = useRouter();
  const { state, importTransactions, addHolding, updateHolding } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [csvContent, setCsvContent] = useState('');
  const [parsedData, setParsedData] = useState<ParsedCSVRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isParsed, setIsParsed] = useState(false);
  const [fileName, setFileName] = useState('');
  const [selectedPortfolioId, setSelectedPortfolioId] = useState(
    state.portfolios[0]?.id || ''
  );

  // Calculate summary from parsed data
  const summary = useMemo(() => {
    if (parsedData.length === 0) return null;

    const buys = parsedData.filter((tx) => tx.type === 'BUY');
    const sells = parsedData.filter((tx) => tx.type === 'SELL');
    const uniqueSymbols = new Set(parsedData.map((tx) => tx.symbol));
    const totalBuyAmount = buys.reduce((sum, tx) => sum + tx.netAmount, 0);
    const totalSellAmount = sells.reduce((sum, tx) => sum + tx.netAmount, 0);

    return {
      totalTransactions: parsedData.length,
      buyCount: buys.length,
      sellCount: sells.length,
      uniqueSymbols: uniqueSymbols.size,
      totalBuyAmount,
      totalSellAmount,
      symbols: Array.from(uniqueSymbols),
    };
  }, [parsedData]);

  // Calculate resulting holdings
  const resultingHoldings = useMemo(() => {
    if (parsedData.length === 0) return [];
    const holdingsMap = calculateHoldingsFromTransactions(parsedData);
    return Array.from(holdingsMap.entries()).map(([symbol, data]) => ({
      symbol,
      shares: data.shares,
      avgCost: data.totalCost / data.shares,
      companyName: data.companyName,
    }));
  }, [parsedData]);

  // Handle file selection on Web
  const handleWebFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setCsvContent(content);
        processCSVContent(content);
      }
    };
    reader.onerror = () => {
      Alert.alert('Error', 'Failed to read file');
      setIsLoading(false);
    };
    reader.readAsText(file);
  };

  // Process CSV content
  const processCSVContent = (content: string) => {
    const validation = validateCSV(content);
    if (!validation.valid) {
      Alert.alert('Invalid CSV', validation.error || 'Could not parse CSV file');
      setIsLoading(false);
      return;
    }

    const parsed = parseCSV(content);
    setParsedData(parsed);
    setIsParsed(true);
    setIsLoading(false);
  };

  const handlePickFile = async () => {
    // For Web, use native file input
    if (Platform.OS === 'web') {
      fileInputRef.current?.click();
      return;
    }

    // For Native (iOS/Android)
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv', '*/*'],
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

      setIsLoading(true);
      setFileName(file.name || 'file.csv');

      // Read file content
      const content = await FileSystem.readAsStringAsync(file.uri);
      setCsvContent(content);
      processCSVContent(content);
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Failed to read CSV file. Please try pasting the content instead.');
      setIsLoading(false);
    }
  };

  const handlePasteCSV = () => {
    if (!csvContent.trim()) {
      Alert.alert('Error', 'Please paste CSV content first');
      return;
    }

    setIsLoading(true);
    processCSVContent(csvContent);
  };

  const handleImport = async () => {
    if (parsedData.length === 0) {
      Alert.alert('Error', 'No data to import');
      return;
    }

    if (!selectedPortfolioId) {
      Alert.alert('Error', 'Please select a portfolio');
      return;
    }

    setIsLoading(true);

    try {
      // Convert parsed data to transactions
      const currentRate = state.currencyRate.usdThb;
      const transactions: Omit<Transaction, 'id'>[] = parsedData.map((row) => ({
        portfolioId: selectedPortfolioId,
        symbol: row.symbol,
        companyName: row.companyName,
        type: row.type,
        shares: row.quantity,
        price: row.tradedPrice,
        date: row.tradeDate,
        settlementDate: row.settlementDate,
        grossAmount: row.grossAmount,
        commission: row.commission,
        vat: row.vat,
        netAmount: row.netAmount,
        exchangeRate: currentRate, // Use current rate for imported transactions
      }));

      // Import transactions
      await importTransactions(transactions);

      // Update holdings
      for (const holdingData of resultingHoldings) {
        const existingHolding = state.holdings.find(
          (h) => h.symbol === holdingData.symbol && h.portfolioId === selectedPortfolioId
        );

        if (existingHolding) {
          // Update existing holding
          const newTotalShares = existingHolding.shares + holdingData.shares;
          const newTotalCost =
            existingHolding.shares * existingHolding.avgCost +
            holdingData.shares * holdingData.avgCost;
          const newAvgCost = newTotalCost / newTotalShares;
          
          // Calculate weighted average exchange rate
          const existingCostThb = existingHolding.shares * existingHolding.avgCost * (existingHolding.avgExchangeRate || currentRate);
          const newCostThb = holdingData.shares * holdingData.avgCost * currentRate;
          const newAvgExchangeRate = (existingCostThb + newCostThb) / newTotalCost;

          await updateHolding(existingHolding.id, {
            shares: newTotalShares,
            avgCost: newAvgCost,
            avgExchangeRate: newAvgExchangeRate,
          });
        } else {
          // Create new holding
          await addHolding({
            portfolioId: selectedPortfolioId,
            symbol: holdingData.symbol,
            companyName: holdingData.companyName,
            shares: holdingData.shares,
            avgCost: holdingData.avgCost,
            avgExchangeRate: currentRate, // Use current rate for imported holdings
            lots: [],
          });
        }
      }

      Alert.alert(
        'Import Successful',
        `Imported ${transactions.length} transactions and ${resultingHoldings.length} holdings`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error importing:', error);
      Alert.alert('Error', 'Failed to import data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setCsvContent('');
    setParsedData([]);
    setIsParsed(false);
    setFileName('');
  };

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      {/* Hidden file input for Web */}
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef as any}
          type="file"
          accept=".csv,text/csv,application/csv"
          onChange={handleWebFileSelect as any}
          style={{ display: 'none' }}
        />
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} className="px-5">
        {/* Header */}
        <View className="flex-row items-center py-4">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Text style={{ color: colors.tint, fontSize: 16 }}>← Back</Text>
          </TouchableOpacity>
          <Text className="text-foreground text-xl font-bold flex-1">Import CSV</Text>
          {isParsed && (
            <TouchableOpacity onPress={handleReset}>
              <Text style={{ color: colors.error }}>Reset</Text>
            </TouchableOpacity>
          )}
        </View>

        {!isParsed ? (
          <>
            {/* Instructions */}
            <View className="py-2 mb-4">
              <Text className="text-muted text-sm">
                Import your trading history from a CSV file. Supported format: Monthly Statement
                from your broker.
              </Text>
            </View>

            {/* File Picker */}
            <TouchableOpacity
              onPress={handlePickFile}
              disabled={isLoading}
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 2,
                borderStyle: 'dashed',
                borderRadius: 16,
                padding: 24,
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.tint} size="large" />
              ) : (
                <>
                  <IconSymbol name="doc.text.fill" size={40} color={colors.tint} />
                  <Text style={{ color: colors.foreground, fontWeight: '600', marginTop: 12 }}>
                    {fileName || 'Pick CSV File'}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                    Tap to select a file from your device
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Or Paste */}
            <View className="flex-row items-center my-4">
              <View className="flex-1 h-px bg-border" />
              <Text className="text-muted mx-4">or paste CSV content</Text>
              <View className="flex-1 h-px bg-border" />
            </View>

            {/* Text Input for Pasting */}
            <View className="mb-4">
              <TextInput
                value={csvContent}
                onChangeText={setCsvContent}
                placeholder="Paste CSV content here..."
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={10}
                textAlignVertical="top"
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 16,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  color: colors.foreground,
                  borderWidth: 1,
                  borderColor: colors.border,
                  minHeight: 200,
                  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                  fontSize: 11,
                }}
              />
            </View>

            <TouchableOpacity
              onPress={handlePasteCSV}
              disabled={isLoading || !csvContent.trim()}
              style={{
                backgroundColor: csvContent.trim() ? colors.tint : colors.muted,
                opacity: isLoading ? 0.6 : 1,
                paddingVertical: 16,
                borderRadius: 16,
                alignItems: 'center',
              }}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '600' }}>Parse CSV</Text>
              )}
            </TouchableOpacity>

            {/* Expected Format */}
            <View
              style={{
                marginTop: 24,
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: colors.foreground, fontWeight: '600', marginBottom: 8 }}>
                Expected CSV Format
              </Text>
              <Text
                style={{
                  color: colors.muted,
                  fontSize: 10,
                  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                }}
              >
                Symbol & Name,Trade Date,Settlement Date,Buy/Sell,Quantity,Traded Price,Gross
                Amount,Comm/Fee/Tax,VAT,Net Amount
              </Text>
              <Text
                style={{
                  color: colors.muted,
                  fontSize: 10,
                  fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                  marginTop: 8,
                }}
              >
                NVDA NVIDIA CORPORATION,25/11/2025,26/11/2025,BUY,0.5,172.12,86.06,-0.09,-0.01,86.16
              </Text>
            </View>
          </>
        ) : (
          <>
            {/* Summary */}
            {summary && (
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <Text style={{ color: colors.foreground, fontWeight: '700', fontSize: 18, marginBottom: 12 }}>
                  Import Summary
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  <View style={{ flex: 1, minWidth: 100 }}>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>Total Transactions</Text>
                    <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: '700' }}>
                      {summary.totalTransactions}
                    </Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 100 }}>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>Unique Symbols</Text>
                    <Text style={{ color: colors.foreground, fontSize: 20, fontWeight: '700' }}>
                      {summary.uniqueSymbols}
                    </Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 100 }}>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>Buy Orders</Text>
                    <Text style={{ color: colors.success, fontSize: 20, fontWeight: '700' }}>
                      {summary.buyCount}
                    </Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 100 }}>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>Sell Orders</Text>
                    <Text style={{ color: colors.error, fontSize: 20, fontWeight: '700' }}>
                      {summary.sellCount}
                    </Text>
                  </View>
                </View>
                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: colors.muted }}>Total Buy Amount</Text>
                    <Text style={{ color: colors.success, fontWeight: '600' }}>
                      ${summary.totalBuyAmount.toFixed(2)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: colors.muted }}>Total Sell Amount</Text>
                    <Text style={{ color: colors.error, fontWeight: '600' }}>
                      ${summary.totalSellAmount.toFixed(2)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Portfolio Selector */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ color: colors.foreground, fontWeight: '600', marginBottom: 8 }}>
                Import to Portfolio
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {state.portfolios.map((portfolio) => (
                    <TouchableOpacity
                      key={portfolio.id}
                      onPress={() => setSelectedPortfolioId(portfolio.id)}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 10,
                        borderRadius: 10,
                        backgroundColor:
                          selectedPortfolioId === portfolio.id ? colors.tint : colors.surface,
                      }}
                    >
                      <Text
                        style={{
                          color: selectedPortfolioId === portfolio.id ? '#fff' : colors.foreground,
                          fontWeight: '500',
                        }}
                      >
                        {portfolio.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Resulting Holdings */}
            {resultingHoldings.length > 0 && (
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <Text style={{ color: colors.foreground, fontWeight: '600', marginBottom: 12 }}>
                  Resulting Holdings ({resultingHoldings.length})
                </Text>
                {resultingHoldings.map((holding, index) => (
                  <View
                    key={holding.symbol}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 8,
                      borderTopWidth: index > 0 ? 1 : 0,
                      borderTopColor: colors.border,
                    }}
                  >
                    <View>
                      <Text style={{ color: colors.foreground, fontWeight: '600' }}>
                        {holding.symbol}
                      </Text>
                      <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>
                        {holding.companyName}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: colors.foreground, fontWeight: '600' }}>
                        {holding.shares.toFixed(4)} shares
                      </Text>
                      <Text style={{ color: colors.muted, fontSize: 12 }}>
                        Avg: ${holding.avgCost.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Import Button */}
            <TouchableOpacity
              onPress={handleImport}
              disabled={isLoading}
              style={{
                backgroundColor: colors.success,
                opacity: isLoading ? 0.6 : 1,
                paddingVertical: 16,
                borderRadius: 16,
                alignItems: 'center',
              }}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                  Import {parsedData.length} Transactions
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
