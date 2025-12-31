/**
 * Indicator Interpretations Module
 *
 * Provides human-readable interpretations and trading signals
 * based on technical indicator values.
 */

import {
  RSIAnalysis,
  MACDAnalysis,
  StochasticAnalysis,
  BollingerBandsAnalysis,
  ADXAnalysis,
  IchimokuAnalysis,
  VolumeAnalysis,
  ComprehensiveTechnicalAnalysis,
} from './technical-indicators';
import { SupportResistance } from '../types';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface TradingSignal {
  action: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
  confidence: number; // 0-100
  reasons: string[];
  risks: string[];
  priceTargets?: {
    support: number;
    resistance: number;
  };
}

export interface IndicatorInterpretation {
  indicator: string;
  value: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  interpretation: string;
  actionable: string;
}

export interface MarketCondition {
  trend: 'strong_uptrend' | 'uptrend' | 'sideways' | 'downtrend' | 'strong_downtrend';
  volatility: 'high' | 'normal' | 'low';
  momentum: 'increasing' | 'stable' | 'decreasing';
  description: string;
}

export interface ComprehensiveInterpretation {
  overallSignal: TradingSignal;
  marketCondition: MarketCondition;
  indicators: IndicatorInterpretation[];
  keyLevels: {
    nearestSupport: number;
    nearestResistance: number;
    riskRewardRatio: number;
  };
  summary: string;
}

// ============================================================================
// RSI INTERPRETATION
// ============================================================================

export function interpretRSI(rsi: RSIAnalysis): IndicatorInterpretation {
  const value = rsi.value;
  let signal: 'bullish' | 'bearish' | 'neutral';
  let interpretation: string;
  let actionable: string;

  if (value > 80) {
    signal = 'bearish';
    interpretation = `RSI at ${value.toFixed(1)} indicates extreme overbought conditions. Historically, such levels often precede corrections or consolidation.`;
    actionable = 'Consider taking profits or tightening stop losses. Avoid adding new long positions.';
  } else if (value > 70) {
    signal = 'bearish';
    interpretation = `RSI at ${value.toFixed(1)} shows overbought territory. Momentum is strong but sustainability is questionable.`;
    actionable = 'Watch for bearish divergence or failure to make new highs.';
  } else if (value > 60) {
    signal = 'bullish';
    interpretation = `RSI at ${value.toFixed(1)} indicates healthy bullish momentum without overextension.`;
    actionable = 'Trend following strategies are appropriate. Look for pullbacks to add positions.';
  } else if (value > 40) {
    signal = 'neutral';
    interpretation = `RSI at ${value.toFixed(1)} suggests neutral momentum. Market is neither overbought nor oversold.`;
    actionable = 'Wait for clearer signals or trade range-bound strategies.';
  } else if (value > 30) {
    signal = 'bearish';
    interpretation = `RSI at ${value.toFixed(1)} indicates weakening momentum but not yet oversold.`;
    actionable = 'Avoid catching falling knives. Wait for reversal confirmation.';
  } else if (value > 20) {
    signal = 'bullish';
    interpretation = `RSI at ${value.toFixed(1)} shows oversold conditions. Potential bounce opportunity forming.`;
    actionable = 'Start watching for reversal patterns. Consider scaling into positions.';
  } else {
    signal = 'bullish';
    interpretation = `RSI at ${value.toFixed(1)} indicates extreme oversold conditions. Strong bounce potential.`;
    actionable = 'Look for bullish reversal candles as entry signals. Set stops below recent lows.';
  }

  // Add divergence information
  if (rsi.divergence === 'bullish') {
    interpretation += ' BULLISH DIVERGENCE detected - price making lower lows while RSI makes higher lows.';
    actionable = 'Strong reversal signal. Watch for confirmation with price action.';
    signal = 'bullish';
  } else if (rsi.divergence === 'bearish') {
    interpretation += ' BEARISH DIVERGENCE detected - price making higher highs while RSI makes lower highs.';
    actionable = 'Warning signal for longs. Consider reducing exposure.';
    signal = 'bearish';
  }

  return {
    indicator: 'RSI (14)',
    value: value.toFixed(2),
    signal,
    interpretation,
    actionable,
  };
}

// ============================================================================
// MACD INTERPRETATION
// ============================================================================

export function interpretMACD(macd: MACDAnalysis): IndicatorInterpretation {
  let signal: 'bullish' | 'bearish' | 'neutral';
  let interpretation: string;
  let actionable: string;

  const { macd: macdValue, histogram, crossover, trend, divergence } = macd;

  // Base interpretation on trend and histogram
  if (macdValue > 0 && histogram > 0) {
    signal = 'bullish';
    interpretation = `MACD Line (${macdValue.toFixed(4)}) is positive with expanding histogram (${histogram.toFixed(4)}). Strong bullish momentum.`;
    actionable = 'Trend is your friend. Look for pullbacks to support levels for entries.';
  } else if (macdValue > 0 && histogram < 0) {
    signal = 'neutral';
    interpretation = `MACD Line positive but histogram contracting. Momentum is weakening despite overall bullish bias.`;
    actionable = 'Caution for new longs. Existing positions may need tighter stops.';
  } else if (macdValue < 0 && histogram < 0) {
    signal = 'bearish';
    interpretation = `MACD Line (${macdValue.toFixed(4)}) is negative with expanding bearish histogram. Strong downward momentum.`;
    actionable = 'Avoid bottom fishing. Wait for stabilization signals.';
  } else if (macdValue < 0 && histogram > 0) {
    signal = 'neutral';
    interpretation = `MACD Line negative but histogram improving. Selling pressure may be exhausting.`;
    actionable = 'Early signs of potential reversal. Wait for MACD to cross above signal line.';
  } else {
    signal = 'neutral';
    interpretation = 'MACD is near the zero line indicating indecision.';
    actionable = 'Range-bound strategies may work best.';
  }

  // Crossover signals
  if (crossover === 'bullish') {
    signal = 'bullish';
    interpretation = 'BULLISH CROSSOVER: MACD just crossed above Signal line. ' + interpretation;
    actionable = 'Classic buy signal. Consider entering with stop below recent low.';
  } else if (crossover === 'bearish') {
    signal = 'bearish';
    interpretation = 'BEARISH CROSSOVER: MACD just crossed below Signal line. ' + interpretation;
    actionable = 'Classic sell signal. Consider reducing long exposure.';
  }

  // Divergence
  if (divergence !== 'none') {
    interpretation += ` ${divergence.toUpperCase()} DIVERGENCE present.`;
    signal = divergence;
  }

  return {
    indicator: 'MACD (12, 26, 9)',
    value: `${macdValue.toFixed(4)} / ${macd.signal.toFixed(4)}`,
    signal,
    interpretation,
    actionable,
  };
}

// ============================================================================
// STOCHASTIC INTERPRETATION
// ============================================================================

export function interpretStochastic(stoch: StochasticAnalysis): IndicatorInterpretation {
  const { k, d, crossover } = stoch;
  let signal: 'bullish' | 'bearish' | 'neutral';
  let interpretation: string;
  let actionable: string;

  if (k > 80 && d > 80) {
    signal = 'bearish';
    interpretation = `Stochastic %K(${k.toFixed(1)}) and %D(${d.toFixed(1)}) both in overbought territory.`;
    actionable = 'Wait for %K to cross below %D for sell signal. Avoid new longs.';
  } else if (k < 20 && d < 20) {
    signal = 'bullish';
    interpretation = `Stochastic %K(${k.toFixed(1)}) and %D(${d.toFixed(1)}) both in oversold territory.`;
    actionable = 'Watch for %K crossing above %D for buy signal.';
  } else if (k > d && k < 80) {
    signal = 'bullish';
    interpretation = `%K(${k.toFixed(1)}) above %D(${d.toFixed(1)}) with room to run before overbought.`;
    actionable = 'Momentum favors bulls. Ride the trend.';
  } else if (k < d && k > 20) {
    signal = 'bearish';
    interpretation = `%K(${k.toFixed(1)}) below %D(${d.toFixed(1)}) indicating bearish momentum.`;
    actionable = 'Avoid catching falling knives.';
  } else {
    signal = 'neutral';
    interpretation = `Stochastic showing mixed signals with %K at ${k.toFixed(1)}.`;
    actionable = 'Wait for clearer direction.';
  }

  if (crossover === 'bullish') {
    signal = 'bullish';
    interpretation += ' BULLISH CROSSOVER just occurred!';
    actionable = 'Buy signal triggered. Enter with defined risk.';
  } else if (crossover === 'bearish') {
    signal = 'bearish';
    interpretation += ' BEARISH CROSSOVER just occurred!';
    actionable = 'Sell signal triggered. Consider taking profits.';
  }

  return {
    indicator: 'Stochastic (14, 3)',
    value: `%K: ${k.toFixed(1)}, %D: ${d.toFixed(1)}`,
    signal,
    interpretation,
    actionable,
  };
}

// ============================================================================
// BOLLINGER BANDS INTERPRETATION
// ============================================================================

export function interpretBollingerBands(bb: BollingerBandsAnalysis): IndicatorInterpretation {
  const { upper, middle, lower, bandwidth, percentB, squeeze } = bb;
  let signal: 'bullish' | 'bearish' | 'neutral';
  let interpretation: string;
  let actionable: string;

  if (squeeze) {
    signal = 'neutral';
    interpretation = `Bollinger Band SQUEEZE detected! Bandwidth at ${bandwidth.toFixed(2)}% is very narrow.`;
    actionable = 'Major move incoming. Prepare for breakout in either direction. Set alerts above and below bands.';
  } else if (percentB > 1) {
    signal = 'bearish';
    interpretation = `Price trading above upper band (${percentB.toFixed(2)} %B). Extended but could indicate strong momentum.`;
    actionable = 'Caution - mean reversion likely. Tighten stops for longs.';
  } else if (percentB < 0) {
    signal = 'bullish';
    interpretation = `Price trading below lower band (${percentB.toFixed(2)} %B). Oversold but could indicate capitulation.`;
    actionable = 'Look for reversal confirmation before entering long.';
  } else if (percentB > 0.8) {
    signal = 'neutral';
    interpretation = `Price near upper band (${(percentB * 100).toFixed(0)}%). Testing resistance.`;
    actionable = 'Watch for rejection or breakout above band.';
  } else if (percentB < 0.2) {
    signal = 'neutral';
    interpretation = `Price near lower band (${(percentB * 100).toFixed(0)}%). Testing support.`;
    actionable = 'Watch for bounce or breakdown below band.';
  } else {
    signal = 'neutral';
    interpretation = `Price in middle of bands (${(percentB * 100).toFixed(0)}%). No extreme readings.`;
    actionable = 'Focus on other indicators for direction.';
  }

  return {
    indicator: 'Bollinger Bands (20, 2)',
    value: `Upper: ${upper.toFixed(2)}, Mid: ${middle.toFixed(2)}, Lower: ${lower.toFixed(2)}`,
    signal,
    interpretation,
    actionable,
  };
}

// ============================================================================
// ADX INTERPRETATION
// ============================================================================

export function interpretADX(adx: ADXAnalysis): IndicatorInterpretation {
  const { adx: adxValue, plusDI, minusDI, trend } = adx;
  let signal: 'bullish' | 'bearish' | 'neutral';
  let interpretation: string;
  let actionable: string;

  if (trend.strength === 'absent') {
    signal = 'neutral';
    interpretation = `ADX at ${adxValue.toFixed(1)} indicates NO TREND. Market is ranging.`;
    actionable = 'Use range-bound strategies. Buy support, sell resistance.';
  } else if (trend.strength === 'weak') {
    signal = 'neutral';
    interpretation = `ADX at ${adxValue.toFixed(1)} shows WEAK trend. Direction uncertain.`;
    actionable = 'Be cautious with trend-following strategies.';
  } else if (trend.strength === 'moderate') {
    if (trend.direction === 'bullish') {
      signal = 'bullish';
      interpretation = `ADX at ${adxValue.toFixed(1)} with +DI(${plusDI.toFixed(1)}) > -DI(${minusDI.toFixed(1)}). Moderate uptrend.`;
      actionable = 'Follow the trend. Buy dips to moving averages.';
    } else {
      signal = 'bearish';
      interpretation = `ADX at ${adxValue.toFixed(1)} with -DI(${minusDI.toFixed(1)}) > +DI(${plusDI.toFixed(1)}). Moderate downtrend.`;
      actionable = 'Avoid buying. Wait for trend exhaustion.';
    }
  } else {
    if (trend.direction === 'bullish') {
      signal = 'bullish';
      interpretation = `ADX at ${adxValue.toFixed(1)} indicates STRONG UPTREND! +DI dominating.`;
      actionable = 'Trend is powerful. Stay long, add on pullbacks.';
    } else {
      signal = 'bearish';
      interpretation = `ADX at ${adxValue.toFixed(1)} indicates STRONG DOWNTREND! -DI dominating.`;
      actionable = 'Powerful selling pressure. Do not fight the trend.';
    }
  }

  return {
    indicator: 'ADX (14)',
    value: `ADX: ${adxValue.toFixed(1)}, +DI: ${plusDI.toFixed(1)}, -DI: ${minusDI.toFixed(1)}`,
    signal,
    interpretation,
    actionable,
  };
}

// ============================================================================
// ICHIMOKU INTERPRETATION
// ============================================================================

export function interpretIchimoku(ichimoku: IchimokuAnalysis): IndicatorInterpretation {
  const { tenkanSen, kijunSen, senkouSpanA, senkouSpanB, cloudStatus, signal: ichSignal } = ichimoku;
  let signal: 'bullish' | 'bearish' | 'neutral';
  let interpretation: string;
  let actionable: string;

  if (cloudStatus === 'above' && tenkanSen > kijunSen && senkouSpanA > senkouSpanB) {
    signal = 'bullish';
    interpretation = 'STRONG BULLISH: Price above green cloud, TK cross positive.';
    actionable = 'All Ichimoku signals aligned bullish. Stay long with cloud as support.';
  } else if (cloudStatus === 'below' && tenkanSen < kijunSen && senkouSpanA < senkouSpanB) {
    signal = 'bearish';
    interpretation = 'STRONG BEARISH: Price below red cloud, TK cross negative.';
    actionable = 'All signals aligned bearish. Avoid longs.';
  } else if (cloudStatus === 'above') {
    signal = 'bullish';
    interpretation = 'Price above cloud indicates bullish bias.';
    actionable = 'Cloud acts as support. Buy bounces off cloud.';
  } else if (cloudStatus === 'below') {
    signal = 'bearish';
    interpretation = 'Price below cloud indicates bearish bias.';
    actionable = 'Cloud acts as resistance. Sell rallies to cloud.';
  } else {
    signal = 'neutral';
    interpretation = 'Price inside cloud - no clear direction.';
    actionable = 'Wait for price to exit cloud for clarity.';
  }

  // TK Cross signals
  if (tenkanSen > kijunSen && cloudStatus !== 'below') {
    interpretation += ' Tenkan above Kijun supports bulls.';
  } else if (tenkanSen < kijunSen && cloudStatus !== 'above') {
    interpretation += ' Tenkan below Kijun supports bears.';
  }

  return {
    indicator: 'Ichimoku Cloud',
    value: `TK: ${tenkanSen.toFixed(2)}, KJ: ${kijunSen.toFixed(2)}`,
    signal,
    interpretation,
    actionable,
  };
}

// ============================================================================
// VOLUME INTERPRETATION
// ============================================================================

export function interpretVolume(vol: VolumeAnalysis): IndicatorInterpretation {
  const { obv, obvTrend, vwap, volumeRatio, volumeSignal } = vol;
  let signal: 'bullish' | 'bearish' | 'neutral';
  let interpretation: string;
  let actionable: string;

  if (volumeSignal === 'high' && obvTrend === 'rising') {
    signal = 'bullish';
    interpretation = `Volume ${(volumeRatio * 100).toFixed(0)}% of average with rising OBV. Strong buying pressure.`;
    actionable = 'Institutional accumulation possible. Follow the money.';
  } else if (volumeSignal === 'high' && obvTrend === 'falling') {
    signal = 'bearish';
    interpretation = `Volume ${(volumeRatio * 100).toFixed(0)}% of average with falling OBV. Heavy selling.`;
    actionable = 'Distribution phase. Avoid longs.';
  } else if (volumeSignal === 'low') {
    signal = 'neutral';
    interpretation = `Volume ${(volumeRatio * 100).toFixed(0)}% of average. Low participation.`;
    actionable = 'Moves on low volume are less reliable. Wait for volume confirmation.';
  } else {
    signal = 'neutral';
    interpretation = `Normal volume with ${obvTrend} OBV trend.`;
    actionable = 'Volume confirms recent price action.';
  }

  return {
    indicator: 'Volume Analysis',
    value: `${(volumeRatio * 100).toFixed(0)}% of avg, VWAP: ${vwap.toFixed(2)}`,
    signal,
    interpretation,
    actionable,
  };
}

// ============================================================================
// OVERALL MARKET CONDITION
// ============================================================================

export function assessMarketCondition(analysis: ComprehensiveTechnicalAnalysis): MarketCondition {
  const { adx, bollingerBands, macdAnalysis, rsiAnalysis } = analysis;

  // Determine trend
  let trend: MarketCondition['trend'];
  if (adx.trend.strength === 'strong') {
    trend = adx.trend.direction === 'bullish' ? 'strong_uptrend' : 'strong_downtrend';
  } else if (adx.trend.strength === 'moderate') {
    trend = adx.trend.direction === 'bullish' ? 'uptrend' : 'downtrend';
  } else {
    trend = 'sideways';
  }

  // Determine volatility
  let volatility: MarketCondition['volatility'];
  if (bollingerBands.squeeze) {
    volatility = 'low';
  } else if (bollingerBands.bandwidth > 10) {
    volatility = 'high';
  } else {
    volatility = 'normal';
  }

  // Determine momentum
  let momentum: MarketCondition['momentum'];
  if (macdAnalysis.histogram > 0 && Math.abs(rsiAnalysis.value - 50) > 15) {
    momentum = macdAnalysis.trend === 'bullish' ? 'increasing' : 'decreasing';
  } else {
    momentum = 'stable';
  }

  // Generate description
  let description = '';
  if (trend === 'strong_uptrend') {
    description = 'Market in a strong uptrend with clear bullish momentum. ';
  } else if (trend === 'strong_downtrend') {
    description = 'Market in a strong downtrend with persistent selling pressure. ';
  } else if (trend === 'sideways') {
    description = 'Market is consolidating without clear direction. ';
  } else {
    description = `Market showing ${trend.replace('_', ' ')}. `;
  }

  if (volatility === 'high') {
    description += 'High volatility present - expect larger price swings. ';
  } else if (volatility === 'low') {
    description += 'Low volatility squeeze - breakout imminent. ';
  }

  if (momentum === 'increasing') {
    description += 'Momentum is accelerating.';
  } else if (momentum === 'decreasing') {
    description += 'Momentum is fading.';
  }

  return { trend, volatility, momentum, description };
}

// ============================================================================
// TRADING SIGNAL GENERATION
// ============================================================================

export function generateTradingSignal(
  analysis: ComprehensiveTechnicalAnalysis,
  currentPrice: number
): TradingSignal {
  const weights = {
    rsi: 15,
    macd: 20,
    stochastic: 10,
    bollinger: 10,
    adx: 15,
    ichimoku: 15,
    volume: 15,
  };

  let bullishScore = 0;
  let bearishScore = 0;
  const reasons: string[] = [];
  const risks: string[] = [];

  // RSI
  const rsiSignal = analysis.rsiAnalysis.signal.signal;
  if (rsiSignal === 'bullish') {
    bullishScore += weights.rsi;
    if (analysis.rsiAnalysis.divergence === 'bullish') {
      reasons.push('Bullish RSI divergence detected');
    }
    if (analysis.rsiAnalysis.zones.oversold) {
      reasons.push('RSI in oversold territory');
    }
  } else if (rsiSignal === 'bearish') {
    bearishScore += weights.rsi;
    if (analysis.rsiAnalysis.divergence === 'bearish') {
      risks.push('Bearish RSI divergence present');
    }
    if (analysis.rsiAnalysis.zones.overbought) {
      risks.push('RSI in overbought territory');
    }
  }

  // MACD
  if (analysis.macdAnalysis.trend === 'bullish') {
    bullishScore += weights.macd;
    if (analysis.macdAnalysis.crossover === 'bullish') {
      reasons.push('MACD bullish crossover');
    }
  } else if (analysis.macdAnalysis.trend === 'bearish') {
    bearishScore += weights.macd;
    if (analysis.macdAnalysis.crossover === 'bearish') {
      risks.push('MACD bearish crossover');
    }
  }

  // Stochastic
  if (analysis.stochastic.signal.signal === 'bullish') {
    bullishScore += weights.stochastic;
  } else if (analysis.stochastic.signal.signal === 'bearish') {
    bearishScore += weights.stochastic;
  }

  // Bollinger
  if (analysis.bollingerBands.signal.signal === 'bullish') {
    bullishScore += weights.bollinger;
    reasons.push('Price near lower Bollinger Band');
  } else if (analysis.bollingerBands.signal.signal === 'bearish') {
    bearishScore += weights.bollinger;
    risks.push('Price extended above upper Bollinger Band');
  }
  if (analysis.bollingerBands.squeeze) {
    reasons.push('Bollinger squeeze suggests imminent volatility expansion');
  }

  // ADX
  if (analysis.adx.trend.strength !== 'absent') {
    if (analysis.adx.trend.direction === 'bullish') {
      bullishScore += weights.adx;
      if (analysis.adx.trend.strength === 'strong') {
        reasons.push('Strong uptrend confirmed by ADX');
      }
    } else if (analysis.adx.trend.direction === 'bearish') {
      bearishScore += weights.adx;
      if (analysis.adx.trend.strength === 'strong') {
        risks.push('Strong downtrend confirmed by ADX');
      }
    }
  }

  // Ichimoku
  if (analysis.ichimoku.signal.signal === 'bullish') {
    bullishScore += weights.ichimoku;
    if (analysis.ichimoku.cloudStatus === 'above') {
      reasons.push('Price above Ichimoku cloud');
    }
  } else if (analysis.ichimoku.signal.signal === 'bearish') {
    bearishScore += weights.ichimoku;
    if (analysis.ichimoku.cloudStatus === 'below') {
      risks.push('Price below Ichimoku cloud');
    }
  }

  // Volume
  if (analysis.volume.volumeSignal === 'high') {
    if (analysis.volume.obvTrend === 'rising') {
      bullishScore += weights.volume;
      reasons.push('High volume with rising OBV indicates accumulation');
    } else if (analysis.volume.obvTrend === 'falling') {
      bearishScore += weights.volume;
      risks.push('High volume with falling OBV indicates distribution');
    }
  }

  // Calculate final signal
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const netScore = (bullishScore - bearishScore) / totalWeight;
  const confidence = Math.abs(netScore) * 100;

  let action: TradingSignal['action'];
  if (netScore > 0.4) {
    action = 'strong_buy';
  } else if (netScore > 0.15) {
    action = 'buy';
  } else if (netScore < -0.4) {
    action = 'strong_sell';
  } else if (netScore < -0.15) {
    action = 'sell';
  } else {
    action = 'neutral';
  }

  // Find nearest S/R levels
  const supports = analysis.supportResistance.filter(sr => sr.type === 'support');
  const resistances = analysis.supportResistance.filter(sr => sr.type === 'resistance');

  const nearestSupport = supports.length > 0
    ? supports.reduce((a, b) => Math.abs(b.price - currentPrice) < Math.abs(a.price - currentPrice) ? b : a).price
    : currentPrice * 0.95;

  const nearestResistance = resistances.length > 0
    ? resistances.reduce((a, b) => Math.abs(b.price - currentPrice) < Math.abs(a.price - currentPrice) ? b : a).price
    : currentPrice * 1.05;

  const riskRewardRatio = (nearestResistance - currentPrice) / (currentPrice - nearestSupport);

  return {
    action,
    confidence: Math.min(Math.round(confidence), 100),
    reasons: reasons.slice(0, 5),
    risks: risks.slice(0, 5),
    priceTargets: {
      support: nearestSupport,
      resistance: nearestResistance,
    },
  };
}

// ============================================================================
// COMPREHENSIVE INTERPRETATION
// ============================================================================

export function getComprehensiveInterpretation(
  analysis: ComprehensiveTechnicalAnalysis,
  currentPrice: number
): ComprehensiveInterpretation {
  const indicators: IndicatorInterpretation[] = [
    interpretRSI(analysis.rsiAnalysis),
    interpretMACD(analysis.macdAnalysis),
    interpretStochastic(analysis.stochastic),
    interpretBollingerBands(analysis.bollingerBands),
    interpretADX(analysis.adx),
    interpretIchimoku(analysis.ichimoku),
    interpretVolume(analysis.volume),
  ];

  const marketCondition = assessMarketCondition(analysis);
  const overallSignal = generateTradingSignal(analysis, currentPrice);

  // Generate summary
  const bullishCount = indicators.filter(i => i.signal === 'bullish').length;
  const bearishCount = indicators.filter(i => i.signal === 'bearish').length;

  let summary = '';
  if (overallSignal.action === 'strong_buy') {
    summary = `Strong buying opportunity. ${bullishCount}/${indicators.length} indicators bullish. `;
  } else if (overallSignal.action === 'buy') {
    summary = `Moderate bullish bias. ${bullishCount}/${indicators.length} indicators bullish. `;
  } else if (overallSignal.action === 'strong_sell') {
    summary = `Strong selling pressure. ${bearishCount}/${indicators.length} indicators bearish. `;
  } else if (overallSignal.action === 'sell') {
    summary = `Moderate bearish bias. ${bearishCount}/${indicators.length} indicators bearish. `;
  } else {
    summary = `Mixed signals - market undecided. ${bullishCount} bullish, ${bearishCount} bearish. `;
  }

  summary += marketCondition.description;

  if (overallSignal.priceTargets) {
    summary += ` Support at ${overallSignal.priceTargets.support.toFixed(2)}, resistance at ${overallSignal.priceTargets.resistance.toFixed(2)}.`;
  }

  return {
    overallSignal,
    marketCondition,
    indicators,
    keyLevels: {
      nearestSupport: overallSignal.priceTargets?.support || currentPrice * 0.95,
      nearestResistance: overallSignal.priceTargets?.resistance || currentPrice * 1.05,
      riskRewardRatio: overallSignal.priceTargets
        ? (overallSignal.priceTargets.resistance - currentPrice) / (currentPrice - overallSignal.priceTargets.support)
        : 1,
    },
    summary,
  };
}

// ============================================================================
// EXPORT HELPER FOR UI
// ============================================================================

export function getSignalColor(signal: 'bullish' | 'bearish' | 'neutral'): string {
  switch (signal) {
    case 'bullish':
      return '#22c55e'; // green
    case 'bearish':
      return '#ef4444'; // red
    case 'neutral':
      return '#6b7280'; // gray
  }
}

export function getActionColor(action: TradingSignal['action']): string {
  switch (action) {
    case 'strong_buy':
      return '#15803d'; // dark green
    case 'buy':
      return '#22c55e'; // green
    case 'strong_sell':
      return '#b91c1c'; // dark red
    case 'sell':
      return '#ef4444'; // red
    case 'neutral':
      return '#6b7280'; // gray
  }
}

export function getActionLabel(action: TradingSignal['action']): string {
  switch (action) {
    case 'strong_buy':
      return 'Strong Buy';
    case 'buy':
      return 'Buy';
    case 'strong_sell':
      return 'Strong Sell';
    case 'sell':
      return 'Sell';
    case 'neutral':
      return 'Neutral';
  }
}

export function getActionLabelThai(action: TradingSignal['action']): string {
  switch (action) {
    case 'strong_buy':
      return 'ซื้อแนะนำอย่างยิ่ง';
    case 'buy':
      return 'ซื้อ';
    case 'strong_sell':
      return 'ขายแนะนำอย่างยิ่ง';
    case 'sell':
      return 'ขาย';
    case 'neutral':
      return 'ถือ/รอ';
  }
}
