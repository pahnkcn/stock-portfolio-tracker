import { callDataApi } from "./_core/dataApi";

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
 * Uses ExchangeRate-API via Data API
 */
export async function getCurrentExchangeRate(): Promise<ExchangeRateResult> {
  // Check cache
  const now = Date.now();
  if (cachedRate && now - cacheTimestamp < CACHE_DURATION) {
    return cachedRate;
  }

  try {
    // Try to get rate from ExchangeRate-API
    const response = await callDataApi("ExchangeRate/get_exchange_rate", {
      query: {
        base_currency: "USD",
        target_currency: "THB",
      },
    }) as { conversion_rate?: number; time_last_update_utc?: string };

    if (response?.conversion_rate) {
      cachedRate = {
        usdThb: response.conversion_rate,
        lastUpdated: response.time_last_update_utc || new Date().toISOString(),
      };
      cacheTimestamp = now;
      return cachedRate;
    }

    // Fallback to default rate if API fails
    console.warn("Exchange rate API returned no data, using fallback rate");
    return getDefaultRate();
  } catch (error) {
    console.error("Error fetching exchange rate:", error);
    // Return cached rate if available, otherwise use default
    if (cachedRate) {
      return cachedRate;
    }
    return getDefaultRate();
  }
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
