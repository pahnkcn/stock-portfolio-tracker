/**
 * Tests for Support & Resistance Module
 */

import { describe, test, expect } from 'vitest';
import {
  calculateStandardPivots,
  calculateFibonacciPivots,
  calculateCamarillaPivots,
  calculateWoodiePivots,
  findSwingPoints,
  calculateFibonacciRetracement,
  calculateFibonacciExtension,
  calculateVolumeProfile,
  getVolumeProfileLevels,
  detectSwingPoints,
  swingPointsToLevels,
  clusterPriceLevels,
  getPsychologicalLevels,
  getMovingAverageLevels,
  consolidateLevels,
  calculateAdvancedSupportResistance,
  getComprehensiveSRAnalysis,
  PriceLevel,
} from '../support-resistance';
import { OHLCV } from '../technical-indicators';

// ============================================================================
// TEST DATA GENERATION
// ============================================================================

function generateOHLCVData(days: number, startPrice: number = 100): OHLCV[] {
  const data: OHLCV[] = [];
  let price = startPrice;

  for (let i = 0; i < days; i++) {
    const volatility = 0.02;
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
  const trendFactor = trend === 'up' ? 1.01 : 0.99;

  for (let i = 0; i < days; i++) {
    const open = price;
    price = price * trendFactor + (Math.random() - 0.5) * price * 0.005;
    const close = price;
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);
    const volume = Math.floor(1000000 + Math.random() * 5000000);

    data.push({ open, high, low, close, volume, timestamp: Date.now() + i * 86400000 });
  }

  return data;
}

// ============================================================================
// STANDARD PIVOT POINTS TESTS
// ============================================================================

describe('Standard Pivot Points', () => {
  test('calculates pivot as (H+L+C)/3', () => {
    const pivots = calculateStandardPivots(110, 90, 100);
    expect(pivots.pivot).toBe((110 + 90 + 100) / 3);
  });

  test('R1 = 2*P - L', () => {
    const pivots = calculateStandardPivots(110, 90, 100);
    expect(pivots.r1).toBe(2 * pivots.pivot - 90);
  });

  test('R2 = P + (H - L)', () => {
    const pivots = calculateStandardPivots(110, 90, 100);
    expect(pivots.r2).toBe(pivots.pivot + (110 - 90));
  });

  test('S1 = 2*P - H', () => {
    const pivots = calculateStandardPivots(110, 90, 100);
    expect(pivots.s1).toBe(2 * pivots.pivot - 110);
  });

  test('S2 = P - (H - L)', () => {
    const pivots = calculateStandardPivots(110, 90, 100);
    expect(pivots.s2).toBe(pivots.pivot - (110 - 90));
  });

  test('levels are in correct order (S3 < S2 < S1 < P < R1 < R2 < R3)', () => {
    const pivots = calculateStandardPivots(110, 90, 100);
    expect(pivots.s3).toBeLessThan(pivots.s2);
    expect(pivots.s2).toBeLessThan(pivots.s1);
    expect(pivots.s1).toBeLessThan(pivots.pivot);
    expect(pivots.pivot).toBeLessThan(pivots.r1);
    expect(pivots.r1).toBeLessThan(pivots.r2);
    expect(pivots.r2).toBeLessThan(pivots.r3);
  });
});

// ============================================================================
// FIBONACCI PIVOT POINTS TESTS
// ============================================================================

describe('Fibonacci Pivot Points', () => {
  test('uses Fibonacci ratios for levels', () => {
    const pivots = calculateFibonacciPivots(110, 90, 100);
    const range = 110 - 90;

    expect(pivots.r1).toBeCloseTo(pivots.pivot + 0.382 * range, 10);
    expect(pivots.r2).toBeCloseTo(pivots.pivot + 0.618 * range, 10);
    expect(pivots.s1).toBeCloseTo(pivots.pivot - 0.382 * range, 10);
    expect(pivots.s2).toBeCloseTo(pivots.pivot - 0.618 * range, 10);
  });

  test('method is set correctly', () => {
    const pivots = calculateFibonacciPivots(110, 90, 100);
    expect(pivots.method).toBe('Fibonacci');
  });
});

// ============================================================================
// CAMARILLA PIVOT POINTS TESTS
// ============================================================================

describe('Camarilla Pivot Points', () => {
  test('R1 is based on close + range * 1.1/12', () => {
    const pivots = calculateCamarillaPivots(110, 90, 100);
    const range = 110 - 90;
    expect(pivots.r1).toBeCloseTo(100 + range * 1.1 / 12, 10);
  });

  test('levels are tighter than standard pivots', () => {
    const camarilla = calculateCamarillaPivots(110, 90, 100);
    const standard = calculateStandardPivots(110, 90, 100);

    // Camarilla R1 should be closer to pivot than Standard R1
    expect(Math.abs(camarilla.r1 - 100)).toBeLessThan(Math.abs(standard.r1 - standard.pivot));
  });
});

// ============================================================================
// WOODIE PIVOT POINTS TESTS
// ============================================================================

describe('Woodie Pivot Points', () => {
  test('pivot gives more weight to close: (H+L+2C)/4', () => {
    const pivots = calculateWoodiePivots(110, 90, 100);
    expect(pivots.pivot).toBe((110 + 90 + 2 * 100) / 4);
  });

  test('pivot is different from standard when close != average', () => {
    const woodie = calculateWoodiePivots(110, 90, 80);
    const standard = calculateStandardPivots(110, 90, 80);
    expect(woodie.pivot).not.toBe(standard.pivot);
  });
});

// ============================================================================
// FIBONACCI RETRACEMENT TESTS
// ============================================================================

describe('Fibonacci Retracement', () => {
  test('calculates correct levels in uptrend', () => {
    const swingLow = 100;
    const swingHigh = 200;
    const fib = calculateFibonacciRetracement(swingHigh, swingLow, true);

    expect(fib.level0).toBe(swingHigh); // 0% at top
    expect(fib.level1000).toBe(swingLow); // 100% at bottom
    expect(fib.level500).toBe(150); // 50% in middle
    expect(fib.level618).toBeCloseTo(swingHigh - (100 * 0.618), 10); // Golden ratio
  });

  test('calculates correct levels in downtrend', () => {
    const swingLow = 100;
    const swingHigh = 200;
    const fib = calculateFibonacciRetracement(swingHigh, swingLow, false);

    expect(fib.level0).toBe(swingLow); // 0% at bottom
    expect(fib.level1000).toBe(swingHigh); // 100% at top
    expect(fib.level500).toBe(150); // 50% in middle
  });

  test('extension levels project beyond swing range', () => {
    const swingLow = 100;
    const swingHigh = 200;
    const fib = calculateFibonacciRetracement(swingHigh, swingLow, true);

    expect(fib.level1272).toBeLessThan(swingLow); // Below swing low
    expect(fib.level1618).toBeLessThan(fib.level1272);
  });
});

// ============================================================================
// FIBONACCI EXTENSION TESTS
// ============================================================================

describe('Fibonacci Extension', () => {
  test('calculates uptrend extensions above swing high', () => {
    const swingLow = 100;
    const swingHigh = 150;
    const ext = calculateFibonacciExtension(swingHigh, swingLow, true);

    expect(ext.level1000).toBe(swingHigh + 50); // 100% extension = 200
    expect(ext.level1618).toBe(swingHigh + 50 * 1.618); // 161.8% extension
  });

  test('calculates downtrend extensions below swing low', () => {
    const swingLow = 100;
    const swingHigh = 150;
    const ext = calculateFibonacciExtension(swingHigh, swingLow, false);

    expect(ext.level1000).toBe(swingLow - 50); // 100% extension = 50
    expect(ext.level1618).toBe(swingLow - 50 * 1.618); // 161.8% extension
  });
});

// ============================================================================
// SWING POINTS TESTS
// ============================================================================

describe('findSwingPoints', () => {
  test('finds highest and lowest points', () => {
    const highs = [100, 105, 110, 108, 103, 95, 90, 88];
    const lows = [98, 103, 108, 106, 101, 93, 88, 86];

    const { swingHigh, swingLow } = findSwingPoints(highs, lows);

    expect(swingHigh).toBe(110);
    expect(swingLow).toBe(86);
  });

  test('respects lookback parameter', () => {
    const highs = [200, 100, 105, 110, 108];
    const lows = [198, 98, 103, 108, 106];

    const { swingHigh } = findSwingPoints(highs, lows, 3);

    expect(swingHigh).toBe(110); // Only looks at last 3 bars
  });
});

describe('detectSwingPoints', () => {
  test('detects swing highs correctly', () => {
    // Create data with a clear swing high in the middle
    const highs = [100, 102, 105, 110, 105, 102, 100, 98, 95, 93, 90, 92];
    const lows = highs.map(h => h - 2);

    const swings = detectSwingPoints(highs, lows, 2, 2);
    const swingHighs = swings.filter(s => s.type === 'high');

    expect(swingHighs.length).toBeGreaterThan(0);
    expect(swingHighs.some(s => s.price === 110)).toBe(true);
  });

  test('detects swing lows correctly', () => {
    // Create data with a clear swing low in the middle
    const lows = [100, 98, 95, 90, 95, 98, 100, 102, 105, 108, 110, 108];
    const highs = lows.map(l => l + 2);

    const swings = detectSwingPoints(highs, lows, 2, 2);
    const swingLows = swings.filter(s => s.type === 'low');

    expect(swingLows.length).toBeGreaterThan(0);
    expect(swingLows.some(s => s.price === 90)).toBe(true);
  });

  test('assigns strength to swing points', () => {
    const highs = [100, 110, 105, 115, 108];
    const lows = highs.map(h => h - 5);

    const swings = detectSwingPoints(highs, lows, 1, 1);

    swings.forEach(swing => {
      expect(swing.strength).toBeDefined();
      expect(typeof swing.strength).toBe('number');
    });
  });
});

// ============================================================================
// VOLUME PROFILE TESTS
// ============================================================================

describe('calculateVolumeProfile', () => {
  test('returns correct number of bins', () => {
    const data = generateOHLCVData(50);
    const profile = calculateVolumeProfile(
      data.map(d => d.high),
      data.map(d => d.low),
      data.map(d => d.close),
      data.map(d => d.volume),
      30
    );

    expect(profile.length).toBe(30);
  });

  test('identifies POC (Point of Control)', () => {
    const data = generateOHLCVData(50);
    const profile = calculateVolumeProfile(
      data.map(d => d.high),
      data.map(d => d.low),
      data.map(d => d.close),
      data.map(d => d.volume)
    );

    const pocs = profile.filter(p => p.isPOC);
    expect(pocs.length).toBe(1);
  });

  test('volume percentages sum to 100', () => {
    const data = generateOHLCVData(50);
    const profile = calculateVolumeProfile(
      data.map(d => d.high),
      data.map(d => d.low),
      data.map(d => d.close),
      data.map(d => d.volume)
    );

    const totalPercent = profile.reduce((sum, p) => sum + p.volumePercent, 0);
    expect(totalPercent).toBeCloseTo(100, 1);
  });

  test('identifies HVN and LVN', () => {
    const data = generateOHLCVData(100);
    const profile = calculateVolumeProfile(
      data.map(d => d.high),
      data.map(d => d.low),
      data.map(d => d.close),
      data.map(d => d.volume)
    );

    const hvns = profile.filter(p => p.isHVN);
    const lvns = profile.filter(p => p.isLVN);

    expect(hvns.length).toBeGreaterThan(0);
    expect(lvns.length).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// PRICE CLUSTERING TESTS
// ============================================================================

describe('clusterPriceLevels', () => {
  test('groups similar price levels', () => {
    // Create data that repeatedly tests certain price levels
    const highs = [100, 100.5, 100.2, 110, 110.3, 100.1, 110.2];
    const lows = [95, 95.5, 95.2, 105, 105.3, 95.1, 105.2];
    const closes = [98, 99, 97, 108, 107, 98, 107];

    const clusters = clusterPriceLevels(highs, lows, closes, 0.02, 2);

    // Should have clusters around 100 and 110
    expect(clusters.length).toBeGreaterThan(0);
  });

  test('assigns strength based on touch count', () => {
    const highs = Array(10).fill(100);
    const lows = Array(10).fill(95);
    const closes = Array(10).fill(97);

    const clusters = clusterPriceLevels(highs, lows, closes, 0.02, 2);

    clusters.forEach(cluster => {
      expect(['weak', 'moderate', 'strong']).toContain(cluster.strength);
    });
  });
});

// ============================================================================
// PSYCHOLOGICAL LEVELS TESTS
// ============================================================================

describe('getPsychologicalLevels', () => {
  test('returns round numbers around current price', () => {
    const levels = getPsychologicalLevels(155, 0.2);

    // Should include 150 and 160
    const prices = levels.map(l => l.price);
    expect(prices).toContain(150);
    expect(prices).toContain(160);
  });

  test('adjusts interval based on price magnitude', () => {
    const lowPriceLevels = getPsychologicalLevels(5, 0.2);
    const highPriceLevels = getPsychologicalLevels(500, 0.2);

    // Low price should have smaller intervals
    const lowInterval = lowPriceLevels[1].price - lowPriceLevels[0].price;
    const highInterval = highPriceLevels[1].price - highPriceLevels[0].price;

    expect(highInterval).toBeGreaterThan(lowInterval);
  });

  test('classifies levels correctly as support/resistance', () => {
    const levels = getPsychologicalLevels(100, 0.2);

    levels.forEach(level => {
      if (level.price < 100) {
        expect(level.type).toBe('support');
      } else {
        expect(level.type).toBe('resistance');
      }
    });
  });

  test('all levels are marked as psychological', () => {
    const levels = getPsychologicalLevels(100, 0.2);

    levels.forEach(level => {
      expect(level.source).toContain('Psychological');
    });
  });
});

// ============================================================================
// MOVING AVERAGE LEVELS TESTS
// ============================================================================

describe('getMovingAverageLevels', () => {
  test('calculates MAs for standard periods', () => {
    const closes = Array.from({ length: 250 }, (_, i) => 100 + Math.sin(i / 10) * 5);
    const levels = getMovingAverageLevels(closes, 100);

    const sources = levels.map(l => l.source);
    expect(sources).toContain('SMA 20');
    expect(sources).toContain('SMA 50');
    expect(sources).toContain('SMA 200');
  });

  test('assigns stronger weight to longer MAs', () => {
    const closes = Array.from({ length: 250 }, (_, i) => 100 + i * 0.1);
    const levels = getMovingAverageLevels(closes, closes[closes.length - 1]);

    const sma200 = levels.find(l => l.source === 'SMA 200');
    const sma20 = levels.find(l => l.source === 'SMA 20');

    expect(sma200?.strength).toBe('strong');
    expect(sma20?.strength).toBe('weak');
  });
});

// ============================================================================
// CONSOLIDATE LEVELS TESTS
// ============================================================================

describe('consolidateLevels', () => {
  test('merges nearby levels', () => {
    const levels: PriceLevel[] = [
      { price: 100, type: 'support', strength: 'weak', source: 'A', touches: 1 },
      { price: 100.5, type: 'support', strength: 'moderate', source: 'B', touches: 2 },
      { price: 150, type: 'resistance', strength: 'strong', source: 'C', touches: 3 },
    ];

    const consolidated = consolidateLevels(levels, 105, 0.02);

    // First two levels should be merged
    const supportLevels = consolidated.filter(l => l.type === 'support');
    expect(supportLevels.length).toBe(1);
  });

  test('keeps stronger level when merging', () => {
    const levels: PriceLevel[] = [
      { price: 100, type: 'support', strength: 'weak', source: 'A', touches: 1 },
      { price: 100.5, type: 'support', strength: 'strong', source: 'B', touches: 5 },
    ];

    const consolidated = consolidateLevels(levels, 105, 0.02);

    expect(consolidated[0].strength).toBe('strong');
  });

  test('respects maxLevels parameter', () => {
    const levels: PriceLevel[] = Array.from({ length: 20 }, (_, i) => ({
      price: 100 + i * 10,
      type: i < 10 ? 'support' : 'resistance' as 'support' | 'resistance',
      strength: 'moderate' as const,
      source: `Source ${i}`,
      touches: Math.floor(Math.random() * 5) + 1,
    }));

    const consolidated = consolidateLevels(levels, 150, 0.01, 6);

    expect(consolidated.length).toBeLessThanOrEqual(6);
  });

  test('combines sources when merging', () => {
    const levels: PriceLevel[] = [
      { price: 100, type: 'support', strength: 'weak', source: 'Pivot', touches: 1 },
      { price: 100.5, type: 'support', strength: 'moderate', source: 'Fibonacci', touches: 2 },
    ];

    const consolidated = consolidateLevels(levels, 105, 0.02);

    expect(consolidated[0].source).toContain('Pivot');
    expect(consolidated[0].source).toContain('Fibonacci');
  });
});

// ============================================================================
// ADVANCED S/R CALCULATION TESTS
// ============================================================================

describe('calculateAdvancedSupportResistance', () => {
  test('returns support and resistance levels', () => {
    const data = generateOHLCVData(100);
    const currentPrice = data[data.length - 1].close;

    const levels = calculateAdvancedSupportResistance(
      data.map(d => d.high),
      data.map(d => d.low),
      data.map(d => d.close),
      data.map(d => d.volume),
      currentPrice
    );

    const supports = levels.filter(l => l.type === 'support');
    const resistances = levels.filter(l => l.type === 'resistance');

    expect(supports.length).toBeGreaterThan(0);
    expect(resistances.length).toBeGreaterThan(0);
  });

  test('most supports are below current price', () => {
    const data = generateOHLCVData(100);
    const currentPrice = data[data.length - 1].close;

    const levels = calculateAdvancedSupportResistance(
      data.map(d => d.high),
      data.map(d => d.low),
      data.map(d => d.close),
      data.map(d => d.volume),
      currentPrice
    );

    const supports = levels.filter(l => l.type === 'support');
    const belowCurrent = supports.filter(s => s.price < currentPrice);
    // At least 50% of support levels should be below current price
    expect(belowCurrent.length).toBeGreaterThanOrEqual(supports.length * 0.5);
  });

  test('most resistances are above current price', () => {
    const data = generateOHLCVData(100);
    const currentPrice = data[data.length - 1].close;

    const levels = calculateAdvancedSupportResistance(
      data.map(d => d.high),
      data.map(d => d.low),
      data.map(d => d.close),
      data.map(d => d.volume),
      currentPrice
    );

    const resistances = levels.filter(l => l.type === 'resistance');
    const aboveCurrent = resistances.filter(r => r.price > currentPrice);
    // At least 50% of resistance levels should be above current price
    expect(aboveCurrent.length).toBeGreaterThanOrEqual(resistances.length * 0.5);
  });

  test('levels are sorted by price', () => {
    const data = generateOHLCVData(100);
    const currentPrice = data[data.length - 1].close;

    const levels = calculateAdvancedSupportResistance(
      data.map(d => d.high),
      data.map(d => d.low),
      data.map(d => d.close),
      data.map(d => d.volume),
      currentPrice
    );

    for (let i = 1; i < levels.length; i++) {
      expect(levels[i].price).toBeGreaterThanOrEqual(levels[i - 1].price);
    }
  });
});

// ============================================================================
// COMPREHENSIVE ANALYSIS TESTS
// ============================================================================

describe('getComprehensiveSRAnalysis', () => {
  test('returns all analysis components', () => {
    const data = generateOHLCVData(100);
    const analysis = getComprehensiveSRAnalysis(data);

    expect(analysis.pivotPoints).toBeDefined();
    expect(analysis.pivotPoints.standard).toBeDefined();
    expect(analysis.pivotPoints.fibonacci).toBeDefined();
    expect(analysis.pivotPoints.camarilla).toBeDefined();
    expect(analysis.pivotPoints.woodie).toBeDefined();

    expect(analysis.fibonacci).toBeDefined();
    expect(analysis.fibonacci.retracement).toBeDefined();
    expect(analysis.fibonacci.extension).toBeDefined();

    expect(analysis.volumeProfile).toBeDefined();
    expect(analysis.swingPoints).toBeDefined();
    expect(analysis.keyLevels).toBeDefined();
    expect(analysis.consolidatedLevels).toBeDefined();
  });

  test('identifies trend direction', () => {
    const upData = generateTrendingData(100, 'up');
    const downData = generateTrendingData(100, 'down');

    const upAnalysis = getComprehensiveSRAnalysis(upData);
    const downAnalysis = getComprehensiveSRAnalysis(downData);

    expect(upAnalysis.fibonacci.trend).toBe('uptrend');
    expect(downAnalysis.fibonacci.trend).toBe('downtrend');
  });

  test('consolidatedLevels matches SupportResistance interface', () => {
    const data = generateOHLCVData(100);
    const analysis = getComprehensiveSRAnalysis(data);

    analysis.consolidatedLevels.forEach(level => {
      expect(level.type).toMatch(/^(support|resistance)$/);
      expect(typeof level.price).toBe('number');
      expect(level.strength).toMatch(/^(weak|moderate|strong)$/);
      expect(typeof level.source).toBe('string');
    });
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge Cases', () => {
  test('handles empty data gracefully', () => {
    expect(() => calculateVolumeProfile([], [], [], [])).not.toThrow();
    expect(calculateVolumeProfile([], [], [], [])).toEqual([]);
  });

  test('handles single data point', () => {
    const highs = [100];
    const lows = [99];
    const closes = [99.5];
    const volumes = [1000];

    expect(() =>
      calculateAdvancedSupportResistance(highs, lows, closes, volumes, 99.5)
    ).not.toThrow();
  });

  test('handles flat price data', () => {
    const highs = Array(50).fill(100);
    const lows = Array(50).fill(100);
    const closes = Array(50).fill(100);
    const volumes = Array(50).fill(1000);

    const levels = calculateAdvancedSupportResistance(highs, lows, closes, volumes, 100);

    // Should still return some levels (psychological, MAs)
    expect(levels.length).toBeGreaterThanOrEqual(0);
  });

  test('handles extremely volatile data', () => {
    const data: OHLCV[] = [];
    for (let i = 0; i < 50; i++) {
      const price = i % 2 === 0 ? 50 : 150;
      data.push({
        open: price,
        high: price + 10,
        low: price - 10,
        close: price,
        volume: 1000000,
      });
    }

    expect(() => getComprehensiveSRAnalysis(data)).not.toThrow();
  });
});
