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
 * Fetch stock chart data directly from Yahoo Finance API
 */
async function fetchStockChart(
  symbol: string,
  yahooApiKey?: string
): Promise<StockChartData | null> {
  if (!yahooApiKey) {
    return null;
  }

  try {
    const response = await fetch(
      `https://yahoo-finance15.p.rapidapi.com/api/v1/markets/stock/history?symbol=${symbol.toUpperCase()}&interval=1d&diffandsplits=false`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'yahoo-finance15.p.rapidapi.com',
          'x-rapidapi-key': yahooApiKey,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data?.body) {
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

    return {
      symbol: symbol.toUpperCase(),
      timestamps,
      prices,
    };
  } catch (error) {
    console.error(`Error fetching chart for ${symbol}:`, error);
    return null;
  }
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
 */
export function useStockChart(
  symbol: string,
  interval: '1m' | '5m' | '15m' | '30m' | '1h' | '1d' | '1wk' | '1mo' = '1d',
  range: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | 'max' = '1mo'
) {
  const { state } = useApp();
  const [chart, setChart] = useState<StockChartData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const yahooApiKey = state.settings.apiKeys?.yahooFinance;
  const hasApiKey = !!yahooApiKey;

  const refresh = useCallback(async () => {
    if (!hasApiKey || !symbol) {
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchStockChart(symbol, yahooApiKey);
      setChart(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch chart'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [symbol, yahooApiKey, hasApiKey]);

  return {
    chart,
    isLoading,
    error,
    refresh,
    hasApiKey,
  };
}
