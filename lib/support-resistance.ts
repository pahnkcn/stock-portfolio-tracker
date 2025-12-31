/**
 * Advanced Support & Resistance Calculation Module
 *
 * This module provides professional-grade support and resistance level detection
 * using multiple established methodologies:
 *
 * 1. Pivot Points (Standard, Fibonacci, Camarilla, Woodie)
 * 2. Fibonacci Retracement & Extension
 * 3. Volume Profile Analysis
 * 4. Swing High/Low Detection
 * 5. Price Clustering Algorithm
 * 6. Multi-Timeframe Analysis
 * 7. Psychological Round Numbers
 * 8. Fractal-based Detection
 */

import { SupportResistance } from '../types';
import { calculateATR, calculateSMA, OHLCV } from './technical-indicators';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PriceLevel {
  price: number;
  type: 'support' | 'resistance';
  strength: 'weak' | 'moderate' | 'strong';
  source: string;
  touches: number;
  lastTouchIndex?: number;
  volumeAtLevel?: number;
}

export interface PivotPoints {
  pivot: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
  method: string;
}

export interface FibonacciLevels {
  level0: number;    // 0% (swing low or high)
  level236: number;  // 23.6%
  level382: number;  // 38.2%
  level500: number;  // 50%
  level618: number;  // 61.8% (Golden ratio)
  level786: number;  // 78.6%
  level1000: number; // 100%
  level1272: number; // 127.2% extension
  level1618: number; // 161.8% extension
}

export interface VolumeProfileLevel {
  price: number;
  volume: number;
  volumePercent: number;
  isPOC: boolean;  // Point of Control (highest volume)
  isHVN: boolean;  // High Volume Node
  isLVN: boolean;  // Low Volume Node
}

export interface SwingPoint {
  index: number;
  price: number;
  type: 'high' | 'low';
  strength: number;
}

export interface ComprehensiveSRAnalysis {
  pivotPoints: {
    standard: PivotPoints;
    fibonacci: PivotPoints;
    camarilla: PivotPoints;
    woodie: PivotPoints;
  };
  fibonacci: {
    retracement: FibonacciLevels;
    extension: FibonacciLevels;
    trend: 'uptrend' | 'downtrend';
  };
  volumeProfile: VolumeProfileLevel[];
  swingPoints: SwingPoint[];
  keyLevels: PriceLevel[];
  consolidatedLevels: SupportResistance[];
}

// ============================================================================
// PIVOT POINTS CALCULATIONS
// ============================================================================

/**
 * Standard Pivot Points (Floor Trader Pivots)
 * Most widely used pivot point system
 */
export function calculateStandardPivots(high: number, low: number, close: number): PivotPoints {
  const pivot = (high + low + close) / 3;

  return {
    pivot,
    r1: 2 * pivot - low,
    r2: pivot + (high - low),
    r3: high + 2 * (pivot - low),
    s1: 2 * pivot - high,
    s2: pivot - (high - low),
    s3: low - 2 * (high - pivot),
    method: 'Standard',
  };
}

/**
 * Fibonacci Pivot Points
 * Incorporates Fibonacci ratios for more precise levels
 */
export function calculateFibonacciPivots(high: number, low: number, close: number): PivotPoints {
  const pivot = (high + low + close) / 3;
  const range = high - low;

  return {
    pivot,
    r1: pivot + 0.382 * range,
    r2: pivot + 0.618 * range,
    r3: pivot + 1.000 * range,
    s1: pivot - 0.382 * range,
    s2: pivot - 0.618 * range,
    s3: pivot - 1.000 * range,
    method: 'Fibonacci',
  };
}

/**
 * Camarilla Pivot Points
 * Known for intraday trading with tighter levels
 * Good for range-bound markets
 */
export function calculateCamarillaPivots(high: number, low: number, close: number): PivotPoints {
  const range = high - low;

  return {
    pivot: (high + low + close) / 3,
    r1: close + range * 1.1 / 12,
    r2: close + range * 1.1 / 6,
    r3: close + range * 1.1 / 4,
    s1: close - range * 1.1 / 12,
    s2: close - range * 1.1 / 6,
    s3: close - range * 1.1 / 4,
    method: 'Camarilla',
  };
}

/**
 * Woodie Pivot Points
 * Gives more weight to the closing price
 */
export function calculateWoodiePivots(high: number, low: number, close: number): PivotPoints {
  const pivot = (high + low + 2 * close) / 4;

  return {
    pivot,
    r1: 2 * pivot - low,
    r2: pivot + (high - low),
    r3: high + 2 * (pivot - low),
    s1: 2 * pivot - high,
    s2: pivot - (high - low),
    s3: low - 2 * (high - pivot),
    method: 'Woodie',
  };
}

/**
 * DeMark Pivot Points
 * Uses opening price relationship for calculation
 */
export function calculateDeMarkPivots(
  open: number,
  high: number,
  low: number,
  close: number
): PivotPoints {
  let x: number;

  if (close < open) {
    x = high + 2 * low + close;
  } else if (close > open) {
    x = 2 * high + low + close;
  } else {
    x = high + low + 2 * close;
  }

  const pivot = x / 4;

  return {
    pivot,
    r1: x / 2 - low,
    r2: x / 2 - low + (high - low) * 0.5,
    r3: x / 2 - low + (high - low),
    s1: x / 2 - high,
    s2: x / 2 - high - (high - low) * 0.5,
    s3: x / 2 - high - (high - low),
    method: 'DeMark',
  };
}

// ============================================================================
// FIBONACCI CALCULATIONS
// ============================================================================

/**
 * Find swing high and low for Fibonacci calculation
 */
export function findSwingPoints(
  highs: number[],
  lows: number[],
  lookback: number = 50
): { swingHigh: number; swingHighIndex: number; swingLow: number; swingLowIndex: number } {
  const recentHighs = highs.slice(-lookback);
  const recentLows = lows.slice(-lookback);

  const swingHigh = Math.max(...recentHighs);
  const swingLow = Math.min(...recentLows);

  const swingHighIndex = recentHighs.lastIndexOf(swingHigh);
  const swingLowIndex = recentLows.lastIndexOf(swingLow);

  return { swingHigh, swingHighIndex, swingLow, swingLowIndex };
}

/**
 * Calculate Fibonacci Retracement Levels
 * Used when price is retracing against the trend
 */
export function calculateFibonacciRetracement(
  swingHigh: number,
  swingLow: number,
  isUptrend: boolean
): FibonacciLevels {
  const range = swingHigh - swingLow;

  if (isUptrend) {
    // Uptrend: retracement from high to low
    return {
      level0: swingHigh,
      level236: swingHigh - range * 0.236,
      level382: swingHigh - range * 0.382,
      level500: swingHigh - range * 0.500,
      level618: swingHigh - range * 0.618,
      level786: swingHigh - range * 0.786,
      level1000: swingLow,
      level1272: swingHigh - range * 1.272,
      level1618: swingHigh - range * 1.618,
    };
  } else {
    // Downtrend: retracement from low to high
    return {
      level0: swingLow,
      level236: swingLow + range * 0.236,
      level382: swingLow + range * 0.382,
      level500: swingLow + range * 0.500,
      level618: swingLow + range * 0.618,
      level786: swingLow + range * 0.786,
      level1000: swingHigh,
      level1272: swingLow + range * 1.272,
      level1618: swingLow + range * 1.618,
    };
  }
}

/**
 * Calculate Fibonacci Extension Levels
 * Used to project price targets beyond the swing range
 */
export function calculateFibonacciExtension(
  swingHigh: number,
  swingLow: number,
  isUptrend: boolean
): FibonacciLevels {
  const range = swingHigh - swingLow;

  if (isUptrend) {
    // Uptrend extensions above swing high
    return {
      level0: swingLow,
      level236: swingHigh + range * 0.236,
      level382: swingHigh + range * 0.382,
      level500: swingHigh + range * 0.500,
      level618: swingHigh + range * 0.618,
      level786: swingHigh + range * 0.786,
      level1000: swingHigh + range,
      level1272: swingHigh + range * 1.272,
      level1618: swingHigh + range * 1.618,
    };
  } else {
    // Downtrend extensions below swing low
    return {
      level0: swingHigh,
      level236: swingLow - range * 0.236,
      level382: swingLow - range * 0.382,
      level500: swingLow - range * 0.500,
      level618: swingLow - range * 0.618,
      level786: swingLow - range * 0.786,
      level1000: swingLow - range,
      level1272: swingLow - range * 1.272,
      level1618: swingLow - range * 1.618,
    };
  }
}

// ============================================================================
// VOLUME PROFILE ANALYSIS
// ============================================================================

/**
 * Calculate Volume Profile
 * Identifies price levels with high trading activity
 * POC (Point of Control) is the most significant S/R level
 */
export function calculateVolumeProfile(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[],
  numBins: number = 50
): VolumeProfileLevel[] {
  if (closes.length === 0) return [];

  const priceHigh = Math.max(...highs);
  const priceLow = Math.min(...lows);
  const binSize = (priceHigh - priceLow) / numBins;

  if (binSize === 0) return [];

  // Initialize bins
  const bins: { price: number; volume: number }[] = [];
  for (let i = 0; i < numBins; i++) {
    bins.push({
      price: priceLow + binSize * (i + 0.5),
      volume: 0,
    });
  }

  // Distribute volume across price bins
  for (let i = 0; i < closes.length; i++) {
    const avgPrice = (highs[i] + lows[i]) / 2;
    const binIndex = Math.min(
      Math.floor((avgPrice - priceLow) / binSize),
      numBins - 1
    );

    if (binIndex >= 0 && binIndex < numBins) {
      // Distribute volume proportionally based on candle range
      const candleRange = highs[i] - lows[i];
      const binsInCandle = Math.max(1, Math.ceil(candleRange / binSize));

      for (let j = 0; j < binsInCandle; j++) {
        const targetBin = binIndex + j;
        if (targetBin < numBins) {
          bins[targetBin].volume += volumes[i] / binsInCandle;
        }
      }
    }
  }

  // Calculate total volume and find POC
  const totalVolume = bins.reduce((sum, bin) => sum + bin.volume, 0);
  const maxVolume = Math.max(...bins.map(b => b.volume));
  const avgVolume = totalVolume / numBins;

  // Identify HVN and LVN
  return bins.map(bin => ({
    price: bin.price,
    volume: bin.volume,
    volumePercent: totalVolume > 0 ? (bin.volume / totalVolume) * 100 : 0,
    isPOC: bin.volume === maxVolume,
    isHVN: bin.volume > avgVolume * 1.5,  // High Volume Node
    isLVN: bin.volume < avgVolume * 0.5,   // Low Volume Node
  }));
}

/**
 * Get key Volume Profile levels for S/R
 */
export function getVolumeProfileLevels(
  volumeProfile: VolumeProfileLevel[],
  currentPrice: number
): PriceLevel[] {
  const levels: PriceLevel[] = [];

  // POC is the strongest S/R level
  const poc = volumeProfile.find(v => v.isPOC);
  if (poc) {
    levels.push({
      price: poc.price,
      type: poc.price < currentPrice ? 'support' : 'resistance',
      strength: 'strong',
      source: 'Volume POC',
      touches: Math.round(poc.volumePercent),
      volumeAtLevel: poc.volume,
    });
  }

  // HVN areas are strong S/R
  const hvnLevels = volumeProfile.filter(v => v.isHVN && !v.isPOC);
  hvnLevels.forEach(hvn => {
    levels.push({
      price: hvn.price,
      type: hvn.price < currentPrice ? 'support' : 'resistance',
      strength: 'moderate',
      source: 'Volume HVN',
      touches: Math.round(hvn.volumePercent),
      volumeAtLevel: hvn.volume,
    });
  });

  // LVN areas often act as rejection points
  const lvnLevels = volumeProfile
    .filter(v => v.isLVN)
    .filter(v => {
      // Only include LVN that are between HVN areas (price gaps)
      const nearbyHVN = hvnLevels.filter(
        h => Math.abs(h.price - v.price) < (Math.max(...volumeProfile.map(p => p.price)) - Math.min(...volumeProfile.map(p => p.price))) * 0.1
      );
      return nearbyHVN.length === 0;
    });

  lvnLevels.forEach(lvn => {
    levels.push({
      price: lvn.price,
      type: lvn.price < currentPrice ? 'support' : 'resistance',
      strength: 'weak',
      source: 'Volume LVN',
      touches: Math.round(lvn.volumePercent),
      volumeAtLevel: lvn.volume,
    });
  });

  return levels;
}

// ============================================================================
// SWING POINT DETECTION
// ============================================================================

/**
 * Detect swing highs and lows using fractal method
 * A swing high is when a bar has the highest high of N bars on each side
 * A swing low is when a bar has the lowest low of N bars on each side
 */
export function detectSwingPoints(
  highs: number[],
  lows: number[],
  leftBars: number = 5,
  rightBars: number = 5
): SwingPoint[] {
  const swingPoints: SwingPoint[] = [];

  for (let i = leftBars; i < highs.length - rightBars; i++) {
    // Check for swing high
    let isSwingHigh = true;
    for (let j = i - leftBars; j <= i + rightBars; j++) {
      if (j !== i && highs[j] >= highs[i]) {
        isSwingHigh = false;
        break;
      }
    }

    if (isSwingHigh) {
      // Calculate strength based on how much higher than neighbors
      const leftMax = Math.max(...highs.slice(i - leftBars, i));
      const rightMax = Math.max(...highs.slice(i + 1, i + rightBars + 1));
      const strength = ((highs[i] - leftMax) + (highs[i] - rightMax)) / 2;

      swingPoints.push({
        index: i,
        price: highs[i],
        type: 'high',
        strength,
      });
    }

    // Check for swing low
    let isSwingLow = true;
    for (let j = i - leftBars; j <= i + rightBars; j++) {
      if (j !== i && lows[j] <= lows[i]) {
        isSwingLow = false;
        break;
      }
    }

    if (isSwingLow) {
      const leftMin = Math.min(...lows.slice(i - leftBars, i));
      const rightMin = Math.min(...lows.slice(i + 1, i + rightBars + 1));
      const strength = ((leftMin - lows[i]) + (rightMin - lows[i])) / 2;

      swingPoints.push({
        index: i,
        price: lows[i],
        type: 'low',
        strength,
      });
    }
  }

  return swingPoints;
}

/**
 * Convert swing points to S/R levels
 */
export function swingPointsToLevels(
  swingPoints: SwingPoint[],
  currentPrice: number,
  tolerance: number = 0.02
): PriceLevel[] {
  // Group nearby swing points
  const clusters: { prices: number[]; types: string[]; totalStrength: number }[] = [];

  swingPoints.forEach(sp => {
    const existingCluster = clusters.find(
      c => Math.abs(c.prices[0] - sp.price) / sp.price < tolerance
    );

    if (existingCluster) {
      existingCluster.prices.push(sp.price);
      existingCluster.types.push(sp.type);
      existingCluster.totalStrength += sp.strength;
    } else {
      clusters.push({
        prices: [sp.price],
        types: [sp.type],
        totalStrength: sp.strength,
      });
    }
  });

  return clusters.map(cluster => {
    const avgPrice = cluster.prices.reduce((a, b) => a + b, 0) / cluster.prices.length;
    const touches = cluster.prices.length;

    let strength: 'weak' | 'moderate' | 'strong';
    if (touches >= 4) strength = 'strong';
    else if (touches >= 2) strength = 'moderate';
    else strength = 'weak';

    return {
      price: avgPrice,
      type: avgPrice < currentPrice ? 'support' : 'resistance',
      strength,
      source: 'Swing Points',
      touches,
    };
  });
}

// ============================================================================
// PRICE CLUSTERING ALGORITHM
// ============================================================================

/**
 * Advanced price clustering using DBSCAN-like algorithm
 * Groups similar price levels that have been tested multiple times
 */
export function clusterPriceLevels(
  highs: number[],
  lows: number[],
  closes: number[],
  tolerance: number = 0.015,
  minTouches: number = 3
): PriceLevel[] {
  // Collect all significant price points
  const pricePoints: number[] = [];

  // Add highs, lows, and closes
  highs.forEach(h => pricePoints.push(h));
  lows.forEach(l => pricePoints.push(l));

  // Add midpoints of large candles
  for (let i = 0; i < highs.length; i++) {
    const range = highs[i] - lows[i];
    const avgRange = (Math.max(...highs) - Math.min(...lows)) / highs.length;
    if (range > avgRange * 1.5) {
      pricePoints.push((highs[i] + lows[i]) / 2);
    }
  }

  // Cluster prices
  const avgPrice = closes[closes.length - 1];
  const clusterThreshold = avgPrice * tolerance;

  const clusters: { center: number; points: number[] }[] = [];

  pricePoints.forEach(price => {
    let foundCluster = false;

    for (const cluster of clusters) {
      if (Math.abs(price - cluster.center) < clusterThreshold) {
        cluster.points.push(price);
        // Update cluster center
        cluster.center = cluster.points.reduce((a, b) => a + b, 0) / cluster.points.length;
        foundCluster = true;
        break;
      }
    }

    if (!foundCluster) {
      clusters.push({ center: price, points: [price] });
    }
  });

  // Filter clusters with minimum touches and convert to levels
  const currentPrice = closes[closes.length - 1];

  return clusters
    .filter(c => c.points.length >= minTouches)
    .map(cluster => {
      const touches = cluster.points.length;
      let strength: 'weak' | 'moderate' | 'strong';

      if (touches >= 8) strength = 'strong';
      else if (touches >= 5) strength = 'moderate';
      else strength = 'weak';

      return {
        price: cluster.center,
        type: cluster.center < currentPrice ? 'support' : 'resistance',
        strength,
        source: 'Price Cluster',
        touches,
      };
    })
    .sort((a, b) => b.touches - a.touches);
}

// ============================================================================
// PSYCHOLOGICAL LEVELS
// ============================================================================

/**
 * Identify psychological round number levels
 * Traders often place orders at round numbers
 */
export function getPsychologicalLevels(
  currentPrice: number,
  range: number = 0.2 // 20% above and below
): PriceLevel[] {
  const levels: PriceLevel[] = [];

  // Determine the round number interval based on price magnitude
  let interval: number;
  if (currentPrice >= 1000) interval = 100;
  else if (currentPrice >= 100) interval = 10;
  else if (currentPrice >= 10) interval = 1;
  else if (currentPrice >= 1) interval = 0.5;
  else interval = 0.1;

  const lowerBound = currentPrice * (1 - range);
  const upperBound = currentPrice * (1 + range);

  // Find round numbers in range
  const startLevel = Math.ceil(lowerBound / interval) * interval;

  for (let level = startLevel; level <= upperBound; level += interval) {
    if (Math.abs(level - currentPrice) > interval * 0.1) {
      // Don't add level too close to current price
      levels.push({
        price: level,
        type: level < currentPrice ? 'support' : 'resistance',
        strength: 'weak',
        source: 'Psychological Level',
        touches: 0,
      });
    }
  }

  // Add half-levels for larger intervals (e.g., 50, 150, 250)
  if (interval >= 100) {
    for (let level = startLevel - interval / 2; level <= upperBound; level += interval) {
      if (level >= lowerBound && Math.abs(level - currentPrice) > interval * 0.05) {
        levels.push({
          price: level,
          type: level < currentPrice ? 'support' : 'resistance',
          strength: 'weak',
          source: 'Psychological Half-Level',
          touches: 0,
        });
      }
    }
  }

  return levels;
}

// ============================================================================
// MOVING AVERAGE AS DYNAMIC S/R
// ============================================================================

/**
 * Get moving averages as dynamic support/resistance
 */
export function getMovingAverageLevels(
  closes: number[],
  currentPrice: number
): PriceLevel[] {
  const levels: PriceLevel[] = [];
  const periods = [20, 50, 100, 200];

  periods.forEach(period => {
    if (closes.length >= period) {
      const ma = calculateSMA(closes, period);

      // Determine if MA is acting as support or resistance
      // Count how many times price has bounced off MA recently
      let bounces = 0;
      const recentCloses = closes.slice(-period);

      for (let i = 1; i < recentCloses.length; i++) {
        const maAtI = calculateSMA(closes.slice(0, closes.length - period + i), period);
        const crossAbove = recentCloses[i - 1] < maAtI && recentCloses[i] > maAtI;
        const crossBelow = recentCloses[i - 1] > maAtI && recentCloses[i] < maAtI;
        if (crossAbove || crossBelow) bounces++;
      }

      let strength: 'weak' | 'moderate' | 'strong';
      if (period === 200) strength = 'strong';
      else if (period >= 50) strength = 'moderate';
      else strength = 'weak';

      levels.push({
        price: ma,
        type: ma < currentPrice ? 'support' : 'resistance',
        strength,
        source: `SMA ${period}`,
        touches: bounces,
      });
    }
  });

  return levels;
}

// ============================================================================
// CONSOLIDATE ALL S/R LEVELS
// ============================================================================

/**
 * Merge and prioritize levels from all sources
 */
export function consolidateLevels(
  allLevels: PriceLevel[],
  currentPrice: number,
  tolerance: number = 0.01,
  maxLevels: number = 6
): SupportResistance[] {
  // Group nearby levels
  const mergedLevels: PriceLevel[] = [];

  // Sort by price
  const sortedLevels = [...allLevels].sort((a, b) => a.price - b.price);

  sortedLevels.forEach(level => {
    const existing = mergedLevels.find(
      m => Math.abs(m.price - level.price) / currentPrice < tolerance
    );

    if (existing) {
      // Merge: keep higher strength, accumulate touches
      if (strengthToNumber(level.strength) > strengthToNumber(existing.strength)) {
        existing.strength = level.strength;
      }
      existing.touches += level.touches;

      // Combine sources
      if (!existing.source.includes(level.source)) {
        existing.source += `, ${level.source}`;
      }

      // Average the prices
      existing.price = (existing.price + level.price) / 2;
    } else {
      mergedLevels.push({ ...level });
    }
  });

  // Score levels based on multiple factors
  const scoredLevels = mergedLevels.map(level => {
    let score = 0;

    // Strength score
    score += strengthToNumber(level.strength) * 30;

    // Touch count score
    score += Math.min(level.touches * 5, 25);

    // Proximity to current price (closer = more relevant)
    const distance = Math.abs(level.price - currentPrice) / currentPrice;
    score += Math.max(0, 20 - distance * 100);

    // Multiple source confirmation
    const sourceCount = level.source.split(',').length;
    score += sourceCount * 10;

    return { ...level, score };
  });

  // Sort by score and take top levels
  scoredLevels.sort((a, b) => b.score - a.score);

  // Separate support and resistance
  const supports = scoredLevels
    .filter(l => l.price < currentPrice)
    .slice(0, maxLevels / 2);

  const resistances = scoredLevels
    .filter(l => l.price > currentPrice)
    .slice(0, maxLevels / 2);

  // Convert to SupportResistance interface
  return [...supports, ...resistances]
    .map(level => ({
      type: level.type,
      price: level.price,
      strength: level.strength,
      source: level.source,
    }))
    .sort((a, b) => a.price - b.price);
}

function strengthToNumber(strength: 'weak' | 'moderate' | 'strong'): number {
  switch (strength) {
    case 'strong':
      return 3;
    case 'moderate':
      return 2;
    case 'weak':
      return 1;
    default:
      return 0;
  }
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

/**
 * Calculate comprehensive Support & Resistance analysis
 * This is the main function to use when API data is unavailable
 *
 * NOTE: Volume is OPTIONAL. Pass empty array [] or array of zeros
 * if volume data is not available. Volume Profile will be skipped,
 * but all other methods will still work.
 */
export function calculateAdvancedSupportResistance(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[] = [], // Optional - can be empty
  currentPrice: number
): SupportResistance[] {
  // Get the previous day's OHLC for pivot calculations
  const prevHigh = highs[highs.length - 2] || highs[highs.length - 1];
  const prevLow = lows[lows.length - 2] || lows[lows.length - 1];
  const prevClose = closes[closes.length - 2] || closes[closes.length - 1];

  const allLevels: PriceLevel[] = [];

  // 1. Pivot Points (all methods)
  const standardPivots = calculateStandardPivots(prevHigh, prevLow, prevClose);
  const fibPivots = calculateFibonacciPivots(prevHigh, prevLow, prevClose);

  // Add pivot levels
  addPivotLevels(allLevels, standardPivots, currentPrice);
  addPivotLevels(allLevels, fibPivots, currentPrice);

  // 2. Fibonacci Levels
  const { swingHigh, swingHighIndex, swingLow, swingLowIndex } = findSwingPoints(highs, lows);
  const isUptrend = swingLowIndex < swingHighIndex;

  const fibRetracement = calculateFibonacciRetracement(swingHigh, swingLow, isUptrend);
  addFibonacciLevels(allLevels, fibRetracement, currentPrice, 'Fib Retracement');

  // 3. Volume Profile
  if (volumes.length > 0 && volumes.some(v => v > 0)) {
    const volumeProfile = calculateVolumeProfile(highs, lows, closes, volumes);
    const vpLevels = getVolumeProfileLevels(volumeProfile, currentPrice);
    allLevels.push(...vpLevels);
  }

  // 4. Swing Points
  const swingPoints = detectSwingPoints(highs, lows);
  const swingLevels = swingPointsToLevels(swingPoints, currentPrice);
  allLevels.push(...swingLevels);

  // 5. Price Clusters
  const clusterLevels = clusterPriceLevels(highs, lows, closes);
  allLevels.push(...clusterLevels);

  // 6. Psychological Levels
  const psychLevels = getPsychologicalLevels(currentPrice);
  allLevels.push(...psychLevels);

  // 7. Moving Average Levels
  const maLevels = getMovingAverageLevels(closes, currentPrice);
  allLevels.push(...maLevels);

  // Consolidate and return top levels
  return consolidateLevels(allLevels, currentPrice);
}

/**
 * Helper to add pivot levels to the collection
 */
function addPivotLevels(
  levels: PriceLevel[],
  pivots: PivotPoints,
  currentPrice: number
): void {
  const method = pivots.method;

  levels.push(
    {
      price: pivots.pivot,
      type: pivots.pivot < currentPrice ? 'support' : 'resistance',
      strength: 'moderate',
      source: `${method} Pivot`,
      touches: 0,
    },
    {
      price: pivots.r1,
      type: 'resistance',
      strength: 'moderate',
      source: `${method} R1`,
      touches: 0,
    },
    {
      price: pivots.r2,
      type: 'resistance',
      strength: 'weak',
      source: `${method} R2`,
      touches: 0,
    },
    {
      price: pivots.s1,
      type: 'support',
      strength: 'moderate',
      source: `${method} S1`,
      touches: 0,
    },
    {
      price: pivots.s2,
      type: 'support',
      strength: 'weak',
      source: `${method} S2`,
      touches: 0,
    }
  );
}

/**
 * Helper to add Fibonacci levels to the collection
 */
function addFibonacciLevels(
  levels: PriceLevel[],
  fib: FibonacciLevels,
  currentPrice: number,
  sourcePrefix: string
): void {
  const fibLevels = [
    { price: fib.level236, name: '23.6%', strength: 'weak' as const },
    { price: fib.level382, name: '38.2%', strength: 'moderate' as const },
    { price: fib.level500, name: '50%', strength: 'moderate' as const },
    { price: fib.level618, name: '61.8%', strength: 'strong' as const },
    { price: fib.level786, name: '78.6%', strength: 'weak' as const },
  ];

  fibLevels.forEach(fl => {
    levels.push({
      price: fl.price,
      type: fl.price < currentPrice ? 'support' : 'resistance',
      strength: fl.strength,
      source: `${sourcePrefix} ${fl.name}`,
      touches: 0,
    });
  });
}

// ============================================================================
// FULL ANALYSIS EXPORT
// ============================================================================

/**
 * Get complete S/R analysis with all methodologies
 */
export function getComprehensiveSRAnalysis(data: OHLCV[]): ComprehensiveSRAnalysis {
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  const closes = data.map(d => d.close);
  const opens = data.map(d => d.open);
  const volumes = data.map(d => d.volume);

  const currentPrice = closes[closes.length - 1];
  const prevHigh = highs[highs.length - 2] || highs[highs.length - 1];
  const prevLow = lows[lows.length - 2] || lows[lows.length - 1];
  const prevClose = closes[closes.length - 2] || closes[closes.length - 1];
  const prevOpen = opens[opens.length - 2] || opens[opens.length - 1];

  // Pivot Points
  const pivotPoints = {
    standard: calculateStandardPivots(prevHigh, prevLow, prevClose),
    fibonacci: calculateFibonacciPivots(prevHigh, prevLow, prevClose),
    camarilla: calculateCamarillaPivots(prevHigh, prevLow, prevClose),
    woodie: calculateWoodiePivots(prevHigh, prevLow, prevClose),
  };

  // Fibonacci
  const { swingHigh, swingHighIndex, swingLow, swingLowIndex } = findSwingPoints(highs, lows);
  const isUptrend = swingLowIndex < swingHighIndex;

  const fibonacci = {
    retracement: calculateFibonacciRetracement(swingHigh, swingLow, isUptrend),
    extension: calculateFibonacciExtension(swingHigh, swingLow, isUptrend),
    trend: isUptrend ? 'uptrend' as const : 'downtrend' as const,
  };

  // Volume Profile
  const volumeProfile = calculateVolumeProfile(highs, lows, closes, volumes);

  // Swing Points
  const swingPoints = detectSwingPoints(highs, lows);

  // Collect all levels
  const allLevels: PriceLevel[] = [];
  addPivotLevels(allLevels, pivotPoints.standard, currentPrice);
  addPivotLevels(allLevels, pivotPoints.fibonacci, currentPrice);
  addFibonacciLevels(allLevels, fibonacci.retracement, currentPrice, 'Fib Retracement');
  allLevels.push(...getVolumeProfileLevels(volumeProfile, currentPrice));
  allLevels.push(...swingPointsToLevels(swingPoints, currentPrice));
  allLevels.push(...clusterPriceLevels(highs, lows, closes));
  allLevels.push(...getPsychologicalLevels(currentPrice));
  allLevels.push(...getMovingAverageLevels(closes, currentPrice));

  // Consolidated levels
  const consolidatedLevels = consolidateLevels(allLevels, currentPrice);

  return {
    pivotPoints,
    fibonacci,
    volumeProfile,
    swingPoints,
    keyLevels: allLevels,
    consolidatedLevels,
  };
}
