import { callDataApi } from "./_core/dataApi";

// Types for Yahoo Finance API response
interface YahooFinanceChartResult {
  chart: {
    result: Array<{
      meta: {
        symbol: string;
        currency: string;
        exchangeName: string;
        regularMarketPrice: number;
        regularMarketDayHigh: number;
        regularMarketDayLow: number;
        regularMarketVolume: number;
        chartPreviousClose: number;
        previousClose?: number;
        regularMarketOpen?: number;
        fiftyTwoWeekHigh: number;
        fiftyTwoWeekLow: number;
        longName?: string;
        shortName?: string;
      };
      timestamp?: number[];
      indicators?: {
        quote: Array<{
          open: (number | null)[];
          high: (number | null)[];
          low: (number | null)[];
          close: (number | null)[];
          volume: (number | null)[];
        }>;
        adjclose?: Array<{
          adjclose: (number | null)[];
        }>;
      };
    }>;
    error?: {
      code: string;
      description: string;
    };
  };
}

// Types for Yahoo Finance Search API response
interface YahooFinanceSearchResult {
  quotes: Array<{
    symbol: string;
    shortname?: string;
    longname?: string;
    exchange: string;
    exchDisp?: string;
    quoteType: string;
    typeDisp?: string;
    score?: number;
    isYahooFinance?: boolean;
  }>;
  news?: unknown[];
  nav?: unknown[];
  lists?: unknown[];
  researchReports?: unknown[];
  screenerFieldResults?: unknown[];
  totalTime?: number;
  timeTakenForQuotes?: number;
  timeTakenForNews?: number;
  timeTakenForAlgowatchlist?: number;
  timeTakenForPredefinedScreener?: number;
  timeTakenForCr498702?: number;
  timeTakenForResearchReports?: number;
  timeTakenForScreenerField?: number;
  timeTakenForCul498702?: number;
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

/**
 * Search for stock symbols using Yahoo Finance API
 */
export async function searchStockSymbols(query: string): Promise<StockSearchResult[]> {
  try {
    // Use Yahoo Finance search API
    const response = await callDataApi("YahooFinance/search", {
      query: {
        q: query,
        quotesCount: 10,
        newsCount: 0,
        enableFuzzyQuery: false,
        quotesQueryId: "tss_match_phrase_query",
      },
    }) as YahooFinanceSearchResult;

    if (!response?.quotes) {
      return [];
    }

    // Filter to only show stocks (EQUITY) and ETFs from US exchanges
    const usExchanges = ['NYSE', 'NASDAQ', 'NMS', 'NYQ', 'NGM', 'NCM', 'PCX', 'ASE', 'BTS'];
    
    return response.quotes
      .filter(quote => {
        // Only include equities and ETFs
        const validTypes = ['EQUITY', 'ETF'];
        if (!validTypes.includes(quote.quoteType)) return false;
        
        // Prefer US exchanges
        const isUS = usExchanges.some(ex => quote.exchange?.includes(ex) || quote.exchDisp?.includes(ex));
        return isUS || !quote.symbol.includes('.');
      })
      .slice(0, 8)
      .map(quote => ({
        symbol: quote.symbol,
        name: quote.longname || quote.shortname || quote.symbol,
        exchange: quote.exchDisp || quote.exchange,
        type: quote.typeDisp || quote.quoteType,
      }));
  } catch (error) {
    console.error(`Error searching stock symbols for "${query}":`, error);
    return [];
  }
}

/**
 * Fetch real-time stock quote from Yahoo Finance API
 */
export async function getStockQuote(symbol: string): Promise<StockQuoteResult | null> {
  try {
    const response = await callDataApi("YahooFinance/get_stock_chart", {
      query: {
        symbol: symbol.toUpperCase(),
        region: "US",
        interval: "1d",
        range: "1d",
      },
    }) as YahooFinanceChartResult;

    if (!response?.chart?.result?.[0]) {
      console.error(`No data found for symbol: ${symbol}`);
      return null;
    }

    const result = response.chart.result[0];
    const meta = result.meta;

    // Use chartPreviousClose as fallback for previousClose
    const previousClose = meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice;
    const change = meta.regularMarketPrice - previousClose;
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

    // Get open price from indicators if not in meta
    let openPrice = meta.regularMarketOpen || 0;
    if (!openPrice && result.indicators?.quote?.[0]?.open?.[0]) {
      openPrice = result.indicators.quote[0].open[0] || previousClose;
    }

    return {
      symbol: meta.symbol,
      companyName: meta.longName || meta.shortName || meta.symbol,
      currentPrice: meta.regularMarketPrice,
      change: change,
      changePercent: changePercent,
      open: openPrice || previousClose,
      high: meta.regularMarketDayHigh,
      low: meta.regularMarketDayLow,
      previousClose: previousClose,
      volume: meta.regularMarketVolume,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`Error fetching stock quote for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch stock chart data from Yahoo Finance API
 */
export async function getStockChart(
  symbol: string,
  interval: string = "1d",
  range: string = "1mo"
): Promise<StockChartData | null> {
  try {
    const response = await callDataApi("YahooFinance/get_stock_chart", {
      query: {
        symbol: symbol.toUpperCase(),
        region: "US",
        interval,
        range,
      },
    }) as YahooFinanceChartResult;

    if (!response?.chart?.result?.[0]) {
      console.error(`No chart data found for symbol: ${symbol}`);
      return null;
    }

    const result = response.chart.result[0];
    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0];

    if (!quote) {
      return null;
    }

    return {
      symbol: result.meta.symbol,
      timestamps,
      prices: {
        open: quote.open.filter((v): v is number => v !== null),
        high: quote.high.filter((v): v is number => v !== null),
        low: quote.low.filter((v): v is number => v !== null),
        close: quote.close.filter((v): v is number => v !== null),
        volume: quote.volume.filter((v): v is number => v !== null),
      },
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
  symbols: string[]
): Promise<Record<string, StockQuoteResult>> {
  const results: Record<string, StockQuoteResult> = {};

  // Fetch quotes in parallel with rate limiting
  const batchSize = 5;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const promises = batch.map((symbol) => getStockQuote(symbol));
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

export const stockQuoteInputSchema = z.object({
  symbol: z.string().min(1).max(10),
});

export const stockChartInputSchema = z.object({
  symbol: z.string().min(1).max(10),
  interval: z.enum(["1m", "5m", "15m", "30m", "1h", "1d", "1wk", "1mo"]).default("1d"),
  range: z.enum(["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "max"]).default("1mo"),
});

export const multipleQuotesInputSchema = z.object({
  symbols: z.array(z.string().min(1).max(10)).min(1).max(50),
});

export const stockSearchInputSchema = z.object({
  query: z.string().min(1).max(50),
});
