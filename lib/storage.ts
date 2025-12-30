import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Portfolio, Holding, Transaction, AppSettings, CurrencyRate } from '@/types';

const STORAGE_KEYS = {
  PORTFOLIOS: 'portfolios',
  HOLDINGS: 'holdings',
  TRANSACTIONS: 'transactions',
  SETTINGS: 'settings',
  CURRENCY_RATE: 'currencyRate',
  STOCK_QUOTES: 'stockQuotes',
};

// Generic storage helpers
async function getItem<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : defaultValue;
  } catch (error) {
    console.error(`Error reading ${key}:`, error);
    return defaultValue;
  }
}

async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key}:`, error);
  }
}

// Portfolio operations
export async function getPortfolios(): Promise<Portfolio[]> {
  return getItem(STORAGE_KEYS.PORTFOLIOS, []);
}

export async function savePortfolios(portfolios: Portfolio[]): Promise<void> {
  return setItem(STORAGE_KEYS.PORTFOLIOS, portfolios);
}

export async function addPortfolio(portfolio: Portfolio): Promise<void> {
  const portfolios = await getPortfolios();
  portfolios.push(portfolio);
  await savePortfolios(portfolios);
}

export async function updatePortfolio(id: string, updates: Partial<Portfolio>): Promise<void> {
  const portfolios = await getPortfolios();
  const index = portfolios.findIndex(p => p.id === id);
  if (index !== -1) {
    portfolios[index] = { ...portfolios[index], ...updates };
    await savePortfolios(portfolios);
  }
}

export async function deletePortfolio(id: string): Promise<void> {
  const portfolios = await getPortfolios();
  await savePortfolios(portfolios.filter(p => p.id !== id));
  
  // Also delete related holdings and transactions
  const holdings = await getHoldings();
  await saveHoldings(holdings.filter(h => h.portfolioId !== id));
  
  const transactions = await getTransactions();
  await saveTransactions(transactions.filter(t => t.portfolioId !== id));
}

// Holdings operations
export async function getHoldings(): Promise<Holding[]> {
  return getItem(STORAGE_KEYS.HOLDINGS, []);
}

export async function saveHoldings(holdings: Holding[]): Promise<void> {
  return setItem(STORAGE_KEYS.HOLDINGS, holdings);
}

export async function getHoldingsByPortfolio(portfolioId: string): Promise<Holding[]> {
  const holdings = await getHoldings();
  return holdings.filter(h => h.portfolioId === portfolioId);
}

export async function updateHolding(id: string, updates: Partial<Holding>): Promise<void> {
  const holdings = await getHoldings();
  const index = holdings.findIndex(h => h.id === id);
  if (index !== -1) {
    holdings[index] = { ...holdings[index], ...updates };
    await saveHoldings(holdings);
  }
}

export async function deleteHolding(id: string): Promise<void> {
  const holdings = await getHoldings();
  await saveHoldings(holdings.filter(h => h.id !== id));
}

// Transaction operations
export async function getTransactions(): Promise<Transaction[]> {
  return getItem(STORAGE_KEYS.TRANSACTIONS, []);
}

export async function saveTransactions(transactions: Transaction[]): Promise<void> {
  return setItem(STORAGE_KEYS.TRANSACTIONS, transactions);
}

export async function addTransaction(transaction: Transaction): Promise<void> {
  const transactions = await getTransactions();
  transactions.push(transaction);
  await saveTransactions(transactions);
}

export async function addTransactions(newTransactions: Transaction[]): Promise<void> {
  const transactions = await getTransactions();
  transactions.push(...newTransactions);
  await saveTransactions(transactions);
}

export async function getTransactionsByPortfolio(portfolioId: string): Promise<Transaction[]> {
  const transactions = await getTransactions();
  return transactions.filter(t => t.portfolioId === portfolioId);
}

export async function getTransactionsBySymbol(symbol: string): Promise<Transaction[]> {
  const transactions = await getTransactions();
  return transactions.filter(t => t.symbol === symbol);
}

// Settings operations
export async function getSettings(): Promise<AppSettings> {
  return getItem(STORAGE_KEYS.SETTINGS, {
    showInTHB: false,
    darkMode: false,
  });
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  return setItem(STORAGE_KEYS.SETTINGS, settings);
}

// Currency rate operations
export async function getCurrencyRate(): Promise<CurrencyRate> {
  return getItem(STORAGE_KEYS.CURRENCY_RATE, {
    usdThb: 35.0,
    lastUpdated: new Date().toISOString(),
  });
}

export async function saveCurrencyRate(rate: CurrencyRate): Promise<void> {
  return setItem(STORAGE_KEYS.CURRENCY_RATE, rate);
}

// Clear all data
export async function clearAllData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
  } catch (error) {
    console.error('Error clearing data:', error);
  }
}

// Generate unique ID
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
