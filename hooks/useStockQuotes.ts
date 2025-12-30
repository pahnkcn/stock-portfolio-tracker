import { useEffect, useCallback, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { useApp } from '@/context/AppContext';
import type { StockQuote } from '@/types';

export function useStockQuotes() {
  const { state, dispatch } = useApp();

  // Get unique symbols from holdings
  const symbols = [...new Set(state.holdings.filter(h => h.shares > 0).map((h) => h.symbol))];

  // Get API keys from settings
  const apiKeys = useMemo(() => ({
    yahooFinance: state.settings.apiKeys?.yahooFinance,
    finnhub: state.settings.apiKeys?.finnhub,
  }), [state.settings.apiKeys?.yahooFinance, state.settings.apiKeys?.finnhub]);

  // Check if any API key is configured (Yahoo Finance or Finnhub)
  const hasApiKey = !!(apiKeys.yahooFinance || apiKeys.finnhub);

  // tRPC query for multiple quotes - manual fetch only, no auto-refresh
  const quotesQuery = trpc.stock.getMultipleQuotes.useQuery(
    { symbols, apiKeys },
    {
      enabled: false, // Disable auto-fetch, only manual refresh
      staleTime: Infinity, // Never consider data stale automatically
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
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

  // Manual refresh function - only works if API key is configured and has symbols
  const refresh = useCallback(async () => {
    if (!hasApiKey || symbols.length === 0) {
      return null;
    }
    return quotesQuery.refetch();
  }, [quotesQuery, hasApiKey, symbols.length]);

  return {
    quotes: state.stockQuotes,
    isLoading: quotesQuery.isLoading,
    isFetching: quotesQuery.isFetching,
    error: quotesQuery.error,
    refresh,
    hasApiKey,
    hasSymbols: symbols.length > 0,
    lastUpdated: quotesQuery.dataUpdatedAt
      ? new Date(quotesQuery.dataUpdatedAt).toISOString()
      : null,
  };
}

/**
 * Hook to fetch a single stock quote - manual refresh only
 */
export function useStockQuote(symbol: string) {
  const { state } = useApp();

  // Get API keys from settings
  const apiKeys = useMemo(() => ({
    yahooFinance: state.settings.apiKeys?.yahooFinance,
    finnhub: state.settings.apiKeys?.finnhub,
  }), [state.settings.apiKeys?.yahooFinance, state.settings.apiKeys?.finnhub]);

  // Check if any API key is configured (Yahoo Finance or Finnhub)
  const hasApiKey = !!(apiKeys.yahooFinance || apiKeys.finnhub);

  const quoteQuery = trpc.stock.getQuote.useQuery(
    { symbol, apiKeys },
    {
      enabled: false, // Disable auto-fetch
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    }
  );

  const refresh = useCallback(() => {
    if (!hasApiKey || !symbol) {
      return Promise.resolve(null);
    }
    return quoteQuery.refetch();
  }, [quoteQuery, hasApiKey, symbol]);

  return {
    quote: quoteQuery.data,
    isLoading: quoteQuery.isLoading,
    error: quoteQuery.error,
    refresh,
    hasApiKey,
  };
}

/**
 * Hook to fetch stock chart data - manual refresh only
 */
export function useStockChart(
  symbol: string,
  interval: '1m' | '5m' | '15m' | '30m' | '1h' | '1d' | '1wk' | '1mo' = '1d',
  range: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | 'max' = '1mo'
) {
  const { state } = useApp();

  // Get API keys from settings
  const apiKeys = useMemo(() => ({
    yahooFinance: state.settings.apiKeys?.yahooFinance,
    finnhub: state.settings.apiKeys?.finnhub,
  }), [state.settings.apiKeys?.yahooFinance, state.settings.apiKeys?.finnhub]);

  // Check if any API key is configured (Yahoo Finance or Finnhub)
  const hasApiKey = !!(apiKeys.yahooFinance || apiKeys.finnhub);

  const chartQuery = trpc.stock.getChart.useQuery(
    { symbol, interval, range, apiKeys },
    {
      enabled: false, // Disable auto-fetch
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    }
  );

  const refresh = useCallback(() => {
    if (!hasApiKey || !symbol) {
      return Promise.resolve(null);
    }
    return chartQuery.refetch();
  }, [chartQuery, hasApiKey, symbol]);

  return {
    chart: chartQuery.data,
    isLoading: chartQuery.isLoading,
    error: chartQuery.error,
    refresh,
    hasApiKey,
  };
}
