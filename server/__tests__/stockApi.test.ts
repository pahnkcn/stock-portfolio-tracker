import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getStockQuote, getMultipleStockQuotes, getStockChart } from '../stockApi';

// Mock the dataApi module
vi.mock('../_core/dataApi', () => ({
  callDataApi: vi.fn(),
}));

import { callDataApi } from '../_core/dataApi';

const mockCallDataApi = vi.mocked(callDataApi);

describe('Stock API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getStockQuote', () => {
    it('should return stock quote for valid symbol', async () => {
      mockCallDataApi.mockResolvedValue({
        chart: {
          result: [{
            meta: {
              symbol: 'AAPL',
              longName: 'Apple Inc.',
              regularMarketPrice: 150.00,
              chartPreviousClose: 148.00,
              regularMarketDayHigh: 152.00,
              regularMarketDayLow: 147.00,
              regularMarketVolume: 50000000,
              fiftyTwoWeekHigh: 180.00,
              fiftyTwoWeekLow: 120.00,
            },
            indicators: {
              quote: [{
                open: [149.00],
                high: [152.00],
                low: [147.00],
                close: [150.00],
                volume: [50000000],
              }],
            },
          }],
        },
      });

      const result = await getStockQuote('AAPL');

      expect(result).not.toBeNull();
      expect(result?.symbol).toBe('AAPL');
      expect(result?.companyName).toBe('Apple Inc.');
      expect(result?.currentPrice).toBe(150.00);
      expect(result?.change).toBeCloseTo(2.00, 2);
      expect(result?.changePercent).toBeCloseTo(1.35, 1);
    });

    it('should return null for invalid response', async () => {
      mockCallDataApi.mockResolvedValue({
        chart: {
          result: null,
        },
      });

      const result = await getStockQuote('INVALID');
      expect(result).toBeNull();
    });

    it('should handle API errors gracefully', async () => {
      mockCallDataApi.mockRejectedValue(new Error('API Error'));

      const result = await getStockQuote('AAPL');
      expect(result).toBeNull();
    });

    it('should use shortName if longName is not available', async () => {
      mockCallDataApi.mockResolvedValue({
        chart: {
          result: [{
            meta: {
              symbol: 'TEST',
              shortName: 'Test Corp',
              regularMarketPrice: 100.00,
              chartPreviousClose: 100.00,
              regularMarketDayHigh: 100.00,
              regularMarketDayLow: 100.00,
              regularMarketVolume: 1000,
              fiftyTwoWeekHigh: 100.00,
              fiftyTwoWeekLow: 100.00,
            },
          }],
        },
      });

      const result = await getStockQuote('TEST');
      expect(result?.companyName).toBe('Test Corp');
    });
  });

  describe('getMultipleStockQuotes', () => {
    it('should return quotes for multiple symbols', async () => {
      mockCallDataApi
        .mockResolvedValueOnce({
          chart: {
            result: [{
              meta: {
                symbol: 'AAPL',
                longName: 'Apple Inc.',
                regularMarketPrice: 150.00,
                chartPreviousClose: 148.00,
                regularMarketDayHigh: 152.00,
                regularMarketDayLow: 147.00,
                regularMarketVolume: 50000000,
                fiftyTwoWeekHigh: 180.00,
                fiftyTwoWeekLow: 120.00,
              },
            }],
          },
        })
        .mockResolvedValueOnce({
          chart: {
            result: [{
              meta: {
                symbol: 'NVDA',
                longName: 'NVIDIA Corporation',
                regularMarketPrice: 500.00,
                chartPreviousClose: 490.00,
                regularMarketDayHigh: 510.00,
                regularMarketDayLow: 485.00,
                regularMarketVolume: 30000000,
                fiftyTwoWeekHigh: 600.00,
                fiftyTwoWeekLow: 300.00,
              },
            }],
          },
        });

      const result = await getMultipleStockQuotes(['AAPL', 'NVDA']);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result['AAPL']).toBeDefined();
      expect(result['NVDA']).toBeDefined();
      expect(result['AAPL'].currentPrice).toBe(150.00);
      expect(result['NVDA'].currentPrice).toBe(500.00);
    });

    it('should handle partial failures', async () => {
      mockCallDataApi
        .mockResolvedValueOnce({
          chart: {
            result: [{
              meta: {
                symbol: 'AAPL',
                longName: 'Apple Inc.',
                regularMarketPrice: 150.00,
                chartPreviousClose: 148.00,
                regularMarketDayHigh: 152.00,
                regularMarketDayLow: 147.00,
                regularMarketVolume: 50000000,
                fiftyTwoWeekHigh: 180.00,
                fiftyTwoWeekLow: 120.00,
              },
            }],
          },
        })
        .mockRejectedValueOnce(new Error('API Error'));

      const result = await getMultipleStockQuotes(['AAPL', 'INVALID']);

      expect(Object.keys(result)).toHaveLength(1);
      expect(result['AAPL']).toBeDefined();
    });
  });

  describe('getStockChart', () => {
    it('should return chart data for valid symbol', async () => {
      mockCallDataApi.mockResolvedValue({
        chart: {
          result: [{
            meta: {
              symbol: 'AAPL',
            },
            timestamp: [1704067200, 1704153600, 1704240000],
            indicators: {
              quote: [{
                open: [150.00, 151.00, 152.00],
                high: [155.00, 156.00, 157.00],
                low: [148.00, 149.00, 150.00],
                close: [153.00, 154.00, 155.00],
                volume: [1000000, 1100000, 1200000],
              }],
            },
          }],
        },
      });

      const result = await getStockChart('AAPL', '1d', '1mo');

      expect(result).not.toBeNull();
      expect(result?.symbol).toBe('AAPL');
      expect(result?.timestamps).toHaveLength(3);
      expect(result?.prices.close).toHaveLength(3);
    });

    it('should filter out null values from chart data', async () => {
      mockCallDataApi.mockResolvedValue({
        chart: {
          result: [{
            meta: {
              symbol: 'AAPL',
            },
            timestamp: [1704067200, 1704153600],
            indicators: {
              quote: [{
                open: [150.00, null],
                high: [155.00, 156.00],
                low: [148.00, null],
                close: [153.00, 154.00],
                volume: [1000000, null],
              }],
            },
          }],
        },
      });

      const result = await getStockChart('AAPL', '1d', '5d');

      expect(result?.prices.open).toHaveLength(1);
      expect(result?.prices.high).toHaveLength(2);
      expect(result?.prices.close).toHaveLength(2);
    });
  });
});
