/**
 * Advanced Technical Indicators Calculation Module
 *
 * This module provides professional-grade technical analysis calculations
 * based on established methodologies used by traders and financial analysts.
 *
 * All calculations follow industry-standard formulas and can be used
 * when API data is unavailable.
 */

import { TechnicalIndicators, SupportResistance } from '../types';
import { calculateAdvancedSupportResistance } from './support-resistance';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface OHLCV {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp?: number;
}

export interface IndicatorSignal {
  value: number;
  signal: 'bullish' | 'bearish' | 'neutral';
  strength: 'strong' | 'moderate' | 'weak';
  description: string;
}

export interface RSIAnalysis {
  value: number;
  signal: IndicatorSignal;
  divergence: 'bullish' | 'bearish' | 'none';
  zones: {
    overbought: boolean;
    oversold: boolean;
    neutral: boolean;
  };
}

export interface MACDAnalysis {
  macd: number;
  signal: number;
  histogram: number;
  crossover: 'bullish' | 'bearish' | 'none';
  trend: 'bullish' | 'bearish' | 'neutral';
  divergence: 'bullish' | 'bearish' | 'none';
}

export interface StochasticAnalysis {
  k: number;
  d: number;
  signal: IndicatorSignal;
  crossover: 'bullish' | 'bearish' | 'none';
}

export interface BollingerBandsAnalysis {
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
  percentB: number; // Position within bands (0-1)
  squeeze: boolean;
  signal: IndicatorSignal;
}

export interface ADXAnalysis {
  adx: number;
  plusDI: number;
  minusDI: number;
  trend: {
    strength: 'strong' | 'moderate' | 'weak' | 'absent';
    direction: 'bullish' | 'bearish' | 'sideways';
  };
}

export interface IchimokuAnalysis {
  tenkanSen: number;      // Conversion Line (9-period)
  kijunSen: number;       // Base Line (26-period)
  senkouSpanA: number;    // Leading Span A
  senkouSpanB: number;    // Leading Span B
  chikouSpan: number;     // Lagging Span
  cloudStatus: 'above' | 'below' | 'inside';
  signal: IndicatorSignal;
}

export interface VolumeAnalysis {
  obv: number;
  obvTrend: 'rising' | 'falling' | 'flat';
  vwap: number;
  volumeRatio: number; // Current volume / Average volume
  volumeSignal: 'high' | 'normal' | 'low';
}

export interface ComprehensiveTechnicalAnalysis {
  indicators: TechnicalIndicators;
  rsiAnalysis: RSIAnalysis;
  macdAnalysis: MACDAnalysis;
  stochastic: StochasticAnalysis;
  bollingerBands: BollingerBandsAnalysis;
  adx: ADXAnalysis;
  ichimoku: IchimokuAnalysis;
  volume: VolumeAnalysis;
  overallSignal: IndicatorSignal;
  supportResistance: SupportResistance[];
}

// ============================================================================
// CORE CALCULATION UTILITIES
// ============================================================================

/**
 * Calculate Simple Moving Average (SMA)
 */
export function calculateSMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] || 0;
  const slice = data.slice(-period);
  return slice.reduce((sum, val) => sum + val, 0) / period;
}

/**
 * Calculate SMA Series (returns array)
 */
export function calculateSMASeries(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(data[i]);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      result.push(slice.reduce((sum, val) => sum + val, 0) / period);
    }
  }
  return result;
}

/**
 * Calculate Exponential Moving Average (EMA)
 * Uses standard EMA formula with smoothing factor = 2 / (period + 1)
 */
export function calculateEMA(data: number[], period: number): number {
  if (data.length === 0) return 0;
  if (data.length < period) return data[data.length - 1];

  const multiplier = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((sum, val) => sum + val, 0) / period;

  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema;
  }

  return ema;
}

/**
 * Calculate EMA Series (returns array)
 */
export function calculateEMASeries(data: number[], period: number): number[] {
  if (data.length === 0) return [];
  if (data.length < period) return data.map(() => data[data.length - 1]);

  const multiplier = 2 / (period + 1);
  const result: number[] = [];

  let ema = data.slice(0, period).reduce((sum, val) => sum + val, 0) / period;

  for (let i = 0; i < period; i++) {
    result.push(ema);
  }

  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema;
    result.push(ema);
  }

  return result;
}

/**
 * Calculate Wilder's Smoothing (used in RSI, ATR, ADX)
 * Different from standard EMA - uses (1/period) instead of 2/(period+1)
 */
export function calculateWilderSmoothing(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] || 0;

  let smoothed = data.slice(0, period).reduce((sum, val) => sum + val, 0) / period;

  for (let i = period; i < data.length; i++) {
    smoothed = (smoothed * (period - 1) + data[i]) / period;
  }

  return smoothed;
}

/**
 * Calculate Standard Deviation
 */
export function calculateStandardDeviation(data: number[], period: number): number {
  if (data.length < period) return 0;

  const slice = data.slice(-period);
  const mean = slice.reduce((sum, val) => sum + val, 0) / period;
  const squaredDiffs = slice.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / period;

  return Math.sqrt(variance);
}

// ============================================================================
// RSI CALCULATION (Wilder's Method)
// ============================================================================

/**
 * Calculate RSI using Wilder's Smoothing Method
 * This is the industry-standard RSI calculation
 */
export function calculateRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50;

  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  let avgGain = 0;
  let avgLoss = 0;

  // First average using SMA
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }

  avgGain /= period;
  avgLoss /= period;

  // Apply Wilder's Smoothing
  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    if (change > 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/**
 * Calculate RSI Series for divergence detection
 */
export function calculateRSISeries(closes: number[], period: number = 14): number[] {
  if (closes.length < period + 1) return closes.map(() => 50);

  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  const rsiSeries: number[] = [];
  let avgGain = 0;
  let avgLoss = 0;

  // First average
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
    rsiSeries.push(50); // Fill initial values
  }

  avgGain /= period;
  avgLoss /= period;

  // First RSI
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsiSeries.push(100 - (100 / (1 + rs)));

  // Remaining RSI values
  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    if (change > 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
    }

    const rsValue = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsiSeries.push(100 - (100 / (1 + rsValue)));
  }

  return rsiSeries;
}

/**
 * Comprehensive RSI Analysis with divergence detection
 */
export function analyzeRSI(closes: number[], period: number = 14): RSIAnalysis {
  const rsi = calculateRSI(closes, period);
  const rsiSeries = calculateRSISeries(closes, period);

  // Detect divergence (compare last 20 periods)
  const divergence = detectRSIDivergence(closes, rsiSeries);

  // Determine signal
  let signal: IndicatorSignal['signal'] = 'neutral';
  let strength: IndicatorSignal['strength'] = 'weak';
  let description = '';

  if (rsi > 70) {
    signal = 'bearish';
    strength = rsi > 80 ? 'strong' : 'moderate';
    description = `Overbought (${rsi.toFixed(1)}) - potential reversal or pullback`;
  } else if (rsi < 30) {
    signal = 'bullish';
    strength = rsi < 20 ? 'strong' : 'moderate';
    description = `Oversold (${rsi.toFixed(1)}) - potential bounce`;
  } else if (rsi > 50) {
    signal = 'bullish';
    strength = 'weak';
    description = `Bullish momentum (${rsi.toFixed(1)})`;
  } else {
    signal = 'bearish';
    strength = 'weak';
    description = `Bearish momentum (${rsi.toFixed(1)})`;
  }

  // Divergence override
  if (divergence === 'bullish') {
    signal = 'bullish';
    strength = 'moderate';
    description = 'Bullish divergence detected - price making lower lows while RSI making higher lows';
  } else if (divergence === 'bearish') {
    signal = 'bearish';
    strength = 'moderate';
    description = 'Bearish divergence detected - price making higher highs while RSI making lower highs';
  }

  return {
    value: rsi,
    signal: { value: rsi, signal, strength, description },
    divergence,
    zones: {
      overbought: rsi > 70,
      oversold: rsi < 30,
      neutral: rsi >= 30 && rsi <= 70,
    },
  };
}

/**
 * Detect RSI Divergence
 */
function detectRSIDivergence(
  closes: number[],
  rsiSeries: number[],
  lookback: number = 20
): 'bullish' | 'bearish' | 'none' {
  if (closes.length < lookback || rsiSeries.length < lookback) return 'none';

  const recentCloses = closes.slice(-lookback);
  const recentRSI = rsiSeries.slice(-lookback);

  // Find local minima and maxima
  const priceMinIdx = recentCloses.indexOf(Math.min(...recentCloses));
  const priceMaxIdx = recentCloses.indexOf(Math.max(...recentCloses));
  const rsiMinIdx = recentRSI.indexOf(Math.min(...recentRSI));
  const rsiMaxIdx = recentRSI.indexOf(Math.max(...recentRSI));

  // Bullish divergence: price makes lower low, RSI makes higher low
  const currentPrice = recentCloses[recentCloses.length - 1];
  const previousLow = Math.min(...recentCloses.slice(0, -5));
  const currentRSI = recentRSI[recentRSI.length - 1];
  const previousRSILow = Math.min(...recentRSI.slice(0, -5));

  if (currentPrice < previousLow && currentRSI > previousRSILow && currentRSI < 40) {
    return 'bullish';
  }

  // Bearish divergence: price makes higher high, RSI makes lower high
  const previousHigh = Math.max(...recentCloses.slice(0, -5));
  const previousRSIHigh = Math.max(...recentRSI.slice(0, -5));

  if (currentPrice > previousHigh && currentRSI < previousRSIHigh && currentRSI > 60) {
    return 'bearish';
  }

  return 'none';
}

// ============================================================================
// MACD CALCULATION
// ============================================================================

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 * Standard settings: 12, 26, 9
 */
export function calculateMACD(
  closes: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macd: number; signal: number; histogram: number } {
  if (closes.length < slowPeriod + signalPeriod) {
    return { macd: 0, signal: 0, histogram: 0 };
  }

  const emaFast = calculateEMASeries(closes, fastPeriod);
  const emaSlow = calculateEMASeries(closes, slowPeriod);

  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    macdLine.push(emaFast[i] - emaSlow[i]);
  }

  const signalLine = calculateEMASeries(macdLine, signalPeriod);

  const macd = macdLine[macdLine.length - 1];
  const signal = signalLine[signalLine.length - 1];
  const histogram = macd - signal;

  return { macd, signal, histogram };
}

/**
 * Comprehensive MACD Analysis
 */
export function analyzeMACD(
  closes: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDAnalysis {
  const { macd, signal, histogram } = calculateMACD(closes, fastPeriod, slowPeriod, signalPeriod);

  // Calculate previous histogram for crossover detection
  const prevCloses = closes.slice(0, -1);
  const prevMACD = calculateMACD(prevCloses, fastPeriod, slowPeriod, signalPeriod);

  // Detect crossover
  let crossover: 'bullish' | 'bearish' | 'none' = 'none';
  if (prevMACD.histogram < 0 && histogram > 0) {
    crossover = 'bullish';
  } else if (prevMACD.histogram > 0 && histogram < 0) {
    crossover = 'bearish';
  }

  // Determine trend
  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (macd > 0 && histogram > 0) {
    trend = 'bullish';
  } else if (macd < 0 && histogram < 0) {
    trend = 'bearish';
  }

  // Detect divergence
  const divergence = detectMACDDivergence(closes, fastPeriod, slowPeriod, signalPeriod);

  return {
    macd,
    signal,
    histogram,
    crossover,
    trend,
    divergence,
  };
}

/**
 * Detect MACD Divergence
 */
function detectMACDDivergence(
  closes: number[],
  fastPeriod: number,
  slowPeriod: number,
  signalPeriod: number,
  lookback: number = 30
): 'bullish' | 'bearish' | 'none' {
  if (closes.length < lookback + slowPeriod + signalPeriod) return 'none';

  const macdSeries: number[] = [];
  for (let i = slowPeriod + signalPeriod; i <= closes.length; i++) {
    const slice = closes.slice(0, i);
    const { histogram } = calculateMACD(slice, fastPeriod, slowPeriod, signalPeriod);
    macdSeries.push(histogram);
  }

  const recentMACD = macdSeries.slice(-lookback);
  const recentCloses = closes.slice(-lookback);

  // Similar logic to RSI divergence
  const currentPrice = recentCloses[recentCloses.length - 1];
  const previousLow = Math.min(...recentCloses.slice(0, -5));
  const currentMACD = recentMACD[recentMACD.length - 1];
  const previousMACDLow = Math.min(...recentMACD.slice(0, -5));

  if (currentPrice < previousLow && currentMACD > previousMACDLow) {
    return 'bullish';
  }

  const previousHigh = Math.max(...recentCloses.slice(0, -5));
  const previousMACDHigh = Math.max(...recentMACD.slice(0, -5));

  if (currentPrice > previousHigh && currentMACD < previousMACDHigh) {
    return 'bearish';
  }

  return 'none';
}

// ============================================================================
// STOCHASTIC OSCILLATOR
// ============================================================================

/**
 * Calculate Stochastic Oscillator
 * %K = (Current Close - Lowest Low) / (Highest High - Lowest Low) * 100
 * %D = 3-period SMA of %K
 */
export function calculateStochastic(
  highs: number[],
  lows: number[],
  closes: number[],
  kPeriod: number = 14,
  dPeriod: number = 3
): { k: number; d: number } {
  if (closes.length < kPeriod + dPeriod) {
    return { k: 50, d: 50 };
  }

  const kValues: number[] = [];

  for (let i = kPeriod - 1; i < closes.length; i++) {
    const highestHigh = Math.max(...highs.slice(i - kPeriod + 1, i + 1));
    const lowestLow = Math.min(...lows.slice(i - kPeriod + 1, i + 1));
    const range = highestHigh - lowestLow;

    if (range === 0) {
      kValues.push(50);
    } else {
      kValues.push(((closes[i] - lowestLow) / range) * 100);
    }
  }

  const k = kValues[kValues.length - 1];
  const d = calculateSMA(kValues, dPeriod);

  return { k, d };
}

/**
 * Comprehensive Stochastic Analysis
 */
export function analyzeStochastic(
  highs: number[],
  lows: number[],
  closes: number[],
  kPeriod: number = 14,
  dPeriod: number = 3
): StochasticAnalysis {
  const { k, d } = calculateStochastic(highs, lows, closes, kPeriod, dPeriod);

  // Previous values for crossover
  const prevK = calculateStochastic(
    highs.slice(0, -1),
    lows.slice(0, -1),
    closes.slice(0, -1),
    kPeriod,
    dPeriod
  );

  let crossover: 'bullish' | 'bearish' | 'none' = 'none';
  if (prevK.k < prevK.d && k > d) {
    crossover = 'bullish';
  } else if (prevK.k > prevK.d && k < d) {
    crossover = 'bearish';
  }

  let signal: IndicatorSignal['signal'] = 'neutral';
  let strength: IndicatorSignal['strength'] = 'weak';
  let description = '';

  if (k > 80 && d > 80) {
    signal = 'bearish';
    strength = k > 90 ? 'strong' : 'moderate';
    description = 'Overbought territory - potential reversal';
  } else if (k < 20 && d < 20) {
    signal = 'bullish';
    strength = k < 10 ? 'strong' : 'moderate';
    description = 'Oversold territory - potential bounce';
  } else if (crossover === 'bullish' && k < 50) {
    signal = 'bullish';
    strength = 'moderate';
    description = 'Bullish crossover in lower half';
  } else if (crossover === 'bearish' && k > 50) {
    signal = 'bearish';
    strength = 'moderate';
    description = 'Bearish crossover in upper half';
  }

  return {
    k,
    d,
    signal: { value: k, signal, strength, description },
    crossover,
  };
}

// ============================================================================
// BOLLINGER BANDS
// ============================================================================

/**
 * Calculate Bollinger Bands
 * Middle = 20-period SMA
 * Upper = Middle + (2 * StdDev)
 * Lower = Middle - (2 * StdDev)
 */
export function calculateBollingerBands(
  closes: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
): { upper: number; middle: number; lower: number; bandwidth: number; percentB: number } {
  if (closes.length < period) {
    const price = closes[closes.length - 1] || 0;
    return { upper: price, middle: price, lower: price, bandwidth: 0, percentB: 0.5 };
  }

  const middle = calculateSMA(closes, period);
  const stdDev = calculateStandardDeviation(closes, period);

  const upper = middle + stdDevMultiplier * stdDev;
  const lower = middle - stdDevMultiplier * stdDev;
  const bandwidth = ((upper - lower) / middle) * 100;

  const currentClose = closes[closes.length - 1];
  const percentB = upper !== lower ? (currentClose - lower) / (upper - lower) : 0.5;

  return { upper, middle, lower, bandwidth, percentB };
}

/**
 * Comprehensive Bollinger Bands Analysis
 */
export function analyzeBollingerBands(
  closes: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
): BollingerBandsAnalysis {
  const { upper, middle, lower, bandwidth, percentB } = calculateBollingerBands(
    closes,
    period,
    stdDevMultiplier
  );

  // Calculate historical bandwidth for squeeze detection
  const bandwidthHistory: number[] = [];
  for (let i = period; i <= closes.length; i++) {
    const slice = closes.slice(0, i);
    const bb = calculateBollingerBands(slice, period, stdDevMultiplier);
    bandwidthHistory.push(bb.bandwidth);
  }

  // Squeeze: bandwidth at 6-month low (120 periods)
  const recentBandwidth = bandwidthHistory.slice(-120);
  const minBandwidth = Math.min(...recentBandwidth);
  const squeeze = bandwidth <= minBandwidth * 1.1;

  let signal: IndicatorSignal['signal'] = 'neutral';
  let strength: IndicatorSignal['strength'] = 'weak';
  let description = '';

  const currentClose = closes[closes.length - 1];

  if (currentClose > upper) {
    signal = 'bearish';
    strength = percentB > 1.2 ? 'strong' : 'moderate';
    description = 'Price above upper band - overbought/strong momentum';
  } else if (currentClose < lower) {
    signal = 'bullish';
    strength = percentB < -0.2 ? 'strong' : 'moderate';
    description = 'Price below lower band - oversold/potential bounce';
  } else if (squeeze) {
    signal = 'neutral';
    strength = 'moderate';
    description = 'Squeeze detected - potential breakout incoming';
  } else if (percentB > 0.8) {
    signal = 'bearish';
    strength = 'weak';
    description = 'Price near upper band';
  } else if (percentB < 0.2) {
    signal = 'bullish';
    strength = 'weak';
    description = 'Price near lower band';
  }

  return {
    upper,
    middle,
    lower,
    bandwidth,
    percentB,
    squeeze,
    signal: { value: percentB * 100, signal, strength, description },
  };
}

// ============================================================================
// ATR (Average True Range)
// ============================================================================

/**
 * Calculate ATR using Wilder's Smoothing
 */
export function calculateATR(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14
): number {
  if (highs.length < period + 1) return 0;

  const trueRanges: number[] = [];

  for (let i = 1; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    trueRanges.push(tr);
  }

  return calculateWilderSmoothing(trueRanges, period);
}

// ============================================================================
// ADX (Average Directional Index)
// ============================================================================

/**
 * Calculate ADX - measures trend strength
 * ADX > 25: Strong trend
 * ADX < 20: Weak/No trend
 */
export function calculateADX(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14
): { adx: number; plusDI: number; minusDI: number } {
  if (highs.length < period * 2) {
    return { adx: 0, plusDI: 0, minusDI: 0 };
  }

  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const tr: number[] = [];

  // Calculate +DM, -DM, and TR
  for (let i = 1; i < highs.length; i++) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];

    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);

    const trValue = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    tr.push(trValue);
  }

  // Smooth with Wilder's method
  const smoothedPlusDM = calculateWilderSmoothing(plusDM, period);
  const smoothedMinusDM = calculateWilderSmoothing(minusDM, period);
  const smoothedTR = calculateWilderSmoothing(tr, period);

  // Calculate +DI and -DI
  const plusDI = smoothedTR > 0 ? (smoothedPlusDM / smoothedTR) * 100 : 0;
  const minusDI = smoothedTR > 0 ? (smoothedMinusDM / smoothedTR) * 100 : 0;

  // Calculate DX series for ADX
  const dxSeries: number[] = [];
  let tempPlusDM = plusDM.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let tempMinusDM = minusDM.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let tempTR = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < plusDM.length; i++) {
    tempPlusDM = (tempPlusDM * (period - 1) + plusDM[i]) / period;
    tempMinusDM = (tempMinusDM * (period - 1) + minusDM[i]) / period;
    tempTR = (tempTR * (period - 1) + tr[i]) / period;

    const pdi = tempTR > 0 ? (tempPlusDM / tempTR) * 100 : 0;
    const mdi = tempTR > 0 ? (tempMinusDM / tempTR) * 100 : 0;
    const diSum = pdi + mdi;
    const dx = diSum > 0 ? (Math.abs(pdi - mdi) / diSum) * 100 : 0;
    dxSeries.push(dx);
  }

  // ADX is smoothed DX
  const adx = calculateWilderSmoothing(dxSeries, period);

  return { adx, plusDI, minusDI };
}

/**
 * Comprehensive ADX Analysis
 */
export function analyzeADX(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14
): ADXAnalysis {
  const { adx, plusDI, minusDI } = calculateADX(highs, lows, closes, period);

  let trendStrength: 'strong' | 'moderate' | 'weak' | 'absent';
  if (adx > 40) {
    trendStrength = 'strong';
  } else if (adx > 25) {
    trendStrength = 'moderate';
  } else if (adx > 20) {
    trendStrength = 'weak';
  } else {
    trendStrength = 'absent';
  }

  let direction: 'bullish' | 'bearish' | 'sideways';
  if (trendStrength === 'absent') {
    direction = 'sideways';
  } else if (plusDI > minusDI) {
    direction = 'bullish';
  } else {
    direction = 'bearish';
  }

  return {
    adx,
    plusDI,
    minusDI,
    trend: {
      strength: trendStrength,
      direction,
    },
  };
}

// ============================================================================
// ICHIMOKU CLOUD
// ============================================================================

/**
 * Calculate Ichimoku Cloud
 * Tenkan-sen (Conversion): (9-period high + 9-period low) / 2
 * Kijun-sen (Base): (26-period high + 26-period low) / 2
 * Senkou Span A: (Tenkan + Kijun) / 2, plotted 26 periods ahead
 * Senkou Span B: (52-period high + 52-period low) / 2, plotted 26 periods ahead
 * Chikou Span: Current close, plotted 26 periods behind
 */
export function calculateIchimoku(
  highs: number[],
  lows: number[],
  closes: number[],
  tenkanPeriod: number = 9,
  kijunPeriod: number = 26,
  senkouBPeriod: number = 52
): {
  tenkanSen: number;
  kijunSen: number;
  senkouSpanA: number;
  senkouSpanB: number;
  chikouSpan: number;
} {
  const minRequired = Math.max(tenkanPeriod, kijunPeriod, senkouBPeriod);
  const currentClose = closes[closes.length - 1] || 0;

  if (highs.length < minRequired) {
    return {
      tenkanSen: currentClose,
      kijunSen: currentClose,
      senkouSpanA: currentClose,
      senkouSpanB: currentClose,
      chikouSpan: currentClose,
    };
  }

  // Tenkan-sen (Conversion Line)
  const tenkanHighs = highs.slice(-tenkanPeriod);
  const tenkanLows = lows.slice(-tenkanPeriod);
  const tenkanSen = (Math.max(...tenkanHighs) + Math.min(...tenkanLows)) / 2;

  // Kijun-sen (Base Line)
  const kijunHighs = highs.slice(-kijunPeriod);
  const kijunLows = lows.slice(-kijunPeriod);
  const kijunSen = (Math.max(...kijunHighs) + Math.min(...kijunLows)) / 2;

  // Senkou Span A (Leading Span A)
  const senkouSpanA = (tenkanSen + kijunSen) / 2;

  // Senkou Span B (Leading Span B)
  const senkouBHighs = highs.slice(-senkouBPeriod);
  const senkouBLows = lows.slice(-senkouBPeriod);
  const senkouSpanB = (Math.max(...senkouBHighs) + Math.min(...senkouBLows)) / 2;

  // Chikou Span (Lagging Span) - current close
  const chikouSpan = currentClose;

  return { tenkanSen, kijunSen, senkouSpanA, senkouSpanB, chikouSpan };
}

/**
 * Comprehensive Ichimoku Analysis
 */
export function analyzeIchimoku(
  highs: number[],
  lows: number[],
  closes: number[]
): IchimokuAnalysis {
  const ichimoku = calculateIchimoku(highs, lows, closes);
  const currentClose = closes[closes.length - 1];

  const cloudTop = Math.max(ichimoku.senkouSpanA, ichimoku.senkouSpanB);
  const cloudBottom = Math.min(ichimoku.senkouSpanA, ichimoku.senkouSpanB);

  let cloudStatus: 'above' | 'below' | 'inside';
  if (currentClose > cloudTop) {
    cloudStatus = 'above';
  } else if (currentClose < cloudBottom) {
    cloudStatus = 'below';
  } else {
    cloudStatus = 'inside';
  }

  let signal: IndicatorSignal['signal'] = 'neutral';
  let strength: IndicatorSignal['strength'] = 'weak';
  let description = '';

  // Strong bullish: Price above cloud, Tenkan above Kijun, cloud is green (SpanA > SpanB)
  if (
    cloudStatus === 'above' &&
    ichimoku.tenkanSen > ichimoku.kijunSen &&
    ichimoku.senkouSpanA > ichimoku.senkouSpanB
  ) {
    signal = 'bullish';
    strength = 'strong';
    description = 'Strong bullish - price above bullish cloud, TK cross positive';
  }
  // Strong bearish: Price below cloud, Tenkan below Kijun, cloud is red
  else if (
    cloudStatus === 'below' &&
    ichimoku.tenkanSen < ichimoku.kijunSen &&
    ichimoku.senkouSpanA < ichimoku.senkouSpanB
  ) {
    signal = 'bearish';
    strength = 'strong';
    description = 'Strong bearish - price below bearish cloud, TK cross negative';
  }
  // Moderate signals
  else if (cloudStatus === 'above') {
    signal = 'bullish';
    strength = 'moderate';
    description = 'Bullish - price above cloud';
  } else if (cloudStatus === 'below') {
    signal = 'bearish';
    strength = 'moderate';
    description = 'Bearish - price below cloud';
  } else {
    signal = 'neutral';
    strength = 'weak';
    description = 'Neutral - price inside cloud, consolidation zone';
  }

  return {
    ...ichimoku,
    cloudStatus,
    signal: { value: 0, signal, strength, description },
  };
}

// ============================================================================
// VOLUME ANALYSIS
// ============================================================================

/**
 * Calculate OBV (On Balance Volume)
 */
export function calculateOBV(closes: number[], volumes: number[]): number {
  if (closes.length < 2) return volumes[volumes.length - 1] || 0;

  let obv = 0;
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) {
      obv += volumes[i];
    } else if (closes[i] < closes[i - 1]) {
      obv -= volumes[i];
    }
  }

  return obv;
}

/**
 * Calculate VWAP (Volume Weighted Average Price)
 */
export function calculateVWAP(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[]
): number {
  if (closes.length === 0) return 0;

  let cumulativeTPV = 0;
  let cumulativeVolume = 0;

  for (let i = 0; i < closes.length; i++) {
    const typicalPrice = (highs[i] + lows[i] + closes[i]) / 3;
    cumulativeTPV += typicalPrice * volumes[i];
    cumulativeVolume += volumes[i];
  }

  return cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : closes[closes.length - 1];
}

/**
 * Comprehensive Volume Analysis
 */
export function analyzeVolume(
  highs: number[],
  lows: number[],
  closes: number[],
  volumes: number[],
  avgVolumePeriod: number = 20
): VolumeAnalysis {
  const obv = calculateOBV(closes, volumes);
  const vwap = calculateVWAP(highs, lows, closes, volumes);

  // OBV trend
  const obvSeries: number[] = [];
  let tempObv = 0;
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) {
      tempObv += volumes[i];
    } else if (closes[i] < closes[i - 1]) {
      tempObv -= volumes[i];
    }
    obvSeries.push(tempObv);
  }

  const recentOBV = obvSeries.slice(-10);
  let obvTrend: 'rising' | 'falling' | 'flat' = 'flat';
  if (recentOBV.length >= 2) {
    const obvChange = recentOBV[recentOBV.length - 1] - recentOBV[0];
    const threshold = Math.abs(recentOBV[0]) * 0.05;
    if (obvChange > threshold) obvTrend = 'rising';
    else if (obvChange < -threshold) obvTrend = 'falling';
  }

  // Volume ratio
  const currentVolume = volumes[volumes.length - 1] || 0;
  const avgVolume = calculateSMA(volumes, avgVolumePeriod);
  const volumeRatio = avgVolume > 0 ? currentVolume / avgVolume : 1;

  let volumeSignal: 'high' | 'normal' | 'low' = 'normal';
  if (volumeRatio > 1.5) volumeSignal = 'high';
  else if (volumeRatio < 0.5) volumeSignal = 'low';

  return {
    obv,
    obvTrend,
    vwap,
    volumeRatio,
    volumeSignal,
  };
}

// ============================================================================
// WILLIAMS %R
// ============================================================================

/**
 * Calculate Williams %R
 * Similar to Stochastic but inverted: -100 to 0
 * > -20: Overbought
 * < -80: Oversold
 */
export function calculateWilliamsR(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14
): number {
  if (closes.length < period) return -50;

  const highestHigh = Math.max(...highs.slice(-period));
  const lowestLow = Math.min(...lows.slice(-period));
  const currentClose = closes[closes.length - 1];

  const range = highestHigh - lowestLow;
  if (range === 0) return -50;

  return ((highestHigh - currentClose) / range) * -100;
}

// ============================================================================
// CCI (Commodity Channel Index)
// ============================================================================

/**
 * Calculate CCI
 * Measures current price level relative to average price
 * > 100: Overbought
 * < -100: Oversold
 */
export function calculateCCI(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 20
): number {
  if (closes.length < period) return 0;

  // Calculate typical prices
  const typicalPrices: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    typicalPrices.push((highs[i] + lows[i] + closes[i]) / 3);
  }

  const currentTP = typicalPrices[typicalPrices.length - 1];
  const smaTP = calculateSMA(typicalPrices, period);

  // Mean deviation
  const recentTP = typicalPrices.slice(-period);
  const meanDeviation = recentTP.reduce((sum, tp) => sum + Math.abs(tp - smaTP), 0) / period;

  if (meanDeviation === 0) return 0;

  return (currentTP - smaTP) / (0.015 * meanDeviation);
}

// ============================================================================
// DEFAULT VALUES FOR MISSING DATA
// ============================================================================

/**
 * Returns default/neutral volume analysis when volume data is not available
 */
function getDefaultVolumeAnalysis(): VolumeAnalysis {
  return {
    obv: 0,
    obvTrend: 'flat',
    vwap: 0,
    volumeRatio: 1,
    volumeSignal: 'normal',
  };
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

/**
 * Calculate all technical indicators from OHLCV data
 * This is the main function to use when API data is unavailable
 *
 * NOTE: Volume is OPTIONAL. If not provided (0 or undefined),
 * volume-based indicators will use default/estimated values.
 */
export function calculateAllIndicators(data: OHLCV[]): ComprehensiveTechnicalAnalysis {
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  const closes = data.map(d => d.close);
  const volumes = data.map(d => d.volume || 0);

  // Check if volume data is available
  const hasVolumeData = volumes.some(v => v > 0);

  // Core indicators for TechnicalIndicators interface
  const rsi = calculateRSI(closes);
  const macd = calculateMACD(closes);
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  const ema200 = calculateEMA(closes, 200);
  const bb = calculateBollingerBands(closes);
  const atr = calculateATR(highs, lows, closes);
  const avgVolume = hasVolumeData ? calculateSMA(volumes, 20) : 0;

  const indicators: TechnicalIndicators = {
    rsi,
    macd: {
      macd: macd.macd,
      signal: macd.signal,
      histogram: macd.histogram,
    },
    ema20,
    ema50,
    ema200,
    bollingerBands: {
      upper: bb.upper,
      middle: bb.middle,
      lower: bb.lower,
    },
    atr,
    volume: volumes[volumes.length - 1] || 0,
    avgVolume,
  };

  // Comprehensive analysis
  const rsiAnalysis = analyzeRSI(closes);
  const macdAnalysis = analyzeMACD(closes);
  const stochastic = analyzeStochastic(highs, lows, closes);
  const bollingerBands = analyzeBollingerBands(closes);
  const adx = analyzeADX(highs, lows, closes);
  const ichimoku = analyzeIchimoku(highs, lows, closes);

  // Volume analysis (returns neutral if no volume data)
  const volume = hasVolumeData
    ? analyzeVolume(highs, lows, closes, volumes)
    : getDefaultVolumeAnalysis();

  // Calculate support and resistance
  const currentPrice = closes[closes.length - 1];
  const supportResistance = calculateAdvancedSupportResistance(
    highs,
    lows,
    closes,
    volumes,
    currentPrice
  );

  // Overall signal calculation
  const overallSignal = calculateOverallSignal(
    rsiAnalysis,
    macdAnalysis,
    stochastic,
    bollingerBands,
    adx,
    ichimoku
  );

  return {
    indicators,
    rsiAnalysis,
    macdAnalysis,
    stochastic,
    bollingerBands,
    adx,
    ichimoku,
    volume,
    overallSignal,
    supportResistance,
  };
}

/**
 * Calculate overall signal from all indicators
 */
function calculateOverallSignal(
  rsi: RSIAnalysis,
  macd: MACDAnalysis,
  stochastic: StochasticAnalysis,
  bb: BollingerBandsAnalysis,
  adx: ADXAnalysis,
  ichimoku: IchimokuAnalysis
): IndicatorSignal {
  const signals: Array<{ signal: 'bullish' | 'bearish' | 'neutral'; weight: number }> = [
    { signal: rsi.signal.signal, weight: 1.5 },
    { signal: macd.trend, weight: 2 },
    { signal: stochastic.signal.signal, weight: 1 },
    { signal: bb.signal.signal, weight: 1 },
    { signal: ichimoku.signal.signal, weight: 1.5 },
  ];

  // ADX weight adjustment based on trend strength
  const adxWeight = adx.trend.strength === 'strong' ? 2 : adx.trend.strength === 'moderate' ? 1.5 : 1;
  signals.push({ signal: adx.trend.direction === 'sideways' ? 'neutral' : adx.trend.direction, weight: adxWeight });

  let bullishScore = 0;
  let bearishScore = 0;
  let totalWeight = 0;

  signals.forEach(s => {
    totalWeight += s.weight;
    if (s.signal === 'bullish') bullishScore += s.weight;
    else if (s.signal === 'bearish') bearishScore += s.weight;
  });

  const netScore = (bullishScore - bearishScore) / totalWeight;

  let signal: IndicatorSignal['signal'];
  let strength: IndicatorSignal['strength'];

  if (netScore > 0.3) {
    signal = 'bullish';
    strength = netScore > 0.6 ? 'strong' : 'moderate';
  } else if (netScore < -0.3) {
    signal = 'bearish';
    strength = netScore < -0.6 ? 'strong' : 'moderate';
  } else {
    signal = 'neutral';
    strength = 'weak';
  }

  const description = generateOverallDescription(signal, strength, rsi, macd, adx);

  return { value: netScore * 100, signal, strength, description };
}

function generateOverallDescription(
  signal: IndicatorSignal['signal'],
  strength: IndicatorSignal['strength'],
  rsi: RSIAnalysis,
  macd: MACDAnalysis,
  adx: ADXAnalysis
): string {
  const parts: string[] = [];

  if (signal === 'bullish') {
    if (strength === 'strong') {
      parts.push('Strong bullish momentum');
    } else {
      parts.push('Moderate bullish bias');
    }
  } else if (signal === 'bearish') {
    if (strength === 'strong') {
      parts.push('Strong bearish momentum');
    } else {
      parts.push('Moderate bearish bias');
    }
  } else {
    parts.push('Neutral/Consolidating');
  }

  if (rsi.divergence !== 'none') {
    parts.push(`${rsi.divergence} RSI divergence`);
  }

  if (macd.crossover !== 'none') {
    parts.push(`MACD ${macd.crossover} crossover`);
  }

  if (adx.trend.strength === 'strong') {
    parts.push('strong trend');
  } else if (adx.trend.strength === 'absent') {
    parts.push('ranging market');
  }

  return parts.join(', ');
}

// ============================================================================
// EXPORT SIMPLIFIED CALCULATION FOR BASIC USE
// ============================================================================

/**
 * Simple function to calculate basic TechnicalIndicators
 * Use this when you only need the basic interface values
 */
export function calculateBasicIndicators(data: OHLCV[]): TechnicalIndicators {
  const result = calculateAllIndicators(data);
  return result.indicators;
}
