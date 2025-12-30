import type { Holding, Transaction, PerformanceStats, StockQuote } from '@/types';

/**
 * Calculate average cost for a holding with multiple lots
 */
export function calculateAvgCost(lots: { shares: number; price: number }[]): number {
  const totalShares = lots.reduce((sum, lot) => sum + lot.shares, 0);
  const totalCost = lots.reduce((sum, lot) => sum + lot.shares * lot.price, 0);
  return totalShares > 0 ? totalCost / totalShares : 0;
}

/**
 * Calculate P&L for a holding
 */
export function calculatePnL(
  shares: number,
  avgCost: number,
  currentPrice: number
): { pnl: number; pnlPercent: number } {
  const costBasis = shares * avgCost;
  const currentValue = shares * currentPrice;
  const pnl = currentValue - costBasis;
  const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
  return { pnl, pnlPercent };
}

/**
 * Calculate total portfolio value
 */
export function calculatePortfolioValue(
  holdings: Holding[],
  quotes: Record<string, StockQuote>
): { totalValue: number; totalCost: number; totalPnL: number; totalPnLPercent: number } {
  let totalValue = 0;
  let totalCost = 0;

  for (const holding of holdings) {
    const quote = quotes[holding.symbol];
    const currentPrice = quote?.currentPrice || holding.avgCost;
    
    totalValue += holding.shares * currentPrice;
    totalCost += holding.shares * holding.avgCost;
  }

  const totalPnL = totalValue - totalCost;
  const totalPnLPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;

  return { totalValue, totalCost, totalPnL, totalPnLPercent };
}

/**
 * Calculate daily change for portfolio
 */
export function calculateDailyChange(
  holdings: Holding[],
  quotes: Record<string, StockQuote>
): { change: number; changePercent: number } {
  let totalChange = 0;
  let totalPreviousValue = 0;

  for (const holding of holdings) {
    const quote = quotes[holding.symbol];
    if (quote) {
      totalChange += holding.shares * quote.change;
      totalPreviousValue += holding.shares * quote.previousClose;
    }
  }

  const changePercent = totalPreviousValue > 0 ? (totalChange / totalPreviousValue) * 100 : 0;

  return { change: totalChange, changePercent };
}

/**
 * Calculate performance statistics from closed trades
 */
export function calculatePerformanceStats(transactions: Transaction[]): PerformanceStats {
  // Group transactions by symbol to find closed positions
  const positionsBySymbol = new Map<string, Transaction[]>();
  
  for (const tx of transactions) {
    const existing = positionsBySymbol.get(tx.symbol) || [];
    existing.push(tx);
    positionsBySymbol.set(tx.symbol, existing);
  }

  let winningTrades = 0;
  let losingTrades = 0;
  let totalProfit = 0;
  let totalLoss = 0;
  let largestWin = 0;
  let largestLoss = 0;
  const gains: number[] = [];
  const losses: number[] = [];

  // Calculate P&L for each closed position
  for (const [, txs] of positionsBySymbol) {
    // Sort transactions by date for proper FIFO matching
    const sortedTxs = [...txs].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const buys = sortedTxs.filter(t => t.type === 'BUY');
    const sells = sortedTxs.filter(t => t.type === 'SELL');

    if (sells.length === 0 || buys.length === 0) continue;

    // Simple FIFO matching
    let buyIndex = 0;
    let remainingBuyShares = buys[buyIndex]?.shares || 0;
    let buyPrice = buys[buyIndex]?.price || 0;

    for (const sell of sells) {
      let sellShares = sell.shares;
      let pnl = 0;

      while (sellShares > 0 && buyIndex < buys.length) {
        const matchedShares = Math.min(sellShares, remainingBuyShares);
        pnl += matchedShares * (sell.price - buyPrice);
        
        sellShares -= matchedShares;
        remainingBuyShares -= matchedShares;

        if (remainingBuyShares <= 0) {
          buyIndex++;
          if (buyIndex < buys.length) {
            remainingBuyShares = buys[buyIndex].shares;
            buyPrice = buys[buyIndex].price;
          }
        }
      }

      if (pnl > 0) {
        winningTrades++;
        totalProfit += pnl;
        gains.push(pnl);
        if (pnl > largestWin) largestWin = pnl;
      } else if (pnl < 0) {
        losingTrades++;
        totalLoss += Math.abs(pnl);
        losses.push(Math.abs(pnl));
        if (Math.abs(pnl) > largestLoss) largestLoss = Math.abs(pnl);
      }
    }
  }

  const totalTrades = winningTrades + losingTrades;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
  const avgGain = gains.length > 0 ? gains.reduce((a, b) => a + b, 0) / gains.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;

  return {
    totalTrades,
    winningTrades,
    losingTrades,
    winRate,
    avgGain,
    avgLoss,
    profitFactor,
    largestWin,
    largestLoss,
    totalProfit,
    totalLoss,
    netPnL: totalProfit - totalLoss,
  };
}

/**
 * Convert USD to THB
 */
export function convertToTHB(usdAmount: number, rate: number): number {
  return usdAmount * rate;
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: 'USD' | 'THB' = 'USD'): string {
  const prefix = currency === 'USD' ? '$' : '฿';
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `-${prefix}${formatted}` : `${prefix}${formatted}`;
}

/**
 * Format percentage
 */
export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Format number with K/M/B suffix
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return num.toFixed(0);
}

/**
 * Format date for display
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Get top movers from holdings
 */
export function getTopMovers(
  holdings: Holding[],
  quotes: Record<string, StockQuote>,
  limit: number = 5
): { gainers: Holding[]; losers: Holding[] } {
  const withChange = holdings.map(h => ({
    holding: h,
    change: quotes[h.symbol]?.changePercent || 0,
  }));

  const sorted = withChange.sort((a, b) => b.change - a.change);
  
  const gainers = sorted.filter(h => h.change > 0).slice(0, limit).map(h => h.holding);
  const losers = sorted.filter(h => h.change < 0).slice(-limit).reverse().map(h => h.holding);

  return { gainers, losers };
}
