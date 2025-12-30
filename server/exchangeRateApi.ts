export interface ExchangeRateResult {
  usdThb: number;
  lastUpdated: string;
}

export interface HistoricalRateResult {
  date: string;
  rate: number;
}

// Cache for exchange rate (1 hour)
let cachedRate: ExchangeRateResult | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

/**
 * Get current USD/THB exchange rate
 * Uses free exchangerate-api.com API (no API key required for basic use)
 */
export async function getCurrentExchangeRate(): Promise<ExchangeRateResult> {
  // Check cache
  const now = Date.now();
  if (cachedRate && now - cacheTimestamp < CACHE_DURATION) {
    return cachedRate;
  }

  // Try multiple free APIs in order of preference
  const apis = [
    fetchFromExchangeRateApi,
    fetchFromFloatRates,
  ];

  for (const fetchFn of apis) {
    try {
      const result = await fetchFn();
      if (result) {
        cachedRate = result;
        cacheTimestamp = now;
        return result;
      }
    } catch (error) {
      console.warn(`Exchange rate API failed:`, error);
    }
  }

  // Return cached rate if available, otherwise use default
  console.warn("All exchange rate APIs failed, using fallback rate");
  if (cachedRate) {
    return cachedRate;
  }
  return getDefaultRate();
}

/**
 * Fetch from exchangerate-api.com (free tier)
 */
async function fetchFromExchangeRateApi(): Promise<ExchangeRateResult | null> {
  const response = await fetch(
    "https://open.er-api.com/v6/latest/USD",
    { signal: AbortSignal.timeout(10000) }
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json() as {
    result?: string;
    rates?: Record<string, number>;
    time_last_update_utc?: string;
  };

  if (data?.result === "success" && data?.rates?.THB) {
    return {
      usdThb: data.rates.THB,
      lastUpdated: data.time_last_update_utc || new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Fetch from floatrates.com (backup free API)
 */
async function fetchFromFloatRates(): Promise<ExchangeRateResult | null> {
  const response = await fetch(
    "https://www.floatrates.com/daily/usd.json",
    { signal: AbortSignal.timeout(10000) }
  );

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json() as Record<string, {
    code?: string;
    rate?: number;
    date?: string;
  }>;

  if (data?.thb?.rate) {
    return {
      usdThb: data.thb.rate,
      lastUpdated: data.thb.date || new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Get default exchange rate (fallback)
 */
function getDefaultRate(): ExchangeRateResult {
  return {
    usdThb: 34.50, // Approximate rate as fallback
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Get historical exchange rate for a specific date
 * Note: This is a simplified implementation that returns current rate
 * In production, you would use a historical rates API
 */
export async function getHistoricalExchangeRate(date: string): Promise<number> {
  try {
    // For simplicity, we'll use the current rate
    // In production, you would call a historical rates API
    const currentRate = await getCurrentExchangeRate();
    return currentRate.usdThb;
  } catch (error) {
    console.error(`Error fetching historical rate for ${date}:`, error);
    return 34.50; // Fallback rate
  }
}

/**
 * Get exchange rate history for a date range
 */
export async function getExchangeRateHistory(
  startDate: string,
  endDate: string
): Promise<HistoricalRateResult[]> {
  // Simplified implementation - returns mock historical data
  // In production, you would fetch actual historical rates
  const history: HistoricalRateResult[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Generate approximate historical rates with some variation
  const baseRate = 34.50;
  let currentDate = new Date(start);
  
  while (currentDate <= end) {
    // Add some random variation (±2%)
    const variation = (Math.random() - 0.5) * 0.04 * baseRate;
    history.push({
      date: currentDate.toISOString().split('T')[0],
      rate: baseRate + variation,
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return history;
}

// Input schemas for tRPC validation
import { z } from "zod";

export const exchangeRateInputSchema = z.object({});

export const historicalRateInputSchema = z.object({
  date: z.string(),
});

export const rateHistoryInputSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
});
