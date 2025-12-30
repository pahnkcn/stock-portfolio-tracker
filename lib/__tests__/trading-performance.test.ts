import { describe, it, expect } from 'vitest';
import {
  calculateTradingPerformance,
  calculateMonthlyPerformance,
  calculateSymbolPerformance,
} from '../trading-performance';
import type { Transaction, Holding, StockQuote } from '@/types';

// Helper function to create transaction with default exchangeRate
const createTransaction = (data: Omit<Transaction, 'exchangeRate'> & { exchangeRate?: number }): Transaction => ({
  ...data,
  exchangeRate: data.exchangeRate ?? 34.50,
});

describe('Trading Performance', () => {
  describe('calculateTradingPerformance', () => {
    it('should return empty stats when no transactions', () => {
      const result = calculateTradingPerformance([], [], {});
      
      expect(result.totalTrades).toBe(0);
      expect(result.winningTrades).toBe(0);
      expect(result.losingTrades).toBe(0);
      expect(result.winRate).toBe(0);
      expect(result.netRealizedPnL).toBe(0);
    });

    it('should calculate winning trade correctly', () => {
      const transactions: Transaction[] = [
        createTransaction({
          id: '1',
          portfolioId: 'p1',
          symbol: 'AAPL',
          companyName: 'Apple Inc.',
          type: 'BUY',
          shares: 10,
          price: 100,
          date: '2024-01-01',
          grossAmount: 1000,
          commission: 0,
          vat: 0,
          netAmount: 1000,
        }),
        createTransaction({
          id: '2',
          portfolioId: 'p1',
          symbol: 'AAPL',
          companyName: 'Apple Inc.',
          type: 'SELL',
          shares: 10,
          price: 120,
          date: '2024-02-01',
          grossAmount: 1200,
          commission: 0,
          vat: 0,
          netAmount: 1200,
        }),
      ];

      const result = calculateTradingPerformance(transactions, [], {});

      expect(result.totalTrades).toBe(1);
      expect(result.winningTrades).toBe(1);
      expect(result.losingTrades).toBe(0);
      expect(result.winRate).toBe(100);
      expect(result.netRealizedPnL).toBe(200); // (120 - 100) * 10
      expect(result.totalProfit).toBe(200);
      expect(result.totalLoss).toBe(0);
    });

    it('should calculate losing trade correctly', () => {
      const transactions: Transaction[] = [
        createTransaction({
          id: '1',
          portfolioId: 'p1',
          symbol: 'NVDA',
          companyName: 'NVIDIA',
          type: 'BUY',
          shares: 5,
          price: 200,
          date: '2024-01-01',
          grossAmount: 1000,
          commission: 0,
          vat: 0,
          netAmount: 1000,
        }),
        createTransaction({
          id: '2',
          portfolioId: 'p1',
          symbol: 'NVDA',
          companyName: 'NVIDIA',
          type: 'SELL',
          shares: 5,
          price: 150,
          date: '2024-02-01',
          grossAmount: 750,
          commission: 0,
          vat: 0,
          netAmount: 750,
        }),
      ];

      const result = calculateTradingPerformance(transactions, [], {});

      expect(result.totalTrades).toBe(1);
      expect(result.winningTrades).toBe(0);
      expect(result.losingTrades).toBe(1);
      expect(result.winRate).toBe(0);
      expect(result.netRealizedPnL).toBe(-250); // (150 - 200) * 5
      expect(result.totalProfit).toBe(0);
      expect(result.totalLoss).toBe(250);
    });

    it('should calculate multiple trades with FIFO matching', () => {
      const transactions: Transaction[] = [
        // First buy
        createTransaction({
          id: '1',
          portfolioId: 'p1',
          symbol: 'AAPL',
          companyName: 'Apple Inc.',
          type: 'BUY',
          shares: 10,
          price: 100,
          date: '2024-01-01',
          grossAmount: 1000,
          commission: 0,
          vat: 0,
          netAmount: 1000,
        }),
        // Second buy at higher price
        createTransaction({
          id: '2',
          portfolioId: 'p1',
          symbol: 'AAPL',
          companyName: 'Apple Inc.',
          type: 'BUY',
          shares: 10,
          price: 120,
          date: '2024-01-15',
          grossAmount: 1200,
          commission: 0,
          vat: 0,
          netAmount: 1200,
        }),
        // Sell all at 130 (FIFO: first lot at 100, second at 120)
        createTransaction({
          id: '3',
          portfolioId: 'p1',
          symbol: 'AAPL',
          companyName: 'Apple Inc.',
          type: 'SELL',
          shares: 20,
          price: 130,
          date: '2024-02-01',
          grossAmount: 2600,
          commission: 0,
          vat: 0,
          netAmount: 2600,
        }),
      ];

      const result = calculateTradingPerformance(transactions, [], {});

      // Should match: 10 shares (buy@100, sell@130) = +300
      //              10 shares (buy@120, sell@130) = +100
      // Total = +400
      expect(result.totalTrades).toBe(2);
      expect(result.winningTrades).toBe(2);
      expect(result.netRealizedPnL).toBe(400);
    });

    it('should calculate open positions with unrealized P&L', () => {
      const transactions: Transaction[] = [
        createTransaction({
          id: '1',
          portfolioId: 'p1',
          symbol: 'MSFT',
          companyName: 'Microsoft',
          type: 'BUY',
          shares: 10,
          price: 300,
          date: '2024-01-01',
          grossAmount: 3000,
          commission: 0,
          vat: 0,
          netAmount: 3000,
        }),
      ];

      const quotes: Record<string, StockQuote> = {
        MSFT: {
          symbol: 'MSFT',
          currentPrice: 350,
          change: 5,
          changePercent: 1.45,
          high: 355,
          low: 345,
          open: 348,
          previousClose: 345,
          volume: 1000000,
          lastUpdated: new Date().toISOString(),
        },
      };

      const result = calculateTradingPerformance(transactions, [], quotes);

      expect(result.totalTrades).toBe(0);
      expect(result.openPositions.length).toBe(1);
      expect(result.openPositions[0].symbol).toBe('MSFT');
      expect(result.openPositions[0].shares).toBe(10);
      expect(result.openPositions[0].unrealizedPnL).toBe(500); // (350 - 300) * 10
      expect(result.netUnrealizedPnL).toBe(500);
    });

    it('should calculate profit factor correctly', () => {
      const transactions: Transaction[] = [
        // Winning trade: +200
        createTransaction({
          id: '1',
          portfolioId: 'p1',
          symbol: 'AAPL',
          companyName: 'Apple',
          type: 'BUY',
          shares: 10,
          price: 100,
          date: '2024-01-01',
          grossAmount: 1000,
          commission: 0,
          vat: 0,
          netAmount: 1000,
        }),
        createTransaction({
          id: '2',
          portfolioId: 'p1',
          symbol: 'AAPL',
          companyName: 'Apple',
          type: 'SELL',
          shares: 10,
          price: 120,
          date: '2024-01-15',
          grossAmount: 1200,
          commission: 0,
          vat: 0,
          netAmount: 1200,
        }),
        // Losing trade: -100
        createTransaction({
          id: '3',
          portfolioId: 'p1',
          symbol: 'NVDA',
          companyName: 'NVIDIA',
          type: 'BUY',
          shares: 10,
          price: 100,
          date: '2024-02-01',
          grossAmount: 1000,
          commission: 0,
          vat: 0,
          netAmount: 1000,
        }),
        createTransaction({
          id: '4',
          portfolioId: 'p1',
          symbol: 'NVDA',
          companyName: 'NVIDIA',
          type: 'SELL',
          shares: 10,
          price: 90,
          date: '2024-02-15',
          grossAmount: 900,
          commission: 0,
          vat: 0,
          netAmount: 900,
        }),
      ];

      const result = calculateTradingPerformance(transactions, [], {});

      expect(result.totalTrades).toBe(2);
      expect(result.winningTrades).toBe(1);
      expect(result.losingTrades).toBe(1);
      expect(result.winRate).toBe(50);
      expect(result.totalProfit).toBe(200);
      expect(result.totalLoss).toBe(100);
      expect(result.profitFactor).toBe(2); // 200 / 100
      expect(result.netRealizedPnL).toBe(100); // 200 - 100
    });

    it('should calculate holding days correctly', () => {
      const transactions: Transaction[] = [
        createTransaction({
          id: '1',
          portfolioId: 'p1',
          symbol: 'AAPL',
          companyName: 'Apple',
          type: 'BUY',
          shares: 10,
          price: 100,
          date: '2024-01-01',
          grossAmount: 1000,
          commission: 0,
          vat: 0,
          netAmount: 1000,
        }),
        createTransaction({
          id: '2',
          portfolioId: 'p1',
          symbol: 'AAPL',
          companyName: 'Apple',
          type: 'SELL',
          shares: 10,
          price: 110,
          date: '2024-01-31',
          grossAmount: 1100,
          commission: 0,
          vat: 0,
          netAmount: 1100,
        }),
      ];

      const result = calculateTradingPerformance(transactions, [], {});

      expect(result.completedTrades[0].holdingDays).toBe(30);
      expect(result.avgHoldingDays).toBe(30);
    });

    it('should calculate consecutive wins and losses', () => {
      const transactions: Transaction[] = [
        // Win 1
        createTransaction({ id: '1', portfolioId: 'p1', symbol: 'A', companyName: 'A', type: 'BUY', shares: 1, price: 100, date: '2024-01-01', grossAmount: 100, commission: 0, vat: 0, netAmount: 100 }),
        createTransaction({ id: '2', portfolioId: 'p1', symbol: 'A', companyName: 'A', type: 'SELL', shares: 1, price: 110, date: '2024-01-02', grossAmount: 110, commission: 0, vat: 0, netAmount: 110 }),
        // Win 2
        createTransaction({ id: '3', portfolioId: 'p1', symbol: 'B', companyName: 'B', type: 'BUY', shares: 1, price: 100, date: '2024-01-03', grossAmount: 100, commission: 0, vat: 0, netAmount: 100 }),
        createTransaction({ id: '4', portfolioId: 'p1', symbol: 'B', companyName: 'B', type: 'SELL', shares: 1, price: 120, date: '2024-01-04', grossAmount: 120, commission: 0, vat: 0, netAmount: 120 }),
        // Win 3
        createTransaction({ id: '5', portfolioId: 'p1', symbol: 'C', companyName: 'C', type: 'BUY', shares: 1, price: 100, date: '2024-01-05', grossAmount: 100, commission: 0, vat: 0, netAmount: 100 }),
        createTransaction({ id: '6', portfolioId: 'p1', symbol: 'C', companyName: 'C', type: 'SELL', shares: 1, price: 115, date: '2024-01-06', grossAmount: 115, commission: 0, vat: 0, netAmount: 115 }),
        // Loss 1
        createTransaction({ id: '7', portfolioId: 'p1', symbol: 'D', companyName: 'D', type: 'BUY', shares: 1, price: 100, date: '2024-01-07', grossAmount: 100, commission: 0, vat: 0, netAmount: 100 }),
        createTransaction({ id: '8', portfolioId: 'p1', symbol: 'D', companyName: 'D', type: 'SELL', shares: 1, price: 90, date: '2024-01-08', grossAmount: 90, commission: 0, vat: 0, netAmount: 90 }),
      ];

      const result = calculateTradingPerformance(transactions, [], {});

      expect(result.maxConsecutiveWins).toBe(3);
      expect(result.maxConsecutiveLosses).toBe(1);
    });
  });

  describe('calculateMonthlyPerformance', () => {
    it('should group trades by month', () => {
      const trades = [
        { id: '1', symbol: 'AAPL', companyName: 'Apple', buyDate: '2024-01-01', sellDate: '2024-01-15', shares: 10, buyPrice: 100, sellPrice: 110, buyCost: 1000, sellProceeds: 1100, realizedPnL: 100, realizedPnLPercent: 10, holdingDays: 14, isWin: true },
        { id: '2', symbol: 'NVDA', companyName: 'NVIDIA', buyDate: '2024-01-10', sellDate: '2024-01-20', shares: 5, buyPrice: 200, sellPrice: 180, buyCost: 1000, sellProceeds: 900, realizedPnL: -100, realizedPnLPercent: -10, holdingDays: 10, isWin: false },
        { id: '3', symbol: 'MSFT', companyName: 'Microsoft', buyDate: '2024-02-01', sellDate: '2024-02-15', shares: 10, buyPrice: 300, sellPrice: 320, buyCost: 3000, sellProceeds: 3200, realizedPnL: 200, realizedPnLPercent: 6.67, holdingDays: 14, isWin: true },
      ];

      const result = calculateMonthlyPerformance(trades);

      expect(result['2024-01'].trades).toBe(2);
      expect(result['2024-01'].pnl).toBe(0); // 100 - 100
      expect(result['2024-01'].winRate).toBe(50);
      expect(result['2024-02'].trades).toBe(1);
      expect(result['2024-02'].pnl).toBe(200);
      expect(result['2024-02'].winRate).toBe(100);
    });
  });

  describe('calculateSymbolPerformance', () => {
    it('should group trades by symbol', () => {
      const trades = [
        { id: '1', symbol: 'AAPL', companyName: 'Apple', buyDate: '2024-01-01', sellDate: '2024-01-15', shares: 10, buyPrice: 100, sellPrice: 110, buyCost: 1000, sellProceeds: 1100, realizedPnL: 100, realizedPnLPercent: 10, holdingDays: 14, isWin: true },
        { id: '2', symbol: 'AAPL', companyName: 'Apple', buyDate: '2024-02-01', sellDate: '2024-02-15', shares: 10, buyPrice: 110, sellPrice: 130, buyCost: 1100, sellProceeds: 1300, realizedPnL: 200, realizedPnLPercent: 18.18, holdingDays: 14, isWin: true },
        { id: '3', symbol: 'NVDA', companyName: 'NVIDIA', buyDate: '2024-01-10', sellDate: '2024-01-20', shares: 5, buyPrice: 200, sellPrice: 180, buyCost: 1000, sellProceeds: 900, realizedPnL: -100, realizedPnLPercent: -10, holdingDays: 10, isWin: false },
      ];

      const result = calculateSymbolPerformance(trades);

      expect(result['AAPL'].trades).toBe(2);
      expect(result['AAPL'].pnl).toBe(300); // 100 + 200
      expect(result['AAPL'].winRate).toBe(100);
      expect(result['NVDA'].trades).toBe(1);
      expect(result['NVDA'].pnl).toBe(-100);
      expect(result['NVDA'].winRate).toBe(0);
    });
  });
});
