import { describe, it, expect, beforeEach } from 'vitest';
import type { Transaction, Holding, TransactionType } from '../types';

// Mock transaction data
const createMockTransaction = (
  id: string,
  symbol: string,
  type: TransactionType,
  shares: number,
  price: number,
  exchangeRate: number = 35
): Transaction => ({
  id,
  portfolioId: 'portfolio-1',
  symbol,
  companyName: `${symbol} Inc.`,
  type,
  shares,
  price,
  date: new Date().toISOString(),
  commission: 0,
  vat: 0,
  netAmount: shares * price,
  grossAmount: shares * price,
  exchangeRate,
});

// Helper functions to simulate storage operations
const updateTransaction = (
  transactions: Transaction[],
  id: string,
  updates: Partial<Transaction>
): Transaction[] => {
  return transactions.map(t => (t.id === id ? { ...t, ...updates } : t));
};

const deleteTransaction = (transactions: Transaction[], id: string): Transaction[] => {
  return transactions.filter(t => t.id !== id);
};

// Helper to recalculate holdings from transactions using FIFO method
const recalculateHolding = (
  transactions: Transaction[],
  symbol: string,
  portfolioId: string
): { shares: number; avgCost: number; avgExchangeRate: number } => {
  const symbolTxs = transactions.filter(
    t => t.symbol === symbol && t.portfolioId === portfolioId
  );

  // Sort transactions by date for FIFO calculation
  const sortedTxs = [...symbolTxs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Separate BUY and SELL transactions
  const buys = sortedTxs.filter(t => t.type === 'BUY');
  const sells = sortedTxs.filter(t => t.type === 'SELL');

  // Create buy lots with remaining shares (for FIFO matching)
  const buyLots = buys.map(tx => ({
    shares: tx.shares,
    price: tx.price,
    exchangeRate: tx.exchangeRate || 35,
    remainingShares: tx.shares,
  }));

  // Apply FIFO: match sells against buys
  let buyLotIndex = 0;
  for (const sell of sells) {
    let sellSharesRemaining = sell.shares;

    while (sellSharesRemaining > 0 && buyLotIndex < buyLots.length) {
      const buyLot = buyLots[buyLotIndex];

      if (buyLot.remainingShares <= 0) {
        buyLotIndex++;
        continue;
      }

      const matchedShares = Math.min(sellSharesRemaining, buyLot.remainingShares);
      buyLot.remainingShares -= matchedShares;
      sellSharesRemaining -= matchedShares;

      if (buyLot.remainingShares <= 0) {
        buyLotIndex++;
      }
    }
  }

  // Calculate from remaining buy lots only
  const remainingLots = buyLots.filter(lot => lot.remainingShares > 0);
  const totalShares = remainingLots.reduce((sum, lot) => sum + lot.remainingShares, 0);
  const totalCost = remainingLots.reduce((sum, lot) => sum + lot.remainingShares * lot.price, 0);
  const totalCostThb = remainingLots.reduce(
    (sum, lot) => sum + lot.remainingShares * lot.price * lot.exchangeRate,
    0
  );

  if (totalShares <= 0) {
    return { shares: 0, avgCost: 0, avgExchangeRate: 35 };
  }

  return {
    shares: totalShares,
    avgCost: totalCost / totalShares,
    avgExchangeRate: totalCost > 0 ? totalCostThb / totalCost : 35,
  };
};

describe('Transaction Edit/Delete Operations', () => {
  let transactions: Transaction[];

  beforeEach(() => {
    transactions = [
      createMockTransaction('tx-1', 'AAPL', 'BUY', 10, 150, 35),
      createMockTransaction('tx-2', 'AAPL', 'BUY', 5, 160, 36),
      createMockTransaction('tx-3', 'GOOGL', 'BUY', 20, 100, 35),
      createMockTransaction('tx-4', 'AAPL', 'SELL', 3, 170, 37),
    ];
  });

  describe('updateTransaction', () => {
    it('should update transaction shares', () => {
      const updated = updateTransaction(transactions, 'tx-1', { shares: 15 });
      const tx = updated.find(t => t.id === 'tx-1');
      expect(tx?.shares).toBe(15);
    });

    it('should update transaction price', () => {
      const updated = updateTransaction(transactions, 'tx-1', { price: 155 });
      const tx = updated.find(t => t.id === 'tx-1');
      expect(tx?.price).toBe(155);
    });

    it('should update transaction type', () => {
      const updated = updateTransaction(transactions, 'tx-1', { type: 'SELL' });
      const tx = updated.find(t => t.id === 'tx-1');
      expect(tx?.type).toBe('SELL');
    });

    it('should update exchange rate', () => {
      const updated = updateTransaction(transactions, 'tx-1', { exchangeRate: 38 });
      const tx = updated.find(t => t.id === 'tx-1');
      expect(tx?.exchangeRate).toBe(38);
    });

    it('should update multiple fields at once', () => {
      const updated = updateTransaction(transactions, 'tx-1', {
        shares: 20,
        price: 145,
        exchangeRate: 36,
      });
      const tx = updated.find(t => t.id === 'tx-1');
      expect(tx?.shares).toBe(20);
      expect(tx?.price).toBe(145);
      expect(tx?.exchangeRate).toBe(36);
    });

    it('should not modify other transactions', () => {
      const updated = updateTransaction(transactions, 'tx-1', { shares: 15 });
      const tx2 = updated.find(t => t.id === 'tx-2');
      const tx3 = updated.find(t => t.id === 'tx-3');
      expect(tx2?.shares).toBe(5);
      expect(tx3?.shares).toBe(20);
    });

    it('should handle non-existent transaction id', () => {
      const updated = updateTransaction(transactions, 'non-existent', { shares: 15 });
      expect(updated).toEqual(transactions);
    });
  });

  describe('deleteTransaction', () => {
    it('should remove transaction from list', () => {
      const result = deleteTransaction(transactions, 'tx-1');
      expect(result.length).toBe(3);
      expect(result.find(t => t.id === 'tx-1')).toBeUndefined();
    });

    it('should keep other transactions intact', () => {
      const result = deleteTransaction(transactions, 'tx-1');
      expect(result.find(t => t.id === 'tx-2')).toBeDefined();
      expect(result.find(t => t.id === 'tx-3')).toBeDefined();
      expect(result.find(t => t.id === 'tx-4')).toBeDefined();
    });

    it('should handle non-existent transaction id', () => {
      const result = deleteTransaction(transactions, 'non-existent');
      expect(result.length).toBe(4);
    });

    it('should handle deleting from empty list', () => {
      const result = deleteTransaction([], 'tx-1');
      expect(result.length).toBe(0);
    });
  });

  describe('recalculateHolding after edit', () => {
    it('should recalculate shares after editing buy transaction', () => {
      // Original: 10 + 5 - 3 = 12 shares
      const holding = recalculateHolding(transactions, 'AAPL', 'portfolio-1');
      expect(holding.shares).toBe(12);

      // Edit tx-1 to have 20 shares instead of 10
      const updated = updateTransaction(transactions, 'tx-1', { shares: 20 });
      const newHolding = recalculateHolding(updated, 'AAPL', 'portfolio-1');
      // New: 20 + 5 - 3 = 22 shares
      expect(newHolding.shares).toBe(22);
    });

    it('should recalculate avgCost after editing price', () => {
      // Edit tx-1 price from 150 to 200
      const updated = updateTransaction(transactions, 'tx-1', { price: 200 });
      const holding = recalculateHolding(updated, 'AAPL', 'portfolio-1');
      // FIFO: SELL 3 shares comes from tx-1 (oldest BUY at $200)
      // Remaining: tx-1: 10-3=7 shares @ $200, tx-2: 5 shares @ $160
      // Total cost: (7 * 200) + (5 * 160) = 1400 + 800 = 2200
      // Total shares: 7 + 5 = 12
      // Avg cost: 2200 / 12 = 183.33
      expect(holding.avgCost).toBeCloseTo(183.33, 1);
    });

    it('should recalculate avgExchangeRate after editing', () => {
      // Edit tx-1 exchange rate from 35 to 40
      const updated = updateTransaction(transactions, 'tx-1', { exchangeRate: 40 });
      const holding = recalculateHolding(updated, 'AAPL', 'portfolio-1');
      // FIFO: SELL 3 shares comes from tx-1 (oldest BUY)
      // Remaining: tx-1: 7 shares @ $150, rate 40; tx-2: 5 shares @ $160, rate 36
      // Total cost: (7 * 150) + (5 * 160) = 1050 + 800 = 1850
      // Total cost THB: (7 * 150 * 40) + (5 * 160 * 36) = 42000 + 28800 = 70800
      // Avg rate: 70800 / 1850 = 38.27
      expect(holding.avgExchangeRate).toBeCloseTo(38.27, 1);
    });
  });

  describe('recalculateHolding after delete', () => {
    it('should recalculate shares after deleting buy transaction', () => {
      // Original: 10 + 5 - 3 = 12 shares
      const holding = recalculateHolding(transactions, 'AAPL', 'portfolio-1');
      expect(holding.shares).toBe(12);

      // Delete tx-1 (10 shares buy)
      const result = deleteTransaction(transactions, 'tx-1');
      const newHolding = recalculateHolding(result, 'AAPL', 'portfolio-1');
      // New: 5 - 3 = 2 shares
      expect(newHolding.shares).toBe(2);
    });

    it('should recalculate avgCost after deleting transaction', () => {
      // Delete tx-1
      const result = deleteTransaction(transactions, 'tx-1');
      const holding = recalculateHolding(result, 'AAPL', 'portfolio-1');
      // tx-2 buy: 5 shares at $160, tx-4 sell: 3 shares
      // FIFO: SELL 3 shares comes from tx-2 (now the oldest BUY)
      // Remaining: tx-2: 5-3=2 shares @ $160
      // Avg cost: 160 (only one lot left)
      expect(holding.avgCost).toBe(160);
    });

    it('should return zero shares when all buys deleted', () => {
      // Delete all AAPL buy transactions
      let result = deleteTransaction(transactions, 'tx-1');
      result = deleteTransaction(result, 'tx-2');
      const holding = recalculateHolding(result, 'AAPL', 'portfolio-1');
      // Only sell remains, so shares should be negative, but we cap at 0
      expect(holding.shares).toBe(0);
    });

    it('should not affect other symbols when deleting', () => {
      const result = deleteTransaction(transactions, 'tx-1');
      const googlHolding = recalculateHolding(result, 'GOOGL', 'portfolio-1');
      expect(googlHolding.shares).toBe(20);
      expect(googlHolding.avgCost).toBe(100);
    });
  });

  describe('Edge cases', () => {
    it('should handle changing transaction type from BUY to SELL', () => {
      // Original AAPL: 10 + 5 - 3 = 12 shares
      const holding = recalculateHolding(transactions, 'AAPL', 'portfolio-1');
      expect(holding.shares).toBe(12);

      // Change tx-1 from BUY to SELL
      const updated = updateTransaction(transactions, 'tx-1', { type: 'SELL' });
      const newHolding = recalculateHolding(updated, 'AAPL', 'portfolio-1');
      // New: 5 - 10 - 3 = -8 (capped at 0)
      expect(newHolding.shares).toBe(0);
    });

    it('should handle changing symbol of transaction', () => {
      // Change tx-1 from AAPL to MSFT
      const updated = updateTransaction(transactions, 'tx-1', { symbol: 'MSFT' });

      const aaplHolding = recalculateHolding(updated, 'AAPL', 'portfolio-1');
      // AAPL: 5 - 3 = 2 shares
      expect(aaplHolding.shares).toBe(2);

      const msftHolding = recalculateHolding(updated, 'MSFT', 'portfolio-1');
      // MSFT: 10 shares
      expect(msftHolding.shares).toBe(10);
    });

    it('should handle decimal shares', () => {
      const txWithDecimal = createMockTransaction('tx-dec', 'TSLA', 'BUY', 2.5, 200, 35);
      const result = [...transactions, txWithDecimal];
      const holding = recalculateHolding(result, 'TSLA', 'portfolio-1');
      expect(holding.shares).toBe(2.5);
    });

    it('should handle zero price transaction', () => {
      const updated = updateTransaction(transactions, 'tx-1', { price: 0 });
      const holding = recalculateHolding(updated, 'AAPL', 'portfolio-1');
      // FIFO: SELL 3 shares comes from tx-1 (oldest BUY at $0)
      // Remaining: tx-1: 7 shares @ $0, tx-2: 5 shares @ $160
      // Total cost: (7 * 0) + (5 * 160) = 800
      // Total shares: 12
      // Avg cost: 800 / 12 = 66.67
      expect(holding.avgCost).toBeCloseTo(66.67, 1);
    });
  });
});

describe('Transaction validation', () => {
  it('should validate required fields', () => {
    const isValidTransaction = (tx: Partial<Transaction>): boolean => {
      return !!(
        tx.symbol &&
        tx.symbol.trim() !== '' &&
        tx.shares &&
        tx.shares > 0 &&
        tx.price !== undefined &&
        tx.price >= 0
      );
    };

    expect(isValidTransaction({ symbol: 'AAPL', shares: 10, price: 150 })).toBe(true);
    expect(isValidTransaction({ symbol: '', shares: 10, price: 150 })).toBe(false);
    expect(isValidTransaction({ symbol: 'AAPL', shares: 0, price: 150 })).toBe(false);
    expect(isValidTransaction({ symbol: 'AAPL', shares: -5, price: 150 })).toBe(false);
    expect(isValidTransaction({ symbol: 'AAPL', shares: 10, price: -10 })).toBe(false);
    expect(isValidTransaction({ symbol: 'AAPL', shares: 10, price: 0 })).toBe(true); // Zero price is valid
  });
});
