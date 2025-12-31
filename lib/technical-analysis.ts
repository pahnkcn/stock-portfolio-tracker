/**
 * Technical Analysis Module
 *
 * This is the main entry point for all technical analysis functionality.
 * Use this module when API data for technical indicators is unavailable.
 *
 * FEATURES:
 * =========
 *
 * 1. TECHNICAL INDICATORS (professional-grade calculations):
 *    - RSI with divergence detection (Wilder's Method)
 *    - MACD with crossover and divergence signals
 *    - Stochastic Oscillator
 *    - Bollinger Bands with squeeze detection
 *    - ATR (Average True Range)
 *    - ADX (Average Directional Index) for trend strength
 *    - Ichimoku Cloud
 *    - Volume Analysis (OBV, VWAP)
 *    - Williams %R
 *    - CCI (Commodity Channel Index)
 *
 * 2. SUPPORT & RESISTANCE (multi-method approach):
 *    - Pivot Points (Standard, Fibonacci, Camarilla, Woodie)
 *    - Fibonacci Retracement & Extension
 *    - Volume Profile Analysis (POC, HVN, LVN)
 *    - Swing Point Detection
 *    - Price Clustering Algorithm
 *    - Psychological Round Numbers
 *    - Moving Average Dynamic S/R
 *
 * 3. INTERPRETATIONS:
 *    - Human-readable explanations for each indicator
 *    - Trading signals with confidence levels
 *    - Market condition assessment
 *    - Risk/Reward analysis
 *
 * USAGE:
 * ======
 *
 * ```typescript
 * import {
 *   calculateAllIndicators,
 *   calculateAdvancedSupportResistance,
 *   getComprehensiveInterpretation,
 *   OHLCV
 * } from '@/lib/technical-analysis';
 *
 * // Prepare your OHLCV data
 * const data: OHLCV[] = chartData.map(candle => ({
 *   open: candle.open,
 *   high: candle.high,
 *   low: candle.low,
 *   close: candle.close,
 *   volume: candle.volume,
 * }));
 *
 * // Get all technical indicators
 * const analysis = calculateAllIndicators(data);
 *
 * // Get human-readable interpretation
 * const interpretation = getComprehensiveInterpretation(
 *   analysis,
 *   currentPrice
 * );
 *
 * // Access specific values
 * console.log(analysis.indicators.rsi);
 * console.log(analysis.rsiAnalysis.divergence);
 * console.log(interpretation.overallSignal.action);
 * console.log(interpretation.summary);
 * ```
 */

// ============================================================================
// RE-EXPORTS FROM TECHNICAL INDICATORS
// ============================================================================

export {
  // Types
  type OHLCV,
  type IndicatorSignal,
  type RSIAnalysis,
  type MACDAnalysis,
  type StochasticAnalysis,
  type BollingerBandsAnalysis,
  type ADXAnalysis,
  type IchimokuAnalysis,
  type VolumeAnalysis,
  type ComprehensiveTechnicalAnalysis,

  // Core utilities
  calculateSMA,
  calculateSMASeries,
  calculateEMA,
  calculateEMASeries,
  calculateWilderSmoothing,
  calculateStandardDeviation,

  // Individual indicators
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

  // Analysis functions
  analyzeRSI,
  analyzeMACD,
  analyzeStochastic,
  analyzeBollingerBands,
  analyzeADX,
  analyzeIchimoku,
  analyzeVolume,

  // Main calculation function
  calculateAllIndicators,
  calculateBasicIndicators,
} from './technical-indicators';

// ============================================================================
// RE-EXPORTS FROM SUPPORT & RESISTANCE
// ============================================================================

export {
  // Types
  type PriceLevel,
  type PivotPoints,
  type FibonacciLevels,
  type VolumeProfileLevel,
  type SwingPoint,
  type ComprehensiveSRAnalysis,

  // Pivot Points
  calculateStandardPivots,
  calculateFibonacciPivots,
  calculateCamarillaPivots,
  calculateWoodiePivots,
  calculateDeMarkPivots,

  // Fibonacci
  findSwingPoints,
  calculateFibonacciRetracement,
  calculateFibonacciExtension,

  // Volume Profile
  calculateVolumeProfile,
  getVolumeProfileLevels,

  // Swing Points
  detectSwingPoints,
  swingPointsToLevels,

  // Clustering
  clusterPriceLevels,

  // Other levels
  getPsychologicalLevels,
  getMovingAverageLevels,

  // Consolidation
  consolidateLevels,

  // Main calculation functions
  calculateAdvancedSupportResistance,
  getComprehensiveSRAnalysis,
} from './support-resistance';

// ============================================================================
// RE-EXPORTS FROM INTERPRETATIONS
// ============================================================================

export {
  // Types
  type TradingSignal,
  type IndicatorInterpretation,
  type MarketCondition,
  type ComprehensiveInterpretation,

  // Individual interpretations
  interpretRSI,
  interpretMACD,
  interpretStochastic,
  interpretBollingerBands,
  interpretADX,
  interpretIchimoku,
  interpretVolume,

  // Market condition
  assessMarketCondition,

  // Trading signals
  generateTradingSignal,

  // Main interpretation function
  getComprehensiveInterpretation,

  // UI helpers
  getSignalColor,
  getActionColor,
  getActionLabel,
  getActionLabelThai,
} from './indicator-interpretations';

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

import { OHLCV, calculateAllIndicators } from './technical-indicators';
import { calculateAdvancedSupportResistance } from './support-resistance';
import { getComprehensiveInterpretation, ComprehensiveInterpretation } from './indicator-interpretations';

/**
 * Complete technical analysis with interpretation
 * This is the simplest way to get all analysis in one call
 */
export function getFullTechnicalAnalysis(data: OHLCV[]): ComprehensiveInterpretation | null {
  if (data.length < 30) {
    console.warn('Insufficient data for comprehensive analysis. Need at least 30 data points.');
    return null;
  }

  const currentPrice = data[data.length - 1].close;
  const analysis = calculateAllIndicators(data);

  return getComprehensiveInterpretation(analysis, currentPrice);
}

/**
 * Quick check for trading signal
 * Returns a simple recommendation without full analysis
 */
export function getQuickSignal(data: OHLCV[]): {
  action: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
  confidence: number;
  rsi: number;
  trend: 'bullish' | 'bearish' | 'neutral';
} {
  if (data.length < 30) {
    return { action: 'neutral', confidence: 0, rsi: 50, trend: 'neutral' };
  }

  const analysis = calculateAllIndicators(data);
  const currentPrice = data[data.length - 1].close;
  const interpretation = getComprehensiveInterpretation(analysis, currentPrice);

  return {
    action: interpretation.overallSignal.action,
    confidence: interpretation.overallSignal.confidence,
    rsi: analysis.indicators.rsi,
    trend: analysis.adx.trend.direction === 'sideways' ? 'neutral' : analysis.adx.trend.direction,
  };
}

/**
 * Get key levels for trading
 * Returns the most important support and resistance levels
 */
export function getKeyTradingLevels(data: OHLCV[]): {
  currentPrice: number;
  nearestSupport: number;
  nearestResistance: number;
  pivot: number;
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: number;
} {
  const currentPrice = data[data.length - 1].close;

  if (data.length < 10) {
    return {
      currentPrice,
      nearestSupport: currentPrice * 0.95,
      nearestResistance: currentPrice * 1.05,
      pivot: currentPrice,
      stopLoss: currentPrice * 0.97,
      takeProfit: currentPrice * 1.06,
      riskRewardRatio: 2,
    };
  }

  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  const closes = data.map(d => d.close);
  const volumes = data.map(d => d.volume);

  const levels = calculateAdvancedSupportResistance(highs, lows, closes, volumes, currentPrice);

  const supports = levels.filter(l => l.type === 'support').sort((a, b) => b.price - a.price);
  const resistances = levels.filter(l => l.type === 'resistance').sort((a, b) => a.price - b.price);

  const nearestSupport = supports[0]?.price || currentPrice * 0.95;
  const nearestResistance = resistances[0]?.price || currentPrice * 1.05;

  // Calculate pivot from previous day
  const prevHigh = highs[highs.length - 2] || highs[highs.length - 1];
  const prevLow = lows[lows.length - 2] || lows[lows.length - 1];
  const prevClose = closes[closes.length - 2] || closes[closes.length - 1];
  const pivot = (prevHigh + prevLow + prevClose) / 3;

  // Calculate ATR for stop loss
  const { calculateATR } = require('./technical-indicators');
  const atr = calculateATR(highs, lows, closes);

  const stopLoss = Math.max(nearestSupport - atr * 0.5, currentPrice - atr * 2);
  const takeProfit = nearestResistance;
  const risk = currentPrice - stopLoss;
  const reward = takeProfit - currentPrice;
  const riskRewardRatio = risk > 0 ? reward / risk : 0;

  return {
    currentPrice,
    nearestSupport,
    nearestResistance,
    pivot,
    stopLoss,
    takeProfit,
    riskRewardRatio,
  };
}

// ============================================================================
// USAGE EXAMPLES (Documentation)
// ============================================================================

/**
 * Example usage in a React component:
 *
 * ```tsx
 * import { useEffect, useState } from 'react';
 * import {
 *   getFullTechnicalAnalysis,
 *   getQuickSignal,
 *   getKeyTradingLevels,
 *   getActionLabelThai,
 *   getActionColor,
 *   OHLCV
 * } from '@/lib/technical-analysis';
 *
 * function TechnicalAnalysisView({ chartData }: { chartData: OHLCV[] }) {
 *   const [analysis, setAnalysis] = useState(null);
 *
 *   useEffect(() => {
 *     if (chartData.length >= 30) {
 *       const result = getFullTechnicalAnalysis(chartData);
 *       setAnalysis(result);
 *     }
 *   }, [chartData]);
 *
 *   if (!analysis) return <Text>Loading...</Text>;
 *
 *   return (
 *     <View>
 *       <View style={{ backgroundColor: getActionColor(analysis.overallSignal.action) }}>
 *         <Text>{getActionLabelThai(analysis.overallSignal.action)}</Text>
 *         <Text>Confidence: {analysis.overallSignal.confidence}%</Text>
 *       </View>
 *
 *       <Text>{analysis.summary}</Text>
 *
 *       {analysis.indicators.map(indicator => (
 *         <View key={indicator.indicator}>
 *           <Text>{indicator.indicator}: {indicator.value}</Text>
 *           <Text>{indicator.interpretation}</Text>
 *         </View>
 *       ))}
 *     </View>
 *   );
 * }
 * ```
 */
