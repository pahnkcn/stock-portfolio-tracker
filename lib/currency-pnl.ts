/**
 * Currency P&L Calculation Module
 * 
 * Calculates profit/loss breakdown into:
 * 1. Stock P&L - gain/loss from stock price changes
 * 2. Currency P&L - gain/loss from exchange rate changes
 * 3. Total P&L in THB - combined effect
 */

import type {
  Holding,
  Transaction,
  StockQuote,
  HoldingCurrencyAnalysis,
  PortfolioCurrencyAnalysis,
  RealizedCurrencyPnL,
} from '@/types';

/**
 * Calculate currency P&L breakdown for a single holding
 */
export function calculateHoldingCurrencyPnL(
  holding: Holding,
  currentPrice: number,
  currentRate: number
): HoldingCurrencyAnalysis {
  const { symbol, companyName, shares, avgCost, avgExchangeRate } = holding;
  
  // Cost basis
  const costUsd = shares * avgCost;
  const costThb = costUsd * avgExchangeRate;
  
  // Current value
  const valueUsd = shares * currentPrice;
  const valueThb = valueUsd * currentRate;
  
  // Stock P&L (from price change)
  const stockPnLUsd = valueUsd - costUsd;
  const stockPnLThb = stockPnLUsd * currentRate;
  const stockPnLPercent = costUsd > 0 ? (stockPnLUsd / costUsd) * 100 : 0;
  
  // Currency P&L (from exchange rate change)
  // Formula: Cost in USD × (Current Rate - Avg Purchase Rate)
  const currencyPnLThb = costUsd * (currentRate - avgExchangeRate);
  const currencyPnLPercent = costThb > 0 ? (currencyPnLThb / costThb) * 100 : 0;
  
  // Total P&L in THB
  const totalPnLThb = valueThb - costThb;
  const totalPnLPercent = costThb > 0 ? (totalPnLThb / costThb) * 100 : 0;
  
  return {
    symbol,
    companyName,
    shares,
    costUsd,
    costThb,
    avgPurchaseRate: avgExchangeRate,
    currentRate,
    currentPriceUsd: currentPrice,
    valueUsd,
    valueThb,
    stockPnLUsd,
    stockPnLThb,
    stockPnLPercent,
    currencyPnLThb,
    currencyPnLPercent,
    totalPnLThb,
    totalPnLPercent,
  };
}

/**
 * Calculate currency P&L for entire portfolio
 */
export function calculatePortfolioCurrencyPnL(
  holdings: Holding[],
  quotes: Record<string, StockQuote>,
  currentRate: number
): PortfolioCurrencyAnalysis {
  // Filter out holdings with 0 shares
  const activeHoldings = holdings.filter(h => h.shares > 0);
  
  // Calculate per-holding analysis
  const holdingAnalyses: HoldingCurrencyAnalysis[] = activeHoldings.map(holding => {
    const quote = quotes[holding.symbol];
    const currentPrice = quote?.currentPrice || holding.avgCost;
    return calculateHoldingCurrencyPnL(holding, currentPrice, currentRate);
  });
  
  // Aggregate totals
  const totalCostUsd = holdingAnalyses.reduce((sum, h) => sum + h.costUsd, 0);
  const totalCostThb = holdingAnalyses.reduce((sum, h) => sum + h.costThb, 0);
  const totalValueUsd = holdingAnalyses.reduce((sum, h) => sum + h.valueUsd, 0);
  const totalValueThb = holdingAnalyses.reduce((sum, h) => sum + h.valueThb, 0);
  
  // P&L Breakdown
  const totalStockPnLUsd = holdingAnalyses.reduce((sum, h) => sum + h.stockPnLUsd, 0);
  const totalStockPnLThb = holdingAnalyses.reduce((sum, h) => sum + h.stockPnLThb, 0);
  const totalStockPnLPercent = totalCostUsd > 0 ? (totalStockPnLUsd / totalCostUsd) * 100 : 0;
  
  const totalCurrencyPnLThb = holdingAnalyses.reduce((sum, h) => sum + h.currencyPnLThb, 0);
  const totalCurrencyPnLPercent = totalCostThb > 0 ? (totalCurrencyPnLThb / totalCostThb) * 100 : 0;
  
  const totalPnLThb = totalValueThb - totalCostThb;
  const totalPnLPercent = totalCostThb > 0 ? (totalPnLThb / totalCostThb) * 100 : 0;
  
  // Today's change (from stock price change only)
  const todayChangeUsd = activeHoldings.reduce((sum, holding) => {
    const quote = quotes[holding.symbol];
    if (quote) {
      return sum + (quote.change * holding.shares);
    }
    return sum;
  }, 0);
  const todayChangeThb = todayChangeUsd * currentRate;
  
  return {
    totalCostUsd,
    totalCostThb,
    totalValueUsd,
    totalValueThb,
    totalStockPnLUsd,
    totalStockPnLThb,
    totalStockPnLPercent,
    totalCurrencyPnLThb,
    totalCurrencyPnLPercent,
    totalPnLThb,
    totalPnLPercent,
    todayChangeUsd,
    todayChangeThb,
    currentRate,
    holdings: holdingAnalyses,
  };
}

/**
 * Calculate realized currency P&L from completed trades
 * Uses FIFO matching to pair buys with sells
 */
export function calculateRealizedCurrencyPnL(
  transactions: Transaction[]
): RealizedCurrencyPnL[] {
  const realizedPnL: RealizedCurrencyPnL[] = [];
  
  // Group transactions by symbol
  const bySymbol = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const existing = bySymbol.get(tx.symbol) || [];
    existing.push(tx);
    bySymbol.set(tx.symbol, existing);
  }
  
  // Process each symbol
  for (const [symbol, txs] of bySymbol) {
    // Sort by date
    const sorted = [...txs].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // FIFO queue of buy lots
    const buyQueue: Array<{
      shares: number;
      price: number;
      rate: number;
      date: string;
    }> = [];
    
    for (const tx of sorted) {
      if (tx.type === 'BUY') {
        buyQueue.push({
          shares: tx.shares,
          price: tx.price,
          rate: tx.exchangeRate,
          date: tx.date,
        });
      } else {
        // SELL - match with buy lots using FIFO
        let remainingShares = tx.shares;
        
        while (remainingShares > 0 && buyQueue.length > 0) {
          const buyLot = buyQueue[0];
          const matchedShares = Math.min(remainingShares, buyLot.shares);
          
          // Calculate P&L for this matched portion
          const buyPriceUsd = buyLot.price;
          const sellPriceUsd = tx.price;
          const buyRate = buyLot.rate;
          const sellRate = tx.exchangeRate;
          
          // Stock P&L
          const stockPnLUsd = (sellPriceUsd - buyPriceUsd) * matchedShares;
          const stockPnLThb = stockPnLUsd * sellRate;
          
          // Currency P&L
          // The gain/loss from rate change on the original cost
          const costUsd = buyPriceUsd * matchedShares;
          const currencyPnLThb = costUsd * (sellRate - buyRate);
          
          // Total P&L
          const totalPnLThb = stockPnLThb + currencyPnLThb;
          
          realizedPnL.push({
            tradeId: `${tx.id}-${buyLot.date}`,
            symbol,
            sellDate: tx.date,
            shares: matchedShares,
            buyPriceUsd,
            sellPriceUsd,
            buyRate,
            sellRate,
            stockPnLUsd,
            stockPnLThb,
            currencyPnLThb,
            totalPnLThb,
          });
          
          // Update remaining shares
          remainingShares -= matchedShares;
          buyLot.shares -= matchedShares;
          
          // Remove exhausted buy lot
          if (buyLot.shares <= 0) {
            buyQueue.shift();
          }
        }
      }
    }
  }
  
  return realizedPnL;
}

/**
 * Calculate summary of realized currency P&L
 */
export function calculateRealizedCurrencyPnLSummary(
  realizedPnL: RealizedCurrencyPnL[]
): {
  totalStockPnLUsd: number;
  totalStockPnLThb: number;
  totalCurrencyPnLThb: number;
  totalPnLThb: number;
  tradeCount: number;
  bestCurrencyTrade: RealizedCurrencyPnL | null;
  worstCurrencyTrade: RealizedCurrencyPnL | null;
} {
  if (realizedPnL.length === 0) {
    return {
      totalStockPnLUsd: 0,
      totalStockPnLThb: 0,
      totalCurrencyPnLThb: 0,
      totalPnLThb: 0,
      tradeCount: 0,
      bestCurrencyTrade: null,
      worstCurrencyTrade: null,
    };
  }
  
  const totalStockPnLUsd = realizedPnL.reduce((sum, t) => sum + t.stockPnLUsd, 0);
  const totalStockPnLThb = realizedPnL.reduce((sum, t) => sum + t.stockPnLThb, 0);
  const totalCurrencyPnLThb = realizedPnL.reduce((sum, t) => sum + t.currencyPnLThb, 0);
  const totalPnLThb = realizedPnL.reduce((sum, t) => sum + t.totalPnLThb, 0);
  
  // Find best/worst currency timing
  const sortedByCurrency = [...realizedPnL].sort(
    (a, b) => b.currencyPnLThb - a.currencyPnLThb
  );
  
  return {
    totalStockPnLUsd,
    totalStockPnLThb,
    totalCurrencyPnLThb,
    totalPnLThb,
    tradeCount: realizedPnL.length,
    bestCurrencyTrade: sortedByCurrency[0] || null,
    worstCurrencyTrade: sortedByCurrency[sortedByCurrency.length - 1] || null,
  };
}

/**
 * Format currency value with symbol
 */
export function formatCurrencyValue(
  value: number,
  currency: 'USD' | 'THB',
  showSign: boolean = false
): string {
  const sign = showSign && value > 0 ? '+' : '';
  const symbol = currency === 'USD' ? '$' : '฿';
  const absValue = Math.abs(value);
  
  if (currency === 'THB') {
    return `${sign}${symbol}${absValue.toLocaleString('en-US', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    })}`;
  }
  
  return `${sign}${symbol}${absValue.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
}

/**
 * Calculate currency contribution percentage
 * Shows what portion of total P&L comes from currency vs stock
 */
export function calculateCurrencyContribution(
  stockPnLThb: number,
  currencyPnLThb: number
): { stockPercent: number; currencyPercent: number } {
  const totalAbs = Math.abs(stockPnLThb) + Math.abs(currencyPnLThb);
  
  if (totalAbs === 0) {
    return { stockPercent: 0, currencyPercent: 0 };
  }
  
  return {
    stockPercent: (Math.abs(stockPnLThb) / totalAbs) * 100,
    currencyPercent: (Math.abs(currencyPnLThb) / totalAbs) * 100,
  };
}
