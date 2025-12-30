import { describe, it, expect } from 'vitest';
import {
  calculateHoldingCurrencyPnL,
  calculatePortfolioCurrencyPnL,
  calculateRealizedCurrencyPnL,
  calculateRealizedCurrencyPnLSummary,
  formatCurrencyValue,
  calculateCurrencyContribution,
} from '../currency-pnl';
import type { Holding, Transaction, StockQuote } from '@/types';

describe('Currency P&L Calculations', () => {
  describe('calculateHoldingCurrencyPnL', () => {
    it('should calculate currency P&L correctly when rate increased', () => {
      const holding: Holding = {
        id: '1',
        portfolioId: 'p1',
        symbol: 'AAPL',
        companyName: 'Apple Inc',
        shares: 10,
        avgCost: 150,
        avgExchangeRate: 33.00, // Bought when rate was 33
        lots: [],
      };
      
      const currentPrice = 150; // Same price
      const currentRate = 35.00; // Rate increased to 35
      
      const result = calculateHoldingCurrencyPnL(holding, currentPrice, currentRate);
      
      // Cost: 10 * 150 = 1500 USD
      expect(result.costUsd).toBe(1500);
      // Cost in THB: 1500 * 33 = 49500
      expect(result.costThb).toBe(49500);
      
      // Value: 10 * 150 = 1500 USD
      expect(result.valueUsd).toBe(1500);
      // Value in THB: 1500 * 35 = 52500
      expect(result.valueThb).toBe(52500);
      
      // Stock P&L: 0 (price unchanged)
      expect(result.stockPnLUsd).toBe(0);
      expect(result.stockPnLThb).toBe(0);
      
      // Currency P&L: 1500 * (35 - 33) = 3000 THB gain
      expect(result.currencyPnLThb).toBe(3000);
      
      // Total P&L: 52500 - 49500 = 3000 THB
      expect(result.totalPnLThb).toBe(3000);
    });

    it('should calculate both stock and currency P&L', () => {
      const holding: Holding = {
        id: '1',
        portfolioId: 'p1',
        symbol: 'NVDA',
        companyName: 'NVIDIA Corp',
        shares: 5,
        avgCost: 100,
        avgExchangeRate: 34.00,
        lots: [],
      };
      
      const currentPrice = 120; // Price increased 20%
      const currentRate = 35.00; // Rate increased
      
      const result = calculateHoldingCurrencyPnL(holding, currentPrice, currentRate);
      
      // Stock P&L: (120 - 100) * 5 = 100 USD
      expect(result.stockPnLUsd).toBe(100);
      // Stock P&L in THB: 100 * 35 = 3500
      expect(result.stockPnLThb).toBe(3500);
      
      // Currency P&L: 500 * (35 - 34) = 500 THB
      expect(result.currencyPnLThb).toBe(500);
      
      // Total P&L: 3500 + 500 = 4000 THB
      expect(result.totalPnLThb).toBe(4000);
    });

    it('should handle currency loss when rate decreased', () => {
      const holding: Holding = {
        id: '1',
        portfolioId: 'p1',
        symbol: 'TSLA',
        companyName: 'Tesla Inc',
        shares: 2,
        avgCost: 200,
        avgExchangeRate: 36.00, // Bought when rate was high
        lots: [],
      };
      
      const currentPrice = 200; // Same price
      const currentRate = 34.00; // Rate decreased
      
      const result = calculateHoldingCurrencyPnL(holding, currentPrice, currentRate);
      
      // Currency P&L: 400 * (34 - 36) = -800 THB loss
      expect(result.currencyPnLThb).toBe(-800);
      expect(result.totalPnLThb).toBe(-800);
    });
  });

  describe('calculatePortfolioCurrencyPnL', () => {
    it('should aggregate currency P&L across holdings', () => {
      const holdings: Holding[] = [
        {
          id: '1',
          portfolioId: 'p1',
          symbol: 'AAPL',
          companyName: 'Apple Inc',
          shares: 10,
          avgCost: 150,
          avgExchangeRate: 33.00,
          lots: [],
        },
        {
          id: '2',
          portfolioId: 'p1',
          symbol: 'NVDA',
          companyName: 'NVIDIA Corp',
          shares: 5,
          avgCost: 100,
          avgExchangeRate: 34.00,
          lots: [],
        },
      ];
      
      const quotes: Record<string, StockQuote> = {
        AAPL: {
          symbol: 'AAPL',
          currentPrice: 160,
          change: 2,
          changePercent: 1.27,
          open: 158,
          high: 162,
          low: 157,
          previousClose: 158,
          volume: 1000000,
          lastUpdated: new Date().toISOString(),
        },
        NVDA: {
          symbol: 'NVDA',
          currentPrice: 110,
          change: 1,
          changePercent: 0.92,
          open: 109,
          high: 112,
          low: 108,
          previousClose: 109,
          volume: 500000,
          lastUpdated: new Date().toISOString(),
        },
      };
      
      const currentRate = 35.00;
      const result = calculatePortfolioCurrencyPnL(holdings, quotes, currentRate);
      
      // Total cost USD: 1500 + 500 = 2000
      expect(result.totalCostUsd).toBe(2000);
      
      // Total value USD: 1600 + 550 = 2150
      expect(result.totalValueUsd).toBe(2150);
      
      // Holdings array should have 2 items
      expect(result.holdings.length).toBe(2);
    });

    it('should filter out holdings with 0 shares', () => {
      const holdings: Holding[] = [
        {
          id: '1',
          portfolioId: 'p1',
          symbol: 'AAPL',
          companyName: 'Apple Inc',
          shares: 0, // Sold all
          avgCost: 150,
          avgExchangeRate: 33.00,
          lots: [],
        },
        {
          id: '2',
          portfolioId: 'p1',
          symbol: 'NVDA',
          companyName: 'NVIDIA Corp',
          shares: 5,
          avgCost: 100,
          avgExchangeRate: 34.00,
          lots: [],
        },
      ];
      
      const result = calculatePortfolioCurrencyPnL(holdings, {}, 35.00);
      
      expect(result.holdings.length).toBe(1);
      expect(result.holdings[0].symbol).toBe('NVDA');
    });
  });

  describe('calculateRealizedCurrencyPnL', () => {
    it('should calculate realized currency P&L from completed trades', () => {
      const transactions: Transaction[] = [
        {
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
          exchangeRate: 33.00, // Bought at 33
        },
        {
          id: '2',
          portfolioId: 'p1',
          symbol: 'AAPL',
          companyName: 'Apple Inc',
          type: 'SELL',
          shares: 10,
          price: 110,
          date: '2025-02-01',
          grossAmount: 1100,
          commission: 1.1,
          vat: 0.08,
          netAmount: 1098.82,
          exchangeRate: 35.00, // Sold at 35
        },
      ];
      
      const result = calculateRealizedCurrencyPnL(transactions);
      
      expect(result.length).toBe(1);
      
      const trade = result[0];
      expect(trade.symbol).toBe('AAPL');
      expect(trade.shares).toBe(10);
      
      // Stock P&L: (110 - 100) * 10 = 100 USD
      expect(trade.stockPnLUsd).toBe(100);
      
      // Currency P&L: 1000 * (35 - 33) = 2000 THB
      expect(trade.currencyPnLThb).toBe(2000);
    });

    it('should handle partial sells with FIFO', () => {
      const transactions: Transaction[] = [
        {
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
          exchangeRate: 33.00,
        },
        {
          id: '2',
          portfolioId: 'p1',
          symbol: 'AAPL',
          companyName: 'Apple Inc',
          type: 'SELL',
          shares: 5, // Partial sell
          price: 110,
          date: '2025-02-01',
          grossAmount: 550,
          commission: 0.55,
          vat: 0.04,
          netAmount: 549.41,
          exchangeRate: 35.00,
        },
      ];
      
      const result = calculateRealizedCurrencyPnL(transactions);
      
      expect(result.length).toBe(1);
      expect(result[0].shares).toBe(5);
      
      // Stock P&L: (110 - 100) * 5 = 50 USD
      expect(result[0].stockPnLUsd).toBe(50);
      
      // Currency P&L: 500 * (35 - 33) = 1000 THB
      expect(result[0].currencyPnLThb).toBe(1000);
    });
  });

  describe('calculateRealizedCurrencyPnLSummary', () => {
    it('should summarize realized currency P&L', () => {
      const realizedPnL = [
        {
          tradeId: '1',
          symbol: 'AAPL',
          sellDate: '2025-02-01',
          shares: 10,
          buyPriceUsd: 100,
          sellPriceUsd: 110,
          buyRate: 33,
          sellRate: 35,
          stockPnLUsd: 100,
          stockPnLThb: 3500,
          currencyPnLThb: 2000,
          totalPnLThb: 5500,
        },
        {
          tradeId: '2',
          symbol: 'NVDA',
          sellDate: '2025-02-15',
          shares: 5,
          buyPriceUsd: 100,
          sellPriceUsd: 90,
          buyRate: 34,
          sellRate: 35,
          stockPnLUsd: -50,
          stockPnLThb: -1750,
          currencyPnLThb: 500,
          totalPnLThb: -1250,
        },
      ];
      
      const summary = calculateRealizedCurrencyPnLSummary(realizedPnL);
      
      expect(summary.tradeCount).toBe(2);
      expect(summary.totalStockPnLUsd).toBe(50); // 100 - 50
      expect(summary.totalStockPnLThb).toBe(1750); // 3500 - 1750
      expect(summary.totalCurrencyPnLThb).toBe(2500); // 2000 + 500
      expect(summary.totalPnLThb).toBe(4250); // 5500 - 1250
    });

    it('should handle empty array', () => {
      const summary = calculateRealizedCurrencyPnLSummary([]);
      
      expect(summary.tradeCount).toBe(0);
      expect(summary.totalStockPnLUsd).toBe(0);
      expect(summary.totalCurrencyPnLThb).toBe(0);
      expect(summary.bestCurrencyTrade).toBeNull();
      expect(summary.worstCurrencyTrade).toBeNull();
    });
  });

  describe('formatCurrencyValue', () => {
    it('should format USD correctly', () => {
      expect(formatCurrencyValue(1234.56, 'USD')).toBe('$1,234.56');
      expect(formatCurrencyValue(-500, 'USD')).toBe('$500.00');
      expect(formatCurrencyValue(100, 'USD', true)).toBe('+$100.00');
    });

    it('should format THB correctly', () => {
      expect(formatCurrencyValue(50000, 'THB')).toBe('฿50,000');
      expect(formatCurrencyValue(-25000, 'THB')).toBe('฿25,000');
      expect(formatCurrencyValue(10000, 'THB', true)).toBe('+฿10,000');
    });
  });

  describe('calculateCurrencyContribution', () => {
    it('should calculate contribution percentages', () => {
      const result = calculateCurrencyContribution(3000, 1000);
      
      expect(result.stockPercent).toBe(75);
      expect(result.currencyPercent).toBe(25);
    });

    it('should handle negative values', () => {
      const result = calculateCurrencyContribution(-2000, 1000);
      
      expect(result.stockPercent).toBeCloseTo(66.67, 1);
      expect(result.currencyPercent).toBeCloseTo(33.33, 1);
    });

    it('should handle zero values', () => {
      const result = calculateCurrencyContribution(0, 0);
      
      expect(result.stockPercent).toBe(0);
      expect(result.currencyPercent).toBe(0);
    });
  });
});
