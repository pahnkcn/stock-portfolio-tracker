import { describe, it, expect } from 'vitest';
import {
  calculatePnL,
  formatCurrency,
  formatPercent,
  formatCompactNumber,
  calculatePortfolioValue,
  calculatePerformanceStats,
} from '../calculations';
import type { Holding, StockQuote, Transaction } from '@/types';

// Helper function to create holding with default avgExchangeRate
const createHolding = (data: Omit<Holding, 'avgExchangeRate'> & { avgExchangeRate?: number }): Holding => ({
  ...data,
  avgExchangeRate: data.avgExchangeRate ?? 34.50,
});

// Helper function to create transaction with default exchangeRate
const createTransaction = (data: Omit<Transaction, 'exchangeRate'> & { exchangeRate?: number }): Transaction => ({
  ...data,
  exchangeRate: data.exchangeRate ?? 34.50,
});

describe('Calculations', () => {
  describe('calculatePnL', () => {
    it('should calculate positive P&L correctly', () => {
      const result = calculatePnL(10, 100, 120);
      expect(result.pnl).toBe(200); // (120 - 100) * 10
      expect(result.pnlPercent).toBe(20); // 20%
    });

    it('should calculate negative P&L correctly', () => {
      const result = calculatePnL(10, 100, 80);
      expect(result.pnl).toBe(-200); // (80 - 100) * 10
      expect(result.pnlPercent).toBe(-20); // -20%
    });

    it('should handle zero shares', () => {
      const result = calculatePnL(0, 100, 120);
      expect(result.pnl).toBe(0);
      expect(result.pnlPercent).toBe(0);
    });

    it('should handle fractional shares', () => {
      const result = calculatePnL(0.5, 100, 150);
      expect(result.pnl).toBe(25); // (150 - 100) * 0.5
      expect(result.pnlPercent).toBe(50); // 50%
    });
  });

  describe('formatCurrency', () => {
    it('should format USD correctly', () => {
      const result = formatCurrency(1234.56, 'USD');
      expect(result).toContain('1,234.56');
      expect(result).toContain('$');
    });

    it('should format THB correctly', () => {
      const result = formatCurrency(1234.56, 'THB');
      expect(result).toContain('1,234.56');
      expect(result).toContain('฿');
    });

    it('should handle negative values', () => {
      const result = formatCurrency(-500, 'USD');
      expect(result).toContain('500');
      expect(result).toContain('-');
    });
  });

  describe('formatPercent', () => {
    it('should format positive percent with + sign', () => {
      const result = formatPercent(15.5);
      expect(result).toBe('+15.50%');
    });

    it('should format negative percent', () => {
      const result = formatPercent(-10.25);
      expect(result).toBe('-10.25%');
    });

    it('should format zero percent', () => {
      const result = formatPercent(0);
      expect(result).toBe('+0.00%');
    });
  });

  describe('formatCompactNumber', () => {
    it('should format millions', () => {
      const result = formatCompactNumber(1500000);
      expect(result).toBe('1.5M');
    });

    it('should format thousands', () => {
      const result = formatCompactNumber(1500);
      expect(result).toBe('1.5K');
    });

    it('should not compact small numbers', () => {
      const result = formatCompactNumber(500);
      expect(result).toBe('500');
    });
  });

  describe('calculatePortfolioValue', () => {
    const holdings: Holding[] = [
      createHolding({
        id: '1',
        portfolioId: 'p1',
        symbol: 'AAPL',
        companyName: 'Apple Inc',
        shares: 10,
        avgCost: 150,
        lots: [],
      }),
      createHolding({
        id: '2',
        portfolioId: 'p1',
        symbol: 'NVDA',
        companyName: 'NVIDIA Corp',
        shares: 5,
        avgCost: 100,
        lots: [],
      }),
    ];

    const quotes: Record<string, StockQuote> = {
      AAPL: {
        symbol: 'AAPL',
        currentPrice: 180,
        change: 5,
        changePercent: 2.86,
        open: 175,
        high: 182,
        low: 174,
        previousClose: 175,
        volume: 1000000,
        lastUpdated: new Date().toISOString(),
      },
      NVDA: {
        symbol: 'NVDA',
        currentPrice: 120,
        change: -2,
        changePercent: -1.64,
        open: 122,
        high: 125,
        low: 118,
        previousClose: 122,
        volume: 500000,
        lastUpdated: new Date().toISOString(),
      },
    };

    it('should calculate total portfolio value', () => {
      const result = calculatePortfolioValue(holdings, quotes);
      // AAPL: 10 * 180 = 1800, NVDA: 5 * 120 = 600, Total = 2400
      expect(result.totalValue).toBe(2400);
    });

    it('should calculate total cost', () => {
      const result = calculatePortfolioValue(holdings, quotes);
      // AAPL: 10 * 150 = 1500, NVDA: 5 * 100 = 500, Total = 2000
      expect(result.totalCost).toBe(2000);
    });

    it('should calculate total P&L', () => {
      const result = calculatePortfolioValue(holdings, quotes);
      // Total Value - Total Cost = 2400 - 2000 = 400
      expect(result.totalPnL).toBe(400);
    });

    it('should calculate P&L percent', () => {
      const result = calculatePortfolioValue(holdings, quotes);
      // (400 / 2000) * 100 = 20%
      expect(result.totalPnLPercent).toBe(20);
    });

    it('should handle empty holdings', () => {
      const result = calculatePortfolioValue([], quotes);
      expect(result.totalValue).toBe(0);
      expect(result.totalCost).toBe(0);
      expect(result.totalPnL).toBe(0);
      expect(result.totalPnLPercent).toBe(0);
    });

    it('should use avgCost when quote is not available', () => {
      const result = calculatePortfolioValue(holdings, {});
      // Uses avgCost for both: AAPL: 10 * 150 = 1500, NVDA: 5 * 100 = 500
      expect(result.totalValue).toBe(2000);
      expect(result.totalPnL).toBe(0);
    });
  });

  describe('calculatePerformanceStats', () => {
    const transactions: Transaction[] = [
      createTransaction({
        id: '1',
        portfolioId: 'p1',
        symbol: 'AAPL',
        companyName: 'Apple Inc',
        type: 'BUY',
        shares: 10,
        price: 100,
        date: '2025-01-01',
        grossAmount: 1000,
        commission: 1,
        vat: 0.07,
        netAmount: 1001.07,
      }),
      createTransaction({
        id: '2',
        portfolioId: 'p1',
        symbol: 'AAPL',
        companyName: 'Apple Inc',
        type: 'SELL',
        shares: 10,
        price: 120,
        date: '2025-02-01',
        grossAmount: 1200,
        commission: 1.2,
        vat: 0.08,
        netAmount: 1198.72,
      }),
    ];

    it('should calculate win rate', () => {
      const result = calculatePerformanceStats(transactions);
      // 1 winning trade out of 1 sell = 100%
      expect(result.winRate).toBe(100);
    });

    it('should count winning and losing trades', () => {
      const result = calculatePerformanceStats(transactions);
      expect(result.winningTrades).toBe(1);
      expect(result.losingTrades).toBe(0);
    });

    it('should handle empty transactions', () => {
      const result = calculatePerformanceStats([]);
      expect(result.winRate).toBe(0);
      expect(result.winningTrades).toBe(0);
      expect(result.losingTrades).toBe(0);
    });
  });
});
