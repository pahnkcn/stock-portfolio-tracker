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

// Helper to recalculate holdings from transactions
const recalculateHolding = (
  transactions: Transaction[],
  symbol: string,
  portfolioId: string
): { shares: number; avgCost: number; avgExchangeRate: number } => {
  const symbolTxs = transactions.filter(
    t => t.symbol === symbol && t.portfolioId === portfolioId
  );

  let totalShares = 0;
  let totalCost = 0;
  let totalExchangeRateCost = 0;

  symbolTxs.forEach(t => {
    if (t.type === 'BUY') {
      totalShares += t.shares;
      totalCost += t.shares * t.price;
      totalExchangeRateCost += t.shares * (t.exchangeRate || 35);
    } else {
      totalShares -= t.shares;
    }
  });

  if (totalShares <= 0) {
    return { shares: 0, avgCost: 0, avgExchangeRate: 35 };
  }

  return {
    shares: totalShares,
    avgCost: totalCost / totalShares,
    avgExchangeRate: totalExchangeRateCost / totalShares,
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
      // Total cost: (10 * 200) + (5 * 160) = 2000 + 800 = 2800
      // Total buy shares: 10 + 5 = 15, but remaining shares = 15 - 3 = 12
      // Avg cost is based on buy shares: 2800 / 12 = 233.33
      expect(holding.avgCost).toBeCloseTo(233.33, 1);
    });

    it('should recalculate avgExchangeRate after editing', () => {
      // Edit tx-1 exchange rate from 35 to 40
      const updated = updateTransaction(transactions, 'tx-1', { exchangeRate: 40 });
      const holding = recalculateHolding(updated, 'AAPL', 'portfolio-1');
      // Total rate cost: (10 * 40) + (5 * 36) = 400 + 180 = 580
      // Remaining shares: 12
      // Avg rate: 580 / 12 = 48.33
      expect(holding.avgExchangeRate).toBeCloseTo(48.33, 1);
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
      // Remaining: 5 - 3 = 2 shares
      // Total cost: 5 * 160 = 800
      // Avg cost: 800 / 2 = 400
      expect(holding.avgCost).toBe(400);
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
      // Total cost: (10 * 0) + (5 * 160) = 800
      // Remaining shares: 12
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
