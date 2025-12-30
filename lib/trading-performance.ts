import type { Transaction, Holding, StockQuote } from '@/types';

/**
 * Represents a completed trade (matched buy and sell)
 */
export interface CompletedTrade {
  id: string;
  symbol: string;
  companyName: string;
  buyDate: string;
  sellDate: string;
  shares: number;
  buyPrice: number;
  sellPrice: number;
  buyCost: number;
  sellProceeds: number;
  realizedPnL: number;
  realizedPnLPercent: number;
  holdingDays: number;
  isWin: boolean;
}

/**
 * Represents an open position (not yet sold)
 */
export interface OpenPosition {
  symbol: string;
  companyName: string;
  shares: number;
  avgCost: number;
  totalCost: number;
  currentPrice: number;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  buyDates: string[];
}

/**
 * Extended performance statistics
 */
export interface ExtendedPerformanceStats {
  // Trade counts
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  
  // Win/Loss metrics
  winRate: number;
  lossRate: number;
  
  // P&L metrics
  totalProfit: number;
  totalLoss: number;
  netRealizedPnL: number;
  netUnrealizedPnL: number;
  totalPnL: number;
  
  // Average metrics
  avgGain: number;
  avgLoss: number;
  avgTradeReturn: number;
  avgHoldingDays: number;
  
  // Risk metrics
  profitFactor: number;
  riskRewardRatio: number;
  largestWin: number;
  largestLoss: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  
  // Expectancy
  expectancy: number;
  
  // Lists
  completedTrades: CompletedTrade[];
  openPositions: OpenPosition[];
}

/**
 * Calculate days between two dates
 */
function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

/**
 * Calculate comprehensive trading performance from transactions
 * Uses FIFO (First In, First Out) method for matching buys and sells
 */
export function calculateTradingPerformance(
  transactions: Transaction[],
  holdings: Holding[],
  quotes: Record<string, StockQuote>
): ExtendedPerformanceStats {
  // Group transactions by symbol
  const txBySymbol = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const existing = txBySymbol.get(tx.symbol) || [];
    existing.push(tx);
    txBySymbol.set(tx.symbol, existing);
  }

  const completedTrades: CompletedTrade[] = [];
  const openPositions: OpenPosition[] = [];

  // Process each symbol
  for (const [symbol, txs] of txBySymbol) {
    // Sort by date for FIFO
    const sortedTxs = [...txs].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const buys = sortedTxs.filter(t => t.type === 'BUY');
    const sells = sortedTxs.filter(t => t.type === 'SELL');

    // Track remaining shares in each buy lot
    const buyLots: Array<{
      tx: Transaction;
      remainingShares: number;
    }> = buys.map(tx => ({ tx, remainingShares: tx.shares }));

    let buyLotIndex = 0;

    // Match sells with buys using FIFO
    for (const sell of sells) {
      let sellSharesRemaining = sell.shares;

      while (sellSharesRemaining > 0 && buyLotIndex < buyLots.length) {
        const buyLot = buyLots[buyLotIndex];
        
        if (buyLot.remainingShares <= 0) {
          buyLotIndex++;
          continue;
        }

        const matchedShares = Math.min(sellSharesRemaining, buyLot.remainingShares);
        
        // Calculate P&L for this matched portion
        const buyCost = matchedShares * buyLot.tx.price;
        const sellProceeds = matchedShares * sell.price;
        const realizedPnL = sellProceeds - buyCost;
        const realizedPnLPercent = buyCost > 0 ? (realizedPnL / buyCost) * 100 : 0;
        const holdingDays = daysBetween(buyLot.tx.date, sell.date);

        completedTrades.push({
          id: generateId(),
          symbol,
          companyName: sell.companyName,
          buyDate: buyLot.tx.date,
          sellDate: sell.date,
          shares: matchedShares,
          buyPrice: buyLot.tx.price,
          sellPrice: sell.price,
          buyCost,
          sellProceeds,
          realizedPnL,
          realizedPnLPercent,
          holdingDays,
          isWin: realizedPnL > 0,
        });

        buyLot.remainingShares -= matchedShares;
        sellSharesRemaining -= matchedShares;

        if (buyLot.remainingShares <= 0) {
          buyLotIndex++;
        }
      }
    }

    // Calculate open positions from remaining buy lots
    const remainingLots = buyLots.filter(lot => lot.remainingShares > 0);
    if (remainingLots.length > 0) {
      const totalShares = remainingLots.reduce((sum, lot) => sum + lot.remainingShares, 0);
      const totalCost = remainingLots.reduce((sum, lot) => sum + lot.remainingShares * lot.tx.price, 0);
      const avgCost = totalCost / totalShares;
      const currentPrice = quotes[symbol]?.currentPrice || avgCost;
      const currentValue = totalShares * currentPrice;
      const unrealizedPnL = currentValue - totalCost;
      const unrealizedPnLPercent = totalCost > 0 ? (unrealizedPnL / totalCost) * 100 : 0;

      openPositions.push({
        symbol,
        companyName: remainingLots[0].tx.companyName,
        shares: totalShares,
        avgCost,
        totalCost,
        currentPrice,
        currentValue,
        unrealizedPnL,
        unrealizedPnLPercent,
        buyDates: remainingLots.map(lot => lot.tx.date),
      });
    }
  }

  // Calculate statistics from completed trades
  const winningTrades = completedTrades.filter(t => t.realizedPnL > 0);
  const losingTrades = completedTrades.filter(t => t.realizedPnL < 0);
  const breakEvenTrades = completedTrades.filter(t => t.realizedPnL === 0);

  const totalProfit = winningTrades.reduce((sum, t) => sum + t.realizedPnL, 0);
  const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.realizedPnL, 0));
  const netRealizedPnL = totalProfit - totalLoss;
  const netUnrealizedPnL = openPositions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
  const totalPnL = netRealizedPnL + netUnrealizedPnL;

  const totalTrades = completedTrades.length;
  const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
  const lossRate = totalTrades > 0 ? (losingTrades.length / totalTrades) * 100 : 0;

  const avgGain = winningTrades.length > 0 
    ? totalProfit / winningTrades.length 
    : 0;
  const avgLoss = losingTrades.length > 0 
    ? totalLoss / losingTrades.length 
    : 0;
  const avgTradeReturn = totalTrades > 0 
    ? netRealizedPnL / totalTrades 
    : 0;
  const avgHoldingDays = totalTrades > 0 
    ? completedTrades.reduce((sum, t) => sum + t.holdingDays, 0) / totalTrades 
    : 0;

  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : (totalProfit > 0 ? Infinity : 0);
  const riskRewardRatio = avgLoss > 0 ? avgGain / avgLoss : (avgGain > 0 ? Infinity : 0);

  const largestWin = winningTrades.length > 0 
    ? Math.max(...winningTrades.map(t => t.realizedPnL)) 
    : 0;
  const largestLoss = losingTrades.length > 0 
    ? Math.max(...losingTrades.map(t => Math.abs(t.realizedPnL))) 
    : 0;

  // Calculate consecutive wins/losses
  const sortedTrades = [...completedTrades].sort((a, b) => 
    new Date(a.sellDate).getTime() - new Date(b.sellDate).getTime()
  );
  
  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;
  let currentWinStreak = 0;
  let currentLossStreak = 0;

  for (const trade of sortedTrades) {
    if (trade.isWin) {
      currentWinStreak++;
      currentLossStreak = 0;
      maxConsecutiveWins = Math.max(maxConsecutiveWins, currentWinStreak);
    } else if (trade.realizedPnL < 0) {
      currentLossStreak++;
      currentWinStreak = 0;
      maxConsecutiveLosses = Math.max(maxConsecutiveLosses, currentLossStreak);
    } else {
      currentWinStreak = 0;
      currentLossStreak = 0;
    }
  }

  // Calculate expectancy: (Win Rate × Avg Win) - (Loss Rate × Avg Loss)
  const expectancy = (winRate / 100 * avgGain) - (lossRate / 100 * avgLoss);

  return {
    totalTrades,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    breakEvenTrades: breakEvenTrades.length,
    winRate,
    lossRate,
    totalProfit,
    totalLoss,
    netRealizedPnL,
    netUnrealizedPnL,
    totalPnL,
    avgGain,
    avgLoss,
    avgTradeReturn,
    avgHoldingDays,
    profitFactor,
    riskRewardRatio,
    largestWin,
    largestLoss,
    maxConsecutiveWins,
    maxConsecutiveLosses,
    expectancy,
    completedTrades: sortedTrades,
    openPositions,
  };
}

/**
 * Calculate monthly performance breakdown
 */
export function calculateMonthlyPerformance(
  completedTrades: CompletedTrade[]
): Record<string, { trades: number; pnl: number; winRate: number }> {
  const monthly: Record<string, { wins: number; losses: number; pnl: number }> = {};

  for (const trade of completedTrades) {
    const month = trade.sellDate.substring(0, 7); // YYYY-MM
    if (!monthly[month]) {
      monthly[month] = { wins: 0, losses: 0, pnl: 0 };
    }
    monthly[month].pnl += trade.realizedPnL;
    if (trade.isWin) {
      monthly[month].wins++;
    } else if (trade.realizedPnL < 0) {
      monthly[month].losses++;
    }
  }

  const result: Record<string, { trades: number; pnl: number; winRate: number }> = {};
  for (const [month, data] of Object.entries(monthly)) {
    const totalTrades = data.wins + data.losses;
    result[month] = {
      trades: totalTrades,
      pnl: data.pnl,
      winRate: totalTrades > 0 ? (data.wins / totalTrades) * 100 : 0,
    };
  }

  return result;
}

/**
 * Calculate performance by symbol
 */
export function calculateSymbolPerformance(
  completedTrades: CompletedTrade[]
): Record<string, { trades: number; pnl: number; winRate: number; avgReturn: number }> {
  const bySymbol: Record<string, { wins: number; losses: number; pnl: number; totalReturn: number }> = {};

  for (const trade of completedTrades) {
    if (!bySymbol[trade.symbol]) {
      bySymbol[trade.symbol] = { wins: 0, losses: 0, pnl: 0, totalReturn: 0 };
    }
    bySymbol[trade.symbol].pnl += trade.realizedPnL;
    bySymbol[trade.symbol].totalReturn += trade.realizedPnLPercent;
    if (trade.isWin) {
      bySymbol[trade.symbol].wins++;
    } else if (trade.realizedPnL < 0) {
      bySymbol[trade.symbol].losses++;
    }
  }

  const result: Record<string, { trades: number; pnl: number; winRate: number; avgReturn: number }> = {};
  for (const [symbol, data] of Object.entries(bySymbol)) {
    const totalTrades = data.wins + data.losses;
    result[symbol] = {
      trades: totalTrades,
      pnl: data.pnl,
      winRate: totalTrades > 0 ? (data.wins / totalTrades) * 100 : 0,
      avgReturn: totalTrades > 0 ? data.totalReturn / totalTrades : 0,
    };
  }

  return result;
}
