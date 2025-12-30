import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import {
  getStockQuote,
  getStockChart,
  getMultipleStockQuotes,
  searchStockSymbols,
  stockQuoteInputSchema,
  stockChartInputSchema,
  multipleQuotesInputSchema,
  stockSearchInputSchema,
} from "./stockApi";
import {
  getCurrentExchangeRate,
  exchangeRateInputSchema,
} from "./exchangeRateApi";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Stock API routes
  stock: router({
    // Search stock symbols
    search: publicProcedure
      .input(stockSearchInputSchema)
      .query(async ({ input }) => {
        const results = await searchStockSymbols(input.query);
        return results;
      }),

    // Get single stock quote
    getQuote: publicProcedure
      .input(stockQuoteInputSchema)
      .query(async ({ input }) => {
        const quote = await getStockQuote(input.symbol);
        return quote;
      }),

    // Get stock chart data
    getChart: publicProcedure
      .input(stockChartInputSchema)
      .query(async ({ input }) => {
        const chart = await getStockChart(input.symbol, input.interval, input.range);
        return chart;
      }),

    // Get multiple stock quotes
    getMultipleQuotes: publicProcedure
      .input(multipleQuotesInputSchema)
      .query(async ({ input }) => {
        const quotes = await getMultipleStockQuotes(input.symbols);
        return quotes;
      }),
  }),

  // Exchange Rate API routes
  exchangeRate: router({
    // Get current USD/THB exchange rate
    getCurrent: publicProcedure
      .input(exchangeRateInputSchema)
      .query(async () => {
        const rate = await getCurrentExchangeRate();
        return rate;
      }),
  }),
});

export type AppRouter = typeof appRouter;
