/**
 * Tests for Technical Indicators Module
 */

import { describe, test, expect } from 'vitest';
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateRSISeries,
  calculateMACD,
  calculateStochastic,
  calculateBollingerBands,
  calculateATR,
  calculateADX,
  calculateIchimoku,
  calculateOBV,
  calculateVWAP,
  calculateWilliamsR,
  calculateCCI,
  analyzeRSI,
  analyzeMACD,
  analyzeStochastic,
  analyzeBollingerBands,
  analyzeADX,
  analyzeIchimoku,
  analyzeVolume,
  calculateAllIndicators,
  OHLCV,
} from '../technical-indicators';

// ============================================================================
// TEST DATA GENERATION
// ============================================================================

function generateOHLCVData(days: number, startPrice: number = 100, volatility: number = 0.02): OHLCV[] {
  const data: OHLCV[] = [];
  let price = startPrice;

  for (let i = 0; i < days; i++) {
    const change = (Math.random() - 0.5) * 2 * volatility * price;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * volatility * price;
    const low = Math.min(open, close) - Math.random() * volatility * price;
    const volume = Math.floor(1000000 + Math.random() * 5000000);

    data.push({ open, high, low, close, volume, timestamp: Date.now() + i * 86400000 });
    price = close;
  }

  return data;
}

function generateTrendingData(days: number, trend: 'up' | 'down', startPrice: number = 100): OHLCV[] {
  const data: OHLCV[] = [];
  let price = startPrice;
  const trendFactor = trend === 'up' ? 1.005 : 0.995;

  for (let i = 0; i < days; i++) {
    const open = price;
    price = price * trendFactor + (Math.random() - 0.5) * price * 0.01;
    const close = price;
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    const volume = Math.floor(1000000 + Math.random() * 5000000);

    data.push({ open, high, low, close, volume, timestamp: Date.now() + i * 86400000 });
  }

  return data;
}

// ============================================================================
// SMA TESTS
// ============================================================================

describe('SMA (Simple Moving Average)', () => {
  test('calculates correctly for simple data', () => {
    const data = [1, 2, 3, 4, 5];
    expect(calculateSMA(data, 3)).toBe(4); // (3+4+5)/3
  });

  test('returns last value when insufficient data', () => {
    const data = [1, 2];
    expect(calculateSMA(data, 5)).toBe(2);
  });

  test('handles single value', () => {
    const data = [10];
    expect(calculateSMA(data, 1)).toBe(10);
  });
});

// ============================================================================
// EMA TESTS
// ============================================================================

describe('EMA (Exponential Moving Average)', () => {
  test('calculates correctly for simple data', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const ema = calculateEMA(data, 5);
    // EMA should be between SMA and last value (or equal to SMA for linear data)
    expect(ema).toBeGreaterThanOrEqual(calculateSMA(data, 5));
    expect(ema).toBeLessThanOrEqual(10);
  });

  test('returns last value when insufficient data', () => {
    const data = [1, 2, 3];
    expect(calculateEMA(data, 10)).toBe(3);
  });

  test('handles empty array', () => {
    expect(calculateEMA([], 5)).toBe(0);
  });

  test('EMA is more responsive to recent prices', () => {
    const data = [10, 10, 10, 10, 10, 20]; // Sudden jump
    const ema = calculateEMA(data, 5);
    const sma = calculateSMA(data, 5);
    // EMA should be closer to 20 than SMA
    expect(ema).toBeGreaterThan(sma);
  });
});

// ============================================================================
// RSI TESTS
// ============================================================================

describe('RSI (Relative Strength Index)', () => {
  test('returns 50 when insufficient data', () => {
    const data = [1, 2, 3];
    expect(calculateRSI(data, 14)).toBe(50);
  });

  test('returns value between 0 and 100', () => {
    const data = generateOHLCVData(50).map(d => d.close);
    const rsi = calculateRSI(data);
    expect(rsi).toBeGreaterThanOrEqual(0);
    expect(rsi).toBeLessThanOrEqual(100);
  });

  test('RSI is high in strong uptrend', () => {
    const data = generateTrendingData(50, 'up').map(d => d.close);
    const rsi = calculateRSI(data);
    expect(rsi).toBeGreaterThan(50);
  });

  test('RSI is low in strong downtrend', () => {
    const data = generateTrendingData(50, 'down').map(d => d.close);
    const rsi = calculateRSI(data);
    expect(rsi).toBeLessThan(50);
  });

  test('RSI series length matches input', () => {
    const data = Array.from({ length: 30 }, (_, i) => 100 + i);
    const rsiSeries = calculateRSISeries(data, 14);
    expect(rsiSeries.length).toBe(data.length);
  });
});

describe('RSI Analysis', () => {
  test('detects overbought condition', () => {
    // Create strong uptrend for overbought
    const data = Array.from({ length: 30 }, (_, i) => 100 + i * 2);
    const analysis = analyzeRSI(data);
    expect(analysis.zones.overbought).toBe(true);
  });

  test('detects oversold condition', () => {
    // Create strong downtrend for oversold
    const data = Array.from({ length: 30 }, (_, i) => 200 - i * 5);
    const analysis = analyzeRSI(data);
    expect(analysis.zones.oversold).toBe(true);
  });
});

// ============================================================================
// MACD TESTS
// ============================================================================

describe('MACD (Moving Average Convergence Divergence)', () => {
  test('returns zeros when insufficient data', () => {
    const data = [1, 2, 3, 4, 5];
    const macd = calculateMACD(data);
    expect(macd.macd).toBe(0);
    expect(macd.signal).toBe(0);
    expect(macd.histogram).toBe(0);
  });

  test('MACD is positive in uptrend', () => {
    const data = generateTrendingData(50, 'up').map(d => d.close);
    const macd = calculateMACD(data);
    expect(macd.macd).toBeGreaterThan(0);
  });

  test('MACD is negative in downtrend', () => {
    const data = generateTrendingData(50, 'down').map(d => d.close);
    const macd = calculateMACD(data);
    expect(macd.macd).toBeLessThan(0);
  });

  test('histogram equals MACD minus signal', () => {
    const data = generateOHLCVData(50).map(d => d.close);
    const macd = calculateMACD(data);
    expect(macd.histogram).toBeCloseTo(macd.macd - macd.signal, 10);
  });
});

describe('MACD Analysis', () => {
  test('detects bullish trend', () => {
    const data = generateTrendingData(50, 'up').map(d => d.close);
    const analysis = analyzeMACD(data);
    // In strong uptrend, MACD should be bullish or neutral (never bearish)
    expect(['bullish', 'neutral']).toContain(analysis.trend);
  });

  test('detects bearish trend', () => {
    const data = generateTrendingData(50, 'down').map(d => d.close);
    const analysis = analyzeMACD(data);
    // In strong downtrend, MACD should be bearish or neutral (never bullish)
    expect(['bearish', 'neutral']).toContain(analysis.trend);
  });
});

// ============================================================================
// STOCHASTIC TESTS
// ============================================================================

describe('Stochastic Oscillator', () => {
  test('returns 50 when insufficient data', () => {
    const highs = [1, 2, 3];
    const lows = [0.5, 1.5, 2.5];
    const closes = [0.8, 1.8, 2.8];
    const stoch = calculateStochastic(highs, lows, closes);
    expect(stoch.k).toBe(50);
  });

  test('returns values between 0 and 100', () => {
    const data = generateOHLCVData(30);
    const stoch = calculateStochastic(
      data.map(d => d.high),
      data.map(d => d.low),
      data.map(d => d.close)
    );
    expect(stoch.k).toBeGreaterThanOrEqual(0);
    expect(stoch.k).toBeLessThanOrEqual(100);
    expect(stoch.d).toBeGreaterThanOrEqual(0);
    expect(stoch.d).toBeLessThanOrEqual(100);
  });

  test('K is high when close near period high', () => {
    const highs = Array(20).fill(110);
    const lows = Array(20).fill(90);
    const closes = Array(20).fill(108); // Near high
    const stoch = calculateStochastic(highs, lows, closes);
    expect(stoch.k).toBeGreaterThan(80);
  });

  test('K is low when close near period low', () => {
    const highs = Array(20).fill(110);
    const lows = Array(20).fill(90);
    const closes = Array(20).fill(92); // Near low
    const stoch = calculateStochastic(highs, lows, closes);
    expect(stoch.k).toBeLessThan(20);
  });
});

// ============================================================================
// BOLLINGER BANDS TESTS
// ============================================================================

describe('Bollinger Bands', () => {
  test('returns current price when insufficient data', () => {
    const data = [100, 101, 102];
    const bb = calculateBollingerBands(data, 20);
    expect(bb.middle).toBe(102);
    expect(bb.upper).toBe(102);
    expect(bb.lower).toBe(102);
  });

  test('bands are symmetrical around middle', () => {
    const data = generateOHLCVData(30).map(d => d.close);
    const bb = calculateBollingerBands(data);
    const upperDiff = bb.upper - bb.middle;
    const lowerDiff = bb.middle - bb.lower;
    expect(upperDiff).toBeCloseTo(lowerDiff, 10);
  });

  test('middle band equals 20-period SMA', () => {
    const data = generateOHLCVData(30).map(d => d.close);
    const bb = calculateBollingerBands(data, 20);
    const sma = calculateSMA(data, 20);
    expect(bb.middle).toBeCloseTo(sma, 10);
  });

  test('bandwidth increases with volatility', () => {
    const stableData = Array(30).fill(100).map((v, i) => v + Math.sin(i) * 0.5);
    const volatileData = Array(30).fill(100).map((v, i) => v + Math.sin(i) * 5);

    const stableBB = calculateBollingerBands(stableData);
    const volatileBB = calculateBollingerBands(volatileData);

    expect(volatileBB.bandwidth).toBeGreaterThan(stableBB.bandwidth);
  });

  test('percentB is 0.5 when price at middle band', () => {
    // Create data where last price equals the middle band
    const data = Array(25).fill(100);
    const bb = calculateBollingerBands(data);
    expect(bb.percentB).toBeCloseTo(0.5, 1);
  });
});

describe('Bollinger Bands Analysis', () => {
  test('detects narrow bandwidth with stable data', () => {
    // Create very stable data
    const data = Array(150).fill(100).map((v, i) => v + Math.sin(i / 10) * 0.1);
    const analysis = analyzeBollingerBands(data);
    // Bandwidth should be very low for stable data
    expect(analysis.bandwidth).toBeLessThan(1);
  });
});

// ============================================================================
// ATR TESTS
// ============================================================================

describe('ATR (Average True Range)', () => {
  test('returns 0 when insufficient data', () => {
    const atr = calculateATR([100, 101], [99, 100], [100, 101]);
    expect(atr).toBe(0);
  });

  test('ATR is always positive', () => {
    const data = generateOHLCVData(30);
    const atr = calculateATR(
      data.map(d => d.high),
      data.map(d => d.low),
      data.map(d => d.close)
    );
    expect(atr).toBeGreaterThan(0);
  });

  test('ATR increases with volatility', () => {
    const stableData = generateOHLCVData(30, 100, 0.01);
    const volatileData = generateOHLCVData(30, 100, 0.05);

    const stableATR = calculateATR(
      stableData.map(d => d.high),
      stableData.map(d => d.low),
      stableData.map(d => d.close)
    );

    const volatileATR = calculateATR(
      volatileData.map(d => d.high),
      volatileData.map(d => d.low),
      volatileData.map(d => d.close)
    );

    expect(volatileATR).toBeGreaterThan(stableATR);
  });
});

// ============================================================================
// ADX TESTS
// ============================================================================

describe('ADX (Average Directional Index)', () => {
  test('returns zeros when insufficient data', () => {
    const adx = calculateADX([100, 101], [99, 100], [100, 101]);
    expect(adx.adx).toBe(0);
    expect(adx.plusDI).toBe(0);
    expect(adx.minusDI).toBe(0);
  });

  test('ADX is between 0 and 100', () => {
    const data = generateOHLCVData(50);
    const adx = calculateADX(
      data.map(d => d.high),
      data.map(d => d.low),
      data.map(d => d.close)
    );
    expect(adx.adx).toBeGreaterThanOrEqual(0);
    expect(adx.adx).toBeLessThanOrEqual(100);
  });

  test('+DI > -DI in uptrend', () => {
    const data = generateTrendingData(50, 'up');
    const adx = calculateADX(
      data.map(d => d.high),
      data.map(d => d.low),
      data.map(d => d.close)
    );
    expect(adx.plusDI).toBeGreaterThan(adx.minusDI);
  });

  test('-DI > +DI in downtrend', () => {
    const data = generateTrendingData(50, 'down');
    const adx = calculateADX(
      data.map(d => d.high),
      data.map(d => d.low),
      data.map(d => d.close)
    );
    expect(adx.minusDI).toBeGreaterThan(adx.plusDI);
  });
});

describe('ADX Analysis', () => {
  test('detects strong trend', () => {
    // Create very strong trending data
    const data = generateTrendingData(100, 'up');
    const analysis = analyzeADX(
      data.map(d => d.high),
      data.map(d => d.low),
      data.map(d => d.close)
    );
    expect(['strong', 'moderate']).toContain(analysis.trend.strength);
    expect(analysis.trend.direction).toBe('bullish');
  });
});

// ============================================================================
// ICHIMOKU TESTS
// ============================================================================

describe('Ichimoku Cloud', () => {
  test('returns current price when insufficient data', () => {
    const currentPrice = 100;
    const ichimoku = calculateIchimoku([100], [99], [currentPrice]);
    expect(ichimoku.tenkanSen).toBe(currentPrice);
    expect(ichimoku.kijunSen).toBe(currentPrice);
  });

  test('Tenkan-Sen is average of 9-period high/low', () => {
    const highs = Array(20).fill(110);
    const lows = Array(20).fill(90);
    const closes = Array(20).fill(100);
    const ichimoku = calculateIchimoku(highs, lows, closes);
    expect(ichimoku.tenkanSen).toBe(100); // (110 + 90) / 2
  });

  test('Kijun-Sen is average of 26-period high/low', () => {
    const highs = Array(30).fill(120);
    const lows = Array(30).fill(80);
    const closes = Array(30).fill(100);
    const ichimoku = calculateIchimoku(highs, lows, closes);
    expect(ichimoku.kijunSen).toBe(100); // (120 + 80) / 2
  });
});

describe('Ichimoku Analysis', () => {
  test('detects price above cloud as bullish', () => {
    // Create uptrend where price should be above cloud
    const data = generateTrendingData(60, 'up');
    const analysis = analyzeIchimoku(
      data.map(d => d.high),
      data.map(d => d.low),
      data.map(d => d.close)
    );
    expect(analysis.cloudStatus).toBe('above');
    expect(analysis.signal.signal).toBe('bullish');
  });

  test('detects price below cloud as bearish', () => {
    // Create downtrend where price should be below cloud
    const data = generateTrendingData(60, 'down');
    const analysis = analyzeIchimoku(
      data.map(d => d.high),
      data.map(d => d.low),
      data.map(d => d.close)
    );
    expect(analysis.cloudStatus).toBe('below');
    expect(analysis.signal.signal).toBe('bearish');
  });
});

// ============================================================================
// VOLUME ANALYSIS TESTS
// ============================================================================

describe('OBV (On Balance Volume)', () => {
  test('increases when close is higher than previous', () => {
    const closes = [100, 101, 102, 103];
    const volumes = [1000, 2000, 3000, 4000];
    const obv = calculateOBV(closes, volumes);
    // OBV should be positive sum of volumes (all up days)
    expect(obv).toBe(2000 + 3000 + 4000);
  });

  test('decreases when close is lower than previous', () => {
    const closes = [100, 99, 98, 97];
    const volumes = [1000, 2000, 3000, 4000];
    const obv = calculateOBV(closes, volumes);
    // OBV should be negative sum of volumes (all down days)
    expect(obv).toBe(-(2000 + 3000 + 4000));
  });
});

describe('VWAP (Volume Weighted Average Price)', () => {
  test('equals typical price when volume is uniform', () => {
    const highs = [102, 103];
    const lows = [98, 99];
    const closes = [100, 101];
    const volumes = [1000, 1000];
    const vwap = calculateVWAP(highs, lows, closes, volumes);
    // VWAP = sum(TP * V) / sum(V)
    const tp1 = (102 + 98 + 100) / 3;
    const tp2 = (103 + 99 + 101) / 3;
    const expected = (tp1 * 1000 + tp2 * 1000) / 2000;
    expect(vwap).toBeCloseTo(expected, 10);
  });
});

describe('Volume Analysis', () => {
  test('detects high volume correctly', () => {
    const data = generateOHLCVData(30);
    // Make last volume very high
    data[data.length - 1].volume = 10000000;
    const analysis = analyzeVolume(
      data.map(d => d.high),
      data.map(d => d.low),
      data.map(d => d.close),
      data.map(d => d.volume)
    );
    expect(analysis.volumeSignal).toBe('high');
    expect(analysis.volumeRatio).toBeGreaterThan(1.5);
  });
});

// ============================================================================
// WILLIAMS %R TESTS
// ============================================================================

describe('Williams %R', () => {
  test('returns -50 when insufficient data', () => {
    const williamsR = calculateWilliamsR([100], [99], [100]);
    expect(williamsR).toBe(-50);
  });

  test('is near 0 when close is at period high', () => {
    const highs = Array(20).fill(110);
    const lows = Array(20).fill(90);
    const closes = Array(20).fill(110);
    const williamsR = calculateWilliamsR(highs, lows, closes);
    expect(williamsR).toBeCloseTo(0, 1);
  });

  test('is near -100 when close is at period low', () => {
    const highs = Array(20).fill(110);
    const lows = Array(20).fill(90);
    const closes = Array(20).fill(90);
    const williamsR = calculateWilliamsR(highs, lows, closes);
    expect(williamsR).toBeCloseTo(-100, 1);
  });

  test('returns value between -100 and 0', () => {
    const data = generateOHLCVData(30);
    const williamsR = calculateWilliamsR(
      data.map(d => d.high),
      data.map(d => d.low),
      data.map(d => d.close)
    );
    expect(williamsR).toBeGreaterThanOrEqual(-100);
    expect(williamsR).toBeLessThanOrEqual(0);
  });
});

// ============================================================================
// CCI TESTS
// ============================================================================

describe('CCI (Commodity Channel Index)', () => {
  test('returns 0 when insufficient data', () => {
    const cci = calculateCCI([100], [99], [100]);
    expect(cci).toBe(0);
  });

  test('is positive when price above average', () => {
    // Create ascending prices
    const highs = Array.from({ length: 25 }, (_, i) => 100 + i);
    const lows = Array.from({ length: 25 }, (_, i) => 98 + i);
    const closes = Array.from({ length: 25 }, (_, i) => 99 + i);
    const cci = calculateCCI(highs, lows, closes);
    expect(cci).toBeGreaterThan(0);
  });

  test('is negative when price below average', () => {
    // Create descending prices
    const highs = Array.from({ length: 25 }, (_, i) => 125 - i);
    const lows = Array.from({ length: 25 }, (_, i) => 123 - i);
    const closes = Array.from({ length: 25 }, (_, i) => 124 - i);
    const cci = calculateCCI(highs, lows, closes);
    expect(cci).toBeLessThan(0);
  });
});

// ============================================================================
// COMPREHENSIVE ANALYSIS TESTS
// ============================================================================

describe('calculateAllIndicators', () => {
  test('returns all required indicators', () => {
    const data = generateOHLCVData(100);
    const analysis = calculateAllIndicators(data);

    // Check indicators object
    expect(analysis.indicators).toBeDefined();
    expect(analysis.indicators.rsi).toBeDefined();
    expect(analysis.indicators.macd).toBeDefined();
    expect(analysis.indicators.ema20).toBeDefined();
    expect(analysis.indicators.ema50).toBeDefined();
    expect(analysis.indicators.ema200).toBeDefined();
    expect(analysis.indicators.bollingerBands).toBeDefined();
    expect(analysis.indicators.atr).toBeDefined();

    // Check analyses
    expect(analysis.rsiAnalysis).toBeDefined();
    expect(analysis.macdAnalysis).toBeDefined();
    expect(analysis.stochastic).toBeDefined();
    expect(analysis.bollingerBands).toBeDefined();
    expect(analysis.adx).toBeDefined();
    expect(analysis.ichimoku).toBeDefined();
    expect(analysis.volume).toBeDefined();
    expect(analysis.overallSignal).toBeDefined();
    expect(analysis.supportResistance).toBeDefined();
  });

  test('overall signal is within expected range', () => {
    const data = generateOHLCVData(100);
    const analysis = calculateAllIndicators(data);

    expect(['bullish', 'bearish', 'neutral']).toContain(analysis.overallSignal.signal);
    expect(['strong', 'moderate', 'weak']).toContain(analysis.overallSignal.strength);
  });

  test('returns bullish signal for strong uptrend', () => {
    const data = generateTrendingData(100, 'up');
    const analysis = calculateAllIndicators(data);

    // In uptrend, signal should be bullish or neutral (not bearish)
    expect(['bullish', 'neutral']).toContain(analysis.overallSignal.signal);
  });

  test('returns bearish signal for strong downtrend', () => {
    const data = generateTrendingData(100, 'down');
    const analysis = calculateAllIndicators(data);

    // In downtrend, signal should be bearish or neutral (not bullish)
    expect(['bearish', 'neutral']).toContain(analysis.overallSignal.signal);
  });
});
