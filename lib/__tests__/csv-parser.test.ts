import { describe, it, expect } from 'vitest';
import { parseCSV, validateCSV, calculateHoldingsFromTransactions } from '../csv-parser';

describe('CSV Parser', () => {
  const sampleCSV = `Symbol & Name,Trade Date,Settlement Date,Buy/Sell,Quantity,Traded Price,Gross Amount,Comm/Fee/Tax,VAT,Net Amount
NVDA NVIDIA CORPORATION,25/11/2025,26/11/2025,BUY,0.5,172.12,86.06,-0.09,-0.01,86.16
AAPL APPLE INC,20/11/2025,21/11/2025,BUY,1,150.00,150.00,-0.15,-0.02,150.17
NVDA NVIDIA CORPORATION,28/11/2025,29/11/2025,SELL,0.25,180.00,45.00,-0.05,-0.01,44.94`;

  describe('validateCSV', () => {
    it('should validate correct CSV format', () => {
      const result = validateCSV(sampleCSV);
      expect(result.valid).toBe(true);
    });

    it('should reject empty content', () => {
      const result = validateCSV('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should reject CSV without header', () => {
      const result = validateCSV('just some random text');
      expect(result.valid).toBe(false);
    });
  });

  describe('parseCSV', () => {
    it('should parse CSV rows correctly', () => {
      const result = parseCSV(sampleCSV);
      expect(result.length).toBe(3);
    });

    it('should extract symbol correctly', () => {
      const result = parseCSV(sampleCSV);
      expect(result[0].symbol).toBe('NVDA');
      expect(result[1].symbol).toBe('AAPL');
    });

    it('should extract company name correctly', () => {
      const result = parseCSV(sampleCSV);
      expect(result[0].companyName).toBe('NVIDIA CORPORATION');
      expect(result[1].companyName).toBe('APPLE INC');
    });

    it('should parse transaction type correctly', () => {
      const result = parseCSV(sampleCSV);
      expect(result[0].type).toBe('BUY');
      expect(result[2].type).toBe('SELL');
    });

    it('should parse numeric values correctly', () => {
      const result = parseCSV(sampleCSV);
      expect(result[0].quantity).toBe(0.5);
      expect(result[0].tradedPrice).toBe(172.12);
      expect(result[0].grossAmount).toBe(86.06);
    });

    it('should convert date format from DD/MM/YYYY to YYYY-MM-DD', () => {
      const result = parseCSV(sampleCSV);
      expect(result[0].tradeDate).toBe('2025-11-25');
      expect(result[0].settlementDate).toBe('2025-11-26');
    });

    it('should handle negative commission values', () => {
      const result = parseCSV(sampleCSV);
      expect(result[0].commission).toBe(0.09);
      expect(result[0].vat).toBe(0.01);
    });
  });

  describe('calculateHoldingsFromTransactions', () => {
    it('should calculate holdings from transactions', () => {
      const parsed = parseCSV(sampleCSV);
      const holdings = calculateHoldingsFromTransactions(parsed);
      
      expect(holdings.size).toBe(2); // NVDA and AAPL
    });

    it('should calculate correct shares after buy and sell', () => {
      const parsed = parseCSV(sampleCSV);
      const holdings = calculateHoldingsFromTransactions(parsed);
      
      const nvda = holdings.get('NVDA');
      expect(nvda).toBeDefined();
      // Bought 0.5, sold 0.25 = 0.25 remaining
      expect(nvda!.shares).toBeCloseTo(0.25, 5);
    });

    it('should calculate correct shares for buy only', () => {
      const parsed = parseCSV(sampleCSV);
      const holdings = calculateHoldingsFromTransactions(parsed);
      
      const aapl = holdings.get('AAPL');
      expect(aapl).toBeDefined();
      expect(aapl!.shares).toBe(1);
    });
  });
});
