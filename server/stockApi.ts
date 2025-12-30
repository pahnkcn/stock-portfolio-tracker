// Types for Yahoo Finance RapidAPI response
interface YahooFinanceQuoteResponse {
  body?: Array<{
    symbol: string;
    shortName?: string;
    longName?: string;
    regularMarketPrice: number;
    regularMarketChange?: number;
    regularMarketChangePercent?: number;
    regularMarketOpen?: number;
    regularMarketDayHigh?: number;
    regularMarketDayLow?: number;
    regularMarketVolume?: number;
    regularMarketPreviousClose?: number;
    fiftyTwoWeekHigh?: number;
    fiftyTwoWeekLow?: number;
  }>;
}

// Types for Yahoo Finance Search API response
interface YahooFinanceSearchResponse {
  body?: Array<{
    symbol: string;
    shortname?: string;
    longname?: string;
    exchange?: string;
    exchDisp?: string;
    quoteType?: string;
    typeDisp?: string;
  }>;
  quotes?: Array<{
    symbol: string;
    shortname?: string;
    longname?: string;
    exchange?: string;
    exchDisp?: string;
    quoteType?: string;
    typeDisp?: string;
  }>;
}

// Types for Finnhub API response
interface FinnhubQuoteResponse {
  c: number; // Current price
  d: number; // Change
  dp: number; // Percent change
  h: number; // High
  l: number; // Low
  o: number; // Open
  pc: number; // Previous close
  t: number; // Timestamp
}

interface FinnhubSearchResponse {
  count: number;
  result: Array<{
    description: string;
    displaySymbol: string;
    symbol: string;
    type: string;
  }>;
}

export interface StockQuoteResult {
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
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  lastUpdated: string;
}

export interface StockChartData {
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

export interface StockSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

// API Keys interface for passing from client
export interface ApiKeys {
  yahooFinance?: string;
  finnhub?: string;
}

/**
 * Search for stock symbols using Yahoo Finance or Finnhub API
 */
export async function searchStockSymbols(query: string, apiKeys?: ApiKeys): Promise<StockSearchResult[]> {
  const yahooApiKey = apiKeys?.yahooFinance;
  const finnhubApiKey = apiKeys?.finnhub;

  if (!yahooApiKey && !finnhubApiKey) {
    console.warn('No API key configured for stock search');
    return [];
  }

  try {
    let results: StockSearchResult[] = [];

    // Try Yahoo Finance first if available
    if (yahooApiKey && results.length === 0) {
      try {
        const response = await fetch(
          `https://yahoo-finance15.p.rapidapi.com/api/v1/markets/search?search=${encodeURIComponent(query)}`,
          {
            method: 'GET',
            headers: {
              'x-rapidapi-host': 'yahoo-finance15.p.rapidapi.com',
              'x-rapidapi-key': yahooApiKey,
            },
          }
        );

        if (response.ok) {
          const data = await response.json() as YahooFinanceSearchResponse;
          const quotes = data?.body || data?.quotes || [];

          results = quotes
            .filter((item: any) => item.symbol && (item.quoteType === 'EQUITY' || item.quoteType === 'ETF'))
            .slice(0, 8)
            .map((item: any) => ({
              symbol: item.symbol,
              name: item.longname || item.shortname || item.symbol,
              exchange: item.exchDisp || item.exchange || '',
              type: item.typeDisp || item.quoteType || 'Stock',
            }));
        }
      } catch (yahooError) {
        console.warn('Yahoo Finance search failed:', yahooError);
      }
    }

    // Try Finnhub if Yahoo Finance didn't return results
    if (results.length === 0 && finnhubApiKey) {
      try {
        const response = await fetch(
          `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${finnhubApiKey}`
        );

        if (response.ok) {
          const data = await response.json() as FinnhubSearchResponse;

          if (data?.result && Array.isArray(data.result)) {
            results = data.result
              .filter((item) => item.symbol && (item.type === 'Common Stock' || item.type === 'ETF'))
              .slice(0, 8)
              .map((item) => ({
                symbol: item.displaySymbol || item.symbol,
                name: item.description || item.symbol,
                exchange: '',
                type: item.type === 'Common Stock' ? 'Equity' : item.type,
              }));
          }
        }
      } catch (finnhubError) {
        console.warn('Finnhub search failed:', finnhubError);
      }
    }

    return results;
  } catch (error) {
    console.error(`Error searching stock symbols for "${query}":`, error);
    return [];
  }
}

/**
 * Fetch real-time stock quote from Yahoo Finance or Finnhub API
 */
export async function getStockQuote(symbol: string, apiKeys?: ApiKeys): Promise<StockQuoteResult | null> {
  const yahooApiKey = apiKeys?.yahooFinance;
  const finnhubApiKey = apiKeys?.finnhub;

  if (!yahooApiKey && !finnhubApiKey) {
    console.warn('No API key configured for stock quote');
    return null;
  }

  try {
    // Try Yahoo Finance first if available
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
          const data = await response.json() as YahooFinanceQuoteResponse;

          if (data?.body?.[0]) {
            const quote = data.body[0];
            const previousClose = quote.regularMarketPreviousClose || quote.regularMarketPrice;
            const change = quote.regularMarketChange || (quote.regularMarketPrice - previousClose);
            const changePercent = quote.regularMarketChangePercent || (previousClose > 0 ? (change / previousClose) * 100 : 0);

            return {
              symbol: quote.symbol,
              companyName: quote.longName || quote.shortName || quote.symbol,
              currentPrice: quote.regularMarketPrice,
              change: change,
              changePercent: changePercent,
              open: quote.regularMarketOpen || previousClose,
              high: quote.regularMarketDayHigh || quote.regularMarketPrice,
              low: quote.regularMarketDayLow || quote.regularMarketPrice,
              previousClose: previousClose,
              volume: quote.regularMarketVolume || 0,
              fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || 0,
              fiftyTwoWeekLow: quote.fiftyTwoWeekLow || 0,
              lastUpdated: new Date().toISOString(),
            };
          }
        }
      } catch (yahooError) {
        console.warn('Yahoo Finance quote failed:', yahooError);
      }
    }

    // Try Finnhub if Yahoo Finance didn't return data
    if (finnhubApiKey) {
      try {
        const response = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${symbol.toUpperCase()}&token=${finnhubApiKey}`
        );

        if (response.ok) {
          const data = await response.json() as FinnhubQuoteResponse;

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
              fiftyTwoWeekHigh: 0,
              fiftyTwoWeekLow: 0,
              lastUpdated: new Date().toISOString(),
            };
          }
        }
      } catch (finnhubError) {
        console.warn('Finnhub quote failed:', finnhubError);
      }
    }

    return null;
  } catch (error) {
    console.error(`Error fetching stock quote for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch stock chart data from Yahoo Finance API
 * Note: Chart data requires Yahoo Finance API - not available on Finnhub free tier
 */
export async function getStockChart(
  symbol: string,
  interval: string = "1d",
  range: string = "1mo",
  apiKeys?: ApiKeys
): Promise<StockChartData | null> {
  const yahooApiKey = apiKeys?.yahooFinance;

  if (!yahooApiKey) {
    console.warn('Yahoo Finance API key required for chart data');
    return null;
  }

  try {
    // Use Yahoo Finance RapidAPI for historical data
    const response = await fetch(
      `https://yahoo-finance15.p.rapidapi.com/api/v1/markets/stock/history?symbol=${symbol.toUpperCase()}&interval=${interval}&diffandsplits=false`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-host': 'yahoo-finance15.p.rapidapi.com',
          'x-rapidapi-key': yahooApiKey,
        },
      }
    );

    if (!response.ok) {
      console.error(`Chart API returned ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data?.body) {
      console.error(`No chart data found for symbol: ${symbol}`);
      return null;
    }

    // Parse historical data
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
    console.error(`Error fetching stock chart for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch quotes for multiple symbols
 */
export async function getMultipleStockQuotes(
  symbols: string[],
  apiKeys?: ApiKeys
): Promise<Record<string, StockQuoteResult>> {
  const results: Record<string, StockQuoteResult> = {};

  if (!apiKeys?.yahooFinance && !apiKeys?.finnhub) {
    console.warn('No API key configured for multiple quotes');
    return results;
  }

  // Fetch quotes in parallel with rate limiting
  const batchSize = 5;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const promises = batch.map((symbol) => getStockQuote(symbol, apiKeys));
    const batchResults = await Promise.all(promises);

    batchResults.forEach((result, index) => {
      if (result) {
        results[batch[index].toUpperCase()] = result;
      }
    });

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < symbols.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return results;
}

// Input schemas for tRPC validation
import { z } from "zod";

// API Keys schema
export const apiKeysSchema = z.object({
  yahooFinance: z.string().optional(),
  finnhub: z.string().optional(),
}).optional();

export const stockQuoteInputSchema = z.object({
  symbol: z.string().min(1).max(10),
  apiKeys: apiKeysSchema,
});

export const stockChartInputSchema = z.object({
  symbol: z.string().min(1).max(10),
  interval: z.enum(["1m", "5m", "15m", "30m", "1h", "1d", "1wk", "1mo"]).default("1d"),
  range: z.enum(["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "max"]).default("1mo"),
  apiKeys: apiKeysSchema,
});

export const multipleQuotesInputSchema = z.object({
  symbols: z.array(z.string().min(1).max(10)).min(1).max(50),
  apiKeys: apiKeysSchema,
});

export const stockSearchInputSchema = z.object({
  query: z.string().min(1).max(50),
  apiKeys: apiKeysSchema,
});
