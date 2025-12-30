// Portfolio Types
export interface Portfolio {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

// Holding Types
export interface Holding {
  id: string;
  portfolioId: string;
  symbol: string;
  companyName: string;
  shares: number;
  avgCost: number;
  lots: Lot[];
}

export interface Lot {
  id: string;
  shares: number;
  price: number;
  date: string;
  commission: number;
}

// Transaction Types
export type TransactionType = 'BUY' | 'SELL';

export interface Transaction {
  id: string;
  portfolioId: string;
  symbol: string;
  companyName: string;
  type: TransactionType;
  shares: number;
  price: number;
  date: string;
  settlementDate?: string;
  grossAmount: number;
  commission: number;
  vat: number;
  netAmount: number;
  notes?: string;
  tags?: string[];
  emotion?: 'confident' | 'FOMO' | 'panic' | 'planned';
}

// Stock Data Types
export interface StockQuote {
  symbol: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  volume: number;
  lastUpdated: string;
}

export interface StockProfile {
  symbol: string;
  companyName: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  peRatio?: number;
  week52High?: number;
  week52Low?: number;
  avgVolume?: number;
  description?: string;
  website?: string;
}

// Technical Analysis Types
export interface TechnicalIndicators {
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  ema20: number;
  ema50: number;
  ema200: number;
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  atr: number;
  volume: number;
  avgVolume: number;
}

export interface SupportResistance {
  type: 'support' | 'resistance';
  price: number;
  strength: 'weak' | 'moderate' | 'strong';
  source: string;
}

// Performance Types
export interface PerformanceStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgGain: number;
  avgLoss: number;
  profitFactor: number;
  largestWin: number;
  largestLoss: number;
  totalProfit: number;
  totalLoss: number;
  netPnL: number;
}

// Currency Types
export interface CurrencyRate {
  usdThb: number;
  lastUpdated: string;
}

// CSV Import Types
export interface ParsedCSVRow {
  symbol: string;
  companyName: string;
  tradeDate: string;
  settlementDate: string;
  type: TransactionType;
  quantity: number;
  tradedPrice: number;
  grossAmount: number;
  commission: number;
  vat: number;
  netAmount: number;
}

// App State Types
export interface AppState {
  portfolios: Portfolio[];
  holdings: Holding[];
  transactions: Transaction[];
  stockQuotes: Record<string, StockQuote>;
  currencyRate: CurrencyRate;
  settings: AppSettings;
}

export interface AppSettings {
  defaultPortfolioId?: string;
  showInTHB: boolean;
  darkMode: boolean;
}
