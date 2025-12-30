import {
  ScrollView,
  Text,
  View,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useState, useMemo } from 'react';
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

  const [csvContent, setCsvContent] = useState('');
  const [parsedData, setParsedData] = useState<ParsedCSVRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isParsed, setIsParsed] = useState(false);
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

  const handlePickFile = async () => {
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

      // Read file content
      const content = await FileSystem.readAsStringAsync(file.uri);
      setCsvContent(content);

      // Validate and parse
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
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Failed to read CSV file');
      setIsLoading(false);
    }
  };

  const handlePasteCSV = () => {
    if (!csvContent.trim()) {
      Alert.alert('Error', 'Please paste CSV content first');
      return;
    }

    setIsLoading(true);

    const validation = validateCSV(csvContent);
    if (!validation.valid) {
      Alert.alert('Invalid CSV', validation.error || 'Could not parse CSV content');
      setIsLoading(false);
      return;
    }

    const parsed = parseCSV(csvContent);
    setParsedData(parsed);
    setIsParsed(true);
    setIsLoading(false);
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

          await updateHolding(existingHolding.id, {
            shares: newTotalShares,
            avgCost: newAvgCost,
          });
        } else {
          // Create new holding
          await addHolding({
            portfolioId: selectedPortfolioId,
            symbol: holdingData.symbol,
            companyName: holdingData.companyName,
            shares: holdingData.shares,
            avgCost: holdingData.avgCost,
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
  };

  return (
    <ScreenContainer edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} className="px-5">
        {!isParsed ? (
          <>
            {/* Instructions */}
            <View className="py-4">
              <Text className="text-foreground text-lg font-semibold mb-2">Import CSV</Text>
              <Text className="text-muted text-sm">
                Import your trading history from a CSV file. Supported format: Monthly Statement
                from your broker.
              </Text>
            </View>

            {/* File Picker */}
            <TouchableOpacity
              onPress={handlePickFile}
              disabled={isLoading}
              className="bg-surface rounded-xl p-6 border-2 border-dashed border-border items-center mb-4"
            >
              <IconSymbol name="doc.text.fill" size={40} color={colors.tint} />
              <Text className="text-foreground font-medium mt-3">Pick CSV File</Text>
              <Text className="text-muted text-sm mt-1">Tap to select a file</Text>
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
                className="bg-surface rounded-xl px-4 py-3 text-foreground border border-border min-h-[200px] font-mono text-xs"
              />
            </View>

            <TouchableOpacity
              onPress={handlePasteCSV}
              disabled={isLoading || !csvContent.trim()}
              style={[
                {
                  backgroundColor: csvContent.trim() ? colors.tint : colors.muted,
                  opacity: isLoading ? 0.6 : 1,
                },
              ]}
              className="py-4 rounded-xl items-center"
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-background font-semibold">Parse CSV</Text>
              )}
            </TouchableOpacity>

            {/* Expected Format */}
            <View className="mt-6 bg-surface rounded-xl p-4 border border-border">
              <Text className="text-foreground font-medium mb-2">Expected CSV Format</Text>
              <Text className="text-muted text-xs font-mono">
                Symbol & Name,Trade Date,Settlement Date,Buy/Sell,Quantity,Traded Price,Gross
                Amount,Comm/Fee/Tax,VAT,Net Amount
              </Text>
              <Text className="text-muted text-xs font-mono mt-2">
                NVDA NVIDIA CORPORATION,25/11/2025,26/11/2025,BUY,0.5,172.12,86.06,-0.09,-0.01,86.16
              </Text>
            </View>
          </>
        ) : (
          <>
            {/* Preview Header */}
            <View className="py-4 flex-row justify-between items-center">
              <View>
                <Text className="text-foreground text-lg font-semibold">Preview Import</Text>
                <Text className="text-muted text-sm">Review before importing</Text>
              </View>
              <TouchableOpacity onPress={handleReset}>
                <Text className="text-primary">Reset</Text>
              </TouchableOpacity>
            </View>

            {/* Portfolio Selection */}
            <View className="py-2 mb-4">
              <Text className="text-foreground font-medium mb-2">Import to Portfolio</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {state.portfolios.map((portfolio) => (
                  <TouchableOpacity
                    key={portfolio.id}
                    onPress={() => setSelectedPortfolioId(portfolio.id)}
                    style={[
                      {
                        backgroundColor:
                          selectedPortfolioId === portfolio.id ? colors.tint : colors.surface,
                        borderColor:
                          selectedPortfolioId === portfolio.id ? colors.tint : colors.border,
                      },
                    ]}
                    className="px-4 py-2 rounded-full mr-2 border"
                  >
                    <Text
                      style={{
                        color:
                          selectedPortfolioId === portfolio.id
                            ? colors.background
                            : colors.foreground,
                      }}
                      className="font-medium"
                    >
                      {portfolio.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Summary */}
            {summary && (
              <View className="bg-surface rounded-xl p-4 border border-border mb-4">
                <Text className="text-foreground font-semibold mb-3">Summary</Text>
                <View className="flex-row flex-wrap">
                  <View className="w-1/2 mb-2">
                    <Text className="text-muted text-xs">Total Transactions</Text>
                    <Text className="text-foreground text-lg font-semibold">
                      {summary.totalTransactions}
                    </Text>
                  </View>
                  <View className="w-1/2 mb-2">
                    <Text className="text-muted text-xs">Unique Stocks</Text>
                    <Text className="text-foreground text-lg font-semibold">
                      {summary.uniqueSymbols}
                    </Text>
                  </View>
                  <View className="w-1/2">
                    <Text className="text-muted text-xs">Buy Orders</Text>
                    <Text className="text-success text-lg font-semibold">{summary.buyCount}</Text>
                  </View>
                  <View className="w-1/2">
                    <Text className="text-muted text-xs">Sell Orders</Text>
                    <Text className="text-error text-lg font-semibold">{summary.sellCount}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Resulting Holdings */}
            {resultingHoldings.length > 0 && (
              <View className="mb-4">
                <Text className="text-foreground font-semibold mb-3">Resulting Holdings</Text>
                <View className="bg-surface rounded-xl border border-border overflow-hidden">
                  {resultingHoldings.map((holding, index) => (
                    <View
                      key={holding.symbol}
                      className={`flex-row justify-between p-4 ${index > 0 ? 'border-t border-border' : ''}`}
                    >
                      <View>
                        <Text className="text-foreground font-semibold">{holding.symbol}</Text>
                        <Text className="text-muted text-xs" numberOfLines={1}>
                          {holding.companyName}
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-foreground font-medium">
                          {holding.shares.toFixed(5)} shares
                        </Text>
                        <Text className="text-muted text-xs">
                          Avg: ${holding.avgCost.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Recent Transactions Preview */}
            <View className="mb-4">
              <Text className="text-foreground font-semibold mb-3">
                Transactions ({parsedData.length})
              </Text>
              <View className="bg-surface rounded-xl border border-border overflow-hidden">
                {parsedData.slice(0, 5).map((tx, index) => (
                  <View
                    key={index}
                    className={`flex-row justify-between p-3 ${index > 0 ? 'border-t border-border' : ''}`}
                  >
                    <View className="flex-row items-center">
                      <View
                        style={[
                          {
                            backgroundColor:
                              tx.type === 'BUY' ? colors.success + '20' : colors.error + '20',
                          },
                        ]}
                        className="px-2 py-1 rounded mr-2"
                      >
                        <Text
                          style={{ color: tx.type === 'BUY' ? colors.success : colors.error }}
                          className="text-xs font-bold"
                        >
                          {tx.type}
                        </Text>
                      </View>
                      <Text className="text-foreground font-medium">{tx.symbol}</Text>
                    </View>
                    <Text className="text-foreground">
                      {tx.quantity} @ ${tx.tradedPrice.toFixed(2)}
                    </Text>
                  </View>
                ))}
                {parsedData.length > 5 && (
                  <View className="p-3 border-t border-border">
                    <Text className="text-muted text-center text-sm">
                      ... and {parsedData.length - 5} more transactions
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Import Button */}
            <TouchableOpacity
              onPress={handleImport}
              disabled={isLoading}
              style={[
                {
                  backgroundColor: colors.tint,
                  opacity: isLoading ? 0.6 : 1,
                },
              ]}
              className="py-4 rounded-xl items-center"
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-background font-semibold text-lg">
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
