import { useEffect, useCallback, useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import type { StockQuote } from '@/types';

interface StockQuoteResult {
  symbol: string;
  companyName: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  volume: number;
  lastUpdated: string;
}

interface StockChartData {
  symbol: string;
  timestamps: number[];
  prices: {
    open: number[];
    high: number[];
    low: number[];
    close: number[];
    volume: number[];
  };
}

/**
 * Fetch stock quote directly from Yahoo Finance or Finnhub API
 */
async function fetchStockQuote(
  symbol: string,
  yahooApiKey?: string,
  finnhubApiKey?: string
): Promise<StockQuoteResult | null> {
  if (!yahooApiKey && !finnhubApiKey) {
    return null;
  }

  // Try Yahoo Finance first
  if (yahooApiKey) {
    try {
      const response = await fetch(
        `https://yahoo-finance15.p.rapidapi.com/api/v1/markets/stock/quotes?ticker=${symbol.toUpperCase()}`,
        {
          method: 'GET',
          headers: {
            'x-rapidapi-host': 'yahoo-finance15.p.rapidapi.com',
            'x-rapidapi-key': yahooApiKey,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();

        if (data?.body?.[0]) {
          const quote = data.body[0];
          const previousClose = quote.regularMarketPreviousClose || quote.regularMarketPrice;
          const change = quote.regularMarketChange || (quote.regularMarketPrice - previousClose);
          const changePercent = quote.regularMarketChangePercent || (previousClose > 0 ? (change / previousClose) * 100 : 0);

          return {
            symbol: quote.symbol,
            companyName: quote.longName || quote.shortName || quote.symbol,
            currentPrice: quote.regularMarketPrice,
            change,
            changePercent,
            open: quote.regularMarketOpen || previousClose,
            high: quote.regularMarketDayHigh || quote.regularMarketPrice,
            low: quote.regularMarketDayLow || quote.regularMarketPrice,
            previousClose,
            volume: quote.regularMarketVolume || 0,
            lastUpdated: new Date().toISOString(),
          };
        }
      }
    } catch (error) {
      console.warn('Yahoo Finance quote failed:', error);
    }
  }

  // Try Finnhub as fallback
  if (finnhubApiKey) {
    try {
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol.toUpperCase()}&token=${finnhubApiKey}`
      );

      if (response.ok) {
        const data = await response.json();

        if (data?.c && data.c > 0) {
          return {
            symbol: symbol.toUpperCase(),
            companyName: symbol.toUpperCase(),
            currentPrice: data.c,
            change: data.d || 0,
            changePercent: data.dp || 0,
            open: data.o || data.c,
            high: data.h || data.c,
            low: data.l || data.c,
            previousClose: data.pc || data.c,
            volume: 0,
            lastUpdated: new Date().toISOString(),
          };
        }
      }
    } catch (error) {
      console.warn('Finnhub quote failed:', error);
    }
  }

  return null;
}

/**
 * Convert period string to Unix timestamps for Finnhub API
 */
function getPeriodTimestamps(period: string): { from: number; to: number } {
  const now = Math.floor(Date.now() / 1000);
  const dayInSeconds = 86400;

  const periodMap: Record<string, number> = {
    '1d': 1 * dayInSeconds,
    '5d': 5 * dayInSeconds,
    '1mo': 30 * dayInSeconds,
    '3mo': 90 * dayInSeconds,
    '6mo': 180 * dayInSeconds,
    '1y': 365 * dayInSeconds,
    '2y': 730 * dayInSeconds,
    '5y': 1825 * dayInSeconds,
    'max': 3650 * dayInSeconds, // ~10 years
  };

  const seconds = periodMap[period] || periodMap['1y'];
  return {
    from: now - seconds,
    to: now,
  };
}

/**
 * Fetch stock chart data from Finnhub API
 * NOTE: Finnhub /stock/candle requires PREMIUM subscription!
 * Free tier users will get 403 Forbidden or no_data response.
 */
async function fetchFinnhubChart(
  symbol: string,
  finnhubApiKey: string,
  period: string = '1y'
): Promise<StockChartData | null> {
  try {
    const { from, to } = getPeriodTimestamps(period);

    // Finnhub candles API - resolution: D = daily
    // WARNING: This endpoint requires Finnhub Premium subscription
    const response = await fetch(
      `https://finnhub.io/api/v1/stock/candle?symbol=${symbol.toUpperCase()}&resolution=D&from=${from}&to=${to}&token=${finnhubApiKey}`
    );

    if (!response.ok) {
      if (response.status === 403 || response.status === 401) {
        console.warn(`Finnhub chart for ${symbol}: Premium subscription required (status ${response.status})`);
      } else {
        console.warn(`Finnhub chart for ${symbol}: HTTP ${response.status}`);
      }
      return null;
    }

    const data = await response.json();

    // Finnhub returns 's' = 'no_data' if no data available or access denied
    if (data.s === 'no_data' || !data.c || data.c.length === 0) {
      console.warn(`Finnhub chart for ${symbol}: No data available (status: ${data.s}). This may require Premium subscription.`);
      return null;
    }

    console.log(`Finnhub chart for ${symbol}: ${data.c.length} data points (status: ${data.s})`);

    return {
      symbol: symbol.toUpperCase(),
      timestamps: data.t || [],
      prices: {
        open: data.o || [],
        high: data.h || [],
        low: data.l || [],
        close: data.c || [],
        volume: data.v || [],
      },
    };
  } catch (error) {
    console.warn(`Finnhub chart failed for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch stock chart data from Yahoo Finance API (via RapidAPI)
 */
async function fetchYahooChart(
  symbol: string,
  yahooApiKey: string,
  period: string = '1y'
): Promise<StockChartData | null> {
  try {
    const response = await fetch(
      `https://yahoo-finance15.p.rapidapi.com/api/v1/markets/stock/history?symbol=${symbol.toUpperCase()}&interval=1d&diffandsplits=false&period=${period}`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'yahoo-finance15.p.rapidapi.com',
          'x-rapidapi-key': yahooApiKey,
        },
      }
    );

    if (!response.ok) {
      console.warn(`Yahoo chart for ${symbol}: HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data?.body) {
      console.warn(`Yahoo chart for ${symbol}: No body in response`);
      return null;
    }

    const items = Object.values(data.body) as any[];
    const timestamps: number[] = [];
    const prices = {
      open: [] as number[],
      high: [] as number[],
      low: [] as number[],
      close: [] as number[],
      volume: [] as number[],
    };

    items.forEach((item: any) => {
      if (item.date_utc) {
        timestamps.push(item.date_utc);
        prices.open.push(item.open || 0);
        prices.high.push(item.high || 0);
        prices.low.push(item.low || 0);
        prices.close.push(item.close || 0);
        prices.volume.push(item.volume || 0);
      }
    });

    if (prices.close.length === 0) {
      console.warn(`Yahoo chart for ${symbol}: No price data parsed from response`);
      return null;
    }

    console.log(`Yahoo chart for ${symbol}: ${prices.close.length} data points`);

    return {
      symbol: symbol.toUpperCase(),
      timestamps,
      prices,
    };
  } catch (error) {
    console.warn(`Yahoo chart failed for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch stock chart data - tries Yahoo Finance first, then Finnhub as fallback
 *
 * @param period - Time period: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | 'max'
 * For technical indicators, we need at least:
 * - RSI (14): 15+ data points
 * - MACD (26+9): 35+ data points
 * - EMA 200: 200+ data points
 * Recommended: '1y' (252 trading days) for comprehensive analysis
 *
 * NOTE: Finnhub /stock/candle requires PREMIUM subscription!
 * For free tier, only Yahoo Finance (RapidAPI) will work for chart data.
 */
async function fetchStockChart(
  symbol: string,
  yahooApiKey?: string,
  finnhubApiKey?: string,
  period: string = '1y'
): Promise<StockChartData | null> {
  console.log(`Fetching chart for ${symbol}, period: ${period}, Yahoo key: ${!!yahooApiKey}, Finnhub key: ${!!finnhubApiKey}`);

  // Try Yahoo Finance first (if API key available)
  if (yahooApiKey) {
    const yahooResult = await fetchYahooChart(symbol, yahooApiKey, period);
    if (yahooResult && yahooResult.prices.close.length > 0) {
      return yahooResult;
    }
  }

  // Try Finnhub as fallback (if API key available)
  // NOTE: Finnhub /stock/candle requires Premium - free tier will fail
  if (finnhubApiKey) {
    console.log(`Trying Finnhub for ${symbol} (note: requires Premium subscription for /stock/candle)`);
    const finnhubResult = await fetchFinnhubChart(symbol, finnhubApiKey, period);
    if (finnhubResult && finnhubResult.prices.close.length > 0) {
      return finnhubResult;
    }
  }

  // No data available
  if (!yahooApiKey && !finnhubApiKey) {
    console.warn(`No chart data for ${symbol}: No API keys configured`);
  } else if (!yahooApiKey && finnhubApiKey) {
    console.warn(`No chart data for ${symbol}: Finnhub free tier does not support /stock/candle. Configure Yahoo Finance API key for chart data.`);
  } else {
    console.warn(`No chart data available for ${symbol}`);
  }

  return null;
}

/**
 * Hook to fetch multiple stock quotes - calls API directly from client
 */
export function useStockQuotes() {
  const { state, dispatch } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Get unique symbols from holdings
  const symbols = useMemo(() =>
    [...new Set(state.holdings.filter(h => h.shares > 0).map((h) => h.symbol))],
    [state.holdings]
  );

  // Get API keys from settings
  const yahooApiKey = state.settings.apiKeys?.yahooFinance;
  const finnhubApiKey = state.settings.apiKeys?.finnhub;
  const hasApiKey = !!(yahooApiKey || finnhubApiKey);
  const hasSymbols = symbols.length > 0;

  // Manual refresh function
  const refresh = useCallback(async () => {
    if (!hasApiKey || !hasSymbols) {
      return null;
    }

    setIsFetching(true);
    setError(null);

    try {
      const quotes: Record<string, StockQuote> = {};

      // Fetch quotes in batches
      const batchSize = 5;
      for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        const promises = batch.map((symbol) =>
          fetchStockQuote(symbol, yahooApiKey, finnhubApiKey)
        );
        const results = await Promise.all(promises);

        results.forEach((result, index) => {
          if (result) {
            quotes[batch[index].toUpperCase()] = {
              symbol: result.symbol,
              currentPrice: result.currentPrice,
              change: result.change,
              changePercent: result.changePercent,
              open: result.open,
              high: result.high,
              low: result.low,
              previousClose: result.previousClose,
              volume: result.volume,
              lastUpdated: result.lastUpdated,
            };
          }
        });

        // Small delay between batches
        if (i + batchSize < symbols.length) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      dispatch({ type: 'SET_STOCK_QUOTES', payload: quotes });
      setLastUpdated(new Date().toISOString());
      return quotes;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch quotes'));
      return null;
    } finally {
      setIsFetching(false);
    }
  }, [symbols, yahooApiKey, finnhubApiKey, hasApiKey, hasSymbols, dispatch]);

  return {
    quotes: state.stockQuotes,
    isLoading,
    isFetching,
    error,
    refresh,
    hasApiKey,
    hasSymbols,
    lastUpdated,
  };
}

/**
 * Hook to fetch a single stock quote - calls API directly from client
 */
export function useStockQuote(symbol: string) {
  const { state } = useApp();
  const [quote, setQuote] = useState<StockQuoteResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const yahooApiKey = state.settings.apiKeys?.yahooFinance;
  const finnhubApiKey = state.settings.apiKeys?.finnhub;
  const hasApiKey = !!(yahooApiKey || finnhubApiKey);

  const refresh = useCallback(async () => {
    if (!hasApiKey || !symbol) {
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchStockQuote(symbol, yahooApiKey, finnhubApiKey);
      setQuote(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch quote'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [symbol, yahooApiKey, finnhubApiKey, hasApiKey]);

  return {
    quote,
    isLoading,
    error,
    refresh,
    hasApiKey,
  };
}

/**
 * Hook to fetch stock chart data - calls API directly from client
 *
 * For technical indicators to work properly, use:
 * - range: '1y' for full analysis (RSI, MACD, EMA200, Bollinger, etc.)
 * - range: '3mo' for basic analysis (RSI, MACD, EMA20/50)
 * - range: '1mo' may not have enough data for MACD
 */
export function useStockChart(
  symbol: string,
  interval: '1m' | '5m' | '15m' | '30m' | '1h' | '1d' | '1wk' | '1mo' = '1d',
  range: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | 'max' = '1y' // Changed default to 1y
) {
  const { state } = useApp();
  const [chart, setChart] = useState<StockChartData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const yahooApiKey = state.settings.apiKeys?.yahooFinance;
  const finnhubApiKey = state.settings.apiKeys?.finnhub;
  const hasApiKey = !!(yahooApiKey || finnhubApiKey);

  const refresh = useCallback(async () => {
    if (!hasApiKey || !symbol) {
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Pass the range/period parameter to fetch enough data for technical analysis
      // Uses Yahoo Finance first, Finnhub as fallback
      const result = await fetchStockChart(symbol, yahooApiKey, finnhubApiKey, range);
      setChart(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch chart'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [symbol, yahooApiKey, finnhubApiKey, hasApiKey, range]);

  return {
    chart,
    isLoading,
    error,
    refresh,
    hasApiKey,
  };
}
