import { useEffect, useCallback, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { useApp } from '@/context/AppContext';
import type { StockQuote } from '@/types';

interface UseStockQuotesOptions {
  /** Auto-refresh interval in milliseconds (default: 60000 = 1 minute) */
  refreshInterval?: number;
  /** Enable auto-refresh (default: true) */
  autoRefresh?: boolean;
}

export function useStockQuotes(options: UseStockQuotesOptions = {}) {
  const { refreshInterval = 60000, autoRefresh = true } = options;
  const { state, dispatch } = useApp();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Get unique symbols from holdings
  const symbols = [...new Set(state.holdings.map((h) => h.symbol))];

  // tRPC query for multiple quotes
  const quotesQuery = trpc.stock.getMultipleQuotes.useQuery(
    { symbols },
    {
      enabled: symbols.length > 0,
      staleTime: 30000, // Consider data stale after 30 seconds
      refetchOnWindowFocus: false,
    }
  );

  // Update state when quotes are fetched
  useEffect(() => {
    if (quotesQuery.data) {
      const quotes: Record<string, StockQuote> = {};
      
      for (const [symbol, quote] of Object.entries(quotesQuery.data)) {
        if (quote) {
          quotes[symbol] = {
            symbol: quote.symbol,
            currentPrice: quote.currentPrice,
            change: quote.change,
            changePercent: quote.changePercent,
            open: quote.open,
            high: quote.high,
            low: quote.low,
            previousClose: quote.previousClose,
            volume: quote.volume,
            lastUpdated: quote.lastUpdated,
          };
        }
      }

      dispatch({ type: 'SET_STOCK_QUOTES', payload: quotes });
    }
  }, [quotesQuery.data, dispatch]);

  // Auto-refresh logic
  useEffect(() => {
    if (autoRefresh && symbols.length > 0) {
      intervalRef.current = setInterval(() => {
        quotesQuery.refetch();
      }, refreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, symbols.length, quotesQuery]);

  // Manual refresh function
  const refresh = useCallback(() => {
    return quotesQuery.refetch();
  }, [quotesQuery]);

  return {
    quotes: state.stockQuotes,
    isLoading: quotesQuery.isLoading,
    isFetching: quotesQuery.isFetching,
    error: quotesQuery.error,
    refresh,
    lastUpdated: quotesQuery.dataUpdatedAt
      ? new Date(quotesQuery.dataUpdatedAt).toISOString()
      : null,
  };
}

/**
 * Hook to fetch a single stock quote
 */
export function useStockQuote(symbol: string) {
  const quoteQuery = trpc.stock.getQuote.useQuery(
    { symbol },
    {
      enabled: !!symbol,
      staleTime: 30000,
    }
  );

  return {
    quote: quoteQuery.data,
    isLoading: quoteQuery.isLoading,
    error: quoteQuery.error,
    refresh: quoteQuery.refetch,
  };
}

/**
 * Hook to fetch stock chart data
 */
export function useStockChart(
  symbol: string,
  interval: '1m' | '5m' | '15m' | '30m' | '1h' | '1d' | '1wk' | '1mo' = '1d',
  range: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | 'max' = '1mo'
) {
  const chartQuery = trpc.stock.getChart.useQuery(
    { symbol, interval, range },
    {
      enabled: !!symbol,
      staleTime: 60000, // Chart data stale after 1 minute
    }
  );

  return {
    chart: chartQuery.data,
    isLoading: chartQuery.isLoading,
    error: chartQuery.error,
    refresh: chartQuery.refetch,
  };
}
