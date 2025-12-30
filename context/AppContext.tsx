import React, { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react';
import type { Portfolio, Holding, Transaction, StockQuote, CurrencyRate, AppSettings } from '@/types';
import * as storage from '@/lib/storage';

// State type
interface AppState {
  portfolios: Portfolio[];
  holdings: Holding[];
  transactions: Transaction[];
  stockQuotes: Record<string, StockQuote>;
  currencyRate: CurrencyRate;
  settings: AppSettings;
  isLoading: boolean;
  isInitialized: boolean;
}

// Action types
type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'INITIALIZE'; payload: Partial<AppState> }
  | { type: 'SET_PORTFOLIOS'; payload: Portfolio[] }
  | { type: 'ADD_PORTFOLIO'; payload: Portfolio }
  | { type: 'UPDATE_PORTFOLIO'; payload: { id: string; updates: Partial<Portfolio> } }
  | { type: 'DELETE_PORTFOLIO'; payload: string }
  | { type: 'SET_HOLDINGS'; payload: Holding[] }
  | { type: 'ADD_HOLDING'; payload: Holding }
  | { type: 'UPDATE_HOLDING'; payload: { id: string; updates: Partial<Holding> } }
  | { type: 'DELETE_HOLDING'; payload: string }
  | { type: 'SET_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'ADD_TRANSACTIONS'; payload: Transaction[] }
  | { type: 'SET_STOCK_QUOTES'; payload: Record<string, StockQuote> }
  | { type: 'UPDATE_STOCK_QUOTE'; payload: StockQuote }
  | { type: 'SET_CURRENCY_RATE'; payload: CurrencyRate }
  | { type: 'SET_SETTINGS'; payload: AppSettings };

// Initial state
const initialState: AppState = {
  portfolios: [],
  holdings: [],
  transactions: [],
  stockQuotes: {},
  currencyRate: { usdThb: 35.0, lastUpdated: new Date().toISOString() },
  settings: { showInTHB: false, darkMode: false, apiKeys: {} },
  isLoading: true,
  isInitialized: false,
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'INITIALIZE':
      return { ...state, ...action.payload, isLoading: false, isInitialized: true };
    
    case 'SET_PORTFOLIOS':
      return { ...state, portfolios: action.payload };
    
    case 'ADD_PORTFOLIO':
      return { ...state, portfolios: [...state.portfolios, action.payload] };
    
    case 'UPDATE_PORTFOLIO':
      return {
        ...state,
        portfolios: state.portfolios.map(p =>
          p.id === action.payload.id ? { ...p, ...action.payload.updates } : p
        ),
      };
    
    case 'DELETE_PORTFOLIO':
      return {
        ...state,
        portfolios: state.portfolios.filter(p => p.id !== action.payload),
        holdings: state.holdings.filter(h => h.portfolioId !== action.payload),
        transactions: state.transactions.filter(t => t.portfolioId !== action.payload),
      };
    
    case 'SET_HOLDINGS':
      return { ...state, holdings: action.payload };
    
    case 'ADD_HOLDING':
      return { ...state, holdings: [...state.holdings, action.payload] };
    
    case 'UPDATE_HOLDING':
      return {
        ...state,
        holdings: state.holdings.map(h =>
          h.id === action.payload.id ? { ...h, ...action.payload.updates } : h
        ),
      };
    
    case 'DELETE_HOLDING':
      return { ...state, holdings: state.holdings.filter(h => h.id !== action.payload) };
    
    case 'SET_TRANSACTIONS':
      return { ...state, transactions: action.payload };
    
    case 'ADD_TRANSACTION':
      return { ...state, transactions: [...state.transactions, action.payload] };
    
    case 'ADD_TRANSACTIONS':
      return { ...state, transactions: [...state.transactions, ...action.payload] };
    
    case 'SET_STOCK_QUOTES':
      return { ...state, stockQuotes: action.payload };
    
    case 'UPDATE_STOCK_QUOTE':
      return {
        ...state,
        stockQuotes: { ...state.stockQuotes, [action.payload.symbol]: action.payload },
      };
    
    case 'SET_CURRENCY_RATE':
      return { ...state, currencyRate: action.payload };
    
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };
    
    default:
      return state;
  }
}

// Context
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  // Portfolio actions
  addPortfolio: (name: string, description?: string) => Promise<Portfolio>;
  updatePortfolio: (id: string, updates: Partial<Portfolio>) => Promise<void>;
  deletePortfolio: (id: string) => Promise<void>;
  // Holding actions
  addHolding: (holding: Omit<Holding, 'id'>) => Promise<Holding>;
  updateHolding: (id: string, updates: Partial<Holding>) => Promise<void>;
  deleteHolding: (id: string) => Promise<void>;
  // Transaction actions
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<Transaction>;
  importTransactions: (transactions: Omit<Transaction, 'id'>[]) => Promise<void>;
  // Settings actions
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  // Currency actions
  updateCurrencyRate: (rate: number) => Promise<void>;
  // Refresh
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

// Provider
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Initialize data from storage
  useEffect(() => {
    async function loadData() {
      try {
        const [portfolios, holdings, transactions, settings, currencyRate] = await Promise.all([
          storage.getPortfolios(),
          storage.getHoldings(),
          storage.getTransactions(),
          storage.getSettings(),
          storage.getCurrencyRate(),
        ]);

        // Create default portfolio if none exists
        let finalPortfolios = portfolios;
        if (portfolios.length === 0) {
          const defaultPortfolio: Portfolio = {
            id: storage.generateId(),
            name: 'Main Portfolio',
            description: 'Default portfolio',
            createdAt: new Date().toISOString(),
          };
          finalPortfolios = [defaultPortfolio];
          await storage.savePortfolios(finalPortfolios);
        }

        dispatch({
          type: 'INITIALIZE',
          payload: {
            portfolios: finalPortfolios,
            holdings,
            transactions,
            settings,
            currencyRate,
          },
        });
      } catch (error) {
        console.error('Error loading data:', error);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }

    loadData();
  }, []);

  // Portfolio actions
  const addPortfolio = useCallback(async (name: string, description?: string): Promise<Portfolio> => {
    const portfolio: Portfolio = {
      id: storage.generateId(),
      name,
      description,
      createdAt: new Date().toISOString(),
    };
    await storage.addPortfolio(portfolio);
    dispatch({ type: 'ADD_PORTFOLIO', payload: portfolio });
    return portfolio;
  }, []);

  const updatePortfolio = useCallback(async (id: string, updates: Partial<Portfolio>) => {
    await storage.updatePortfolio(id, updates);
    dispatch({ type: 'UPDATE_PORTFOLIO', payload: { id, updates } });
  }, []);

  const deletePortfolio = useCallback(async (id: string) => {
    await storage.deletePortfolio(id);
    dispatch({ type: 'DELETE_PORTFOLIO', payload: id });
  }, []);

  // Holding actions
  const addHolding = useCallback(async (holdingData: Omit<Holding, 'id'>): Promise<Holding> => {
    const holding: Holding = {
      ...holdingData,
      id: storage.generateId(),
    };
    const holdings = await storage.getHoldings();
    holdings.push(holding);
    await storage.saveHoldings(holdings);
    dispatch({ type: 'ADD_HOLDING', payload: holding });
    return holding;
  }, []);

  const updateHolding = useCallback(async (id: string, updates: Partial<Holding>) => {
    await storage.updateHolding(id, updates);
    dispatch({ type: 'UPDATE_HOLDING', payload: { id, updates } });
  }, []);

  const deleteHolding = useCallback(async (id: string) => {
    await storage.deleteHolding(id);
    dispatch({ type: 'DELETE_HOLDING', payload: id });
  }, []);

  // Transaction actions
  const addTransaction = useCallback(async (txData: Omit<Transaction, 'id'>): Promise<Transaction> => {
    const transaction: Transaction = {
      ...txData,
      id: storage.generateId(),
    };
    await storage.addTransaction(transaction);
    dispatch({ type: 'ADD_TRANSACTION', payload: transaction });
    return transaction;
  }, []);

  const importTransactions = useCallback(async (txsData: Omit<Transaction, 'id'>[]) => {
    const transactions: Transaction[] = txsData.map(tx => ({
      ...tx,
      id: storage.generateId(),
    }));
    await storage.addTransactions(transactions);
    dispatch({ type: 'ADD_TRANSACTIONS', payload: transactions });
  }, []);

  // Settings actions
  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    const newSettings = { ...state.settings, ...updates };
    await storage.saveSettings(newSettings);
    dispatch({ type: 'SET_SETTINGS', payload: newSettings });
  }, [state.settings]);

  // Currency actions
  const updateCurrencyRate = useCallback(async (rate: number) => {
    const currencyRate: CurrencyRate = {
      usdThb: rate,
      lastUpdated: new Date().toISOString(),
    };
    await storage.saveCurrencyRate(currencyRate);
    dispatch({ type: 'SET_CURRENCY_RATE', payload: currencyRate });
  }, []);

  // Refresh data
  const refreshData = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    const [portfolios, holdings, transactions] = await Promise.all([
      storage.getPortfolios(),
      storage.getHoldings(),
      storage.getTransactions(),
    ]);
    dispatch({ type: 'SET_PORTFOLIOS', payload: portfolios });
    dispatch({ type: 'SET_HOLDINGS', payload: holdings });
    dispatch({ type: 'SET_TRANSACTIONS', payload: transactions });
    dispatch({ type: 'SET_LOADING', payload: false });
  }, []);

  const value: AppContextType = {
    state,
    dispatch,
    addPortfolio,
    updatePortfolio,
    deletePortfolio,
    addHolding,
    updateHolding,
    deleteHolding,
    addTransaction,
    importTransactions,
    updateSettings,
    updateCurrencyRate,
    refreshData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// Hook
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
