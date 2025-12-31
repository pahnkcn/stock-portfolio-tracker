import type { ParsedCSVRow, TransactionType } from '@/types';

/**
 * Parse CSV Monthly Statement format
 * Expected format:
 * Symbol & Name,Trade Date,Settlement Date,Buy/Sell,Quantity,Traded Price,Gross Amount,Comm/Fee/Tax,VAT,Net Amount
 * NVDA NVIDIA CORPORATION,25/11/2025,26/11/2025,BUY,0.5,172.12,86.06,-0.09,-0.01,86.16
 */
export function parseCSV(csvContent: string): ParsedCSVRow[] {
  const lines = csvContent.split('\n');
  const results: ParsedCSVRow[] = [];
  
  let headerFound = false;
  let headerIndex = -1;
  
  // Find the header row
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('Symbol & Name') || line.includes('Symbol & Name')) {
      headerFound = true;
      headerIndex = i;
      break;
    }
  }
  
  if (!headerFound) {
    console.warn('CSV header not found');
    return results;
  }
  
  // Parse data rows
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip empty lines or section headers
    if (!line || line.startsWith('""') || line.startsWith('Options') || line.startsWith('Currency')) {
      continue;
    }
    
    // Parse the CSV line
    const parsed = parseCSVLine(line);
    if (parsed && parsed.length >= 10) {
      const symbolAndName = parsed[0];
      const tradeDate = parsed[1];
      const settlementDate = parsed[2];
      const buySell = parsed[3];
      const quantity = parsed[4];
      const tradedPrice = parsed[5];
      const grossAmount = parsed[6];
      const commission = parsed[7];
      const vat = parsed[8];
      const netAmount = parsed[9];
      
      // Skip if essential data is missing
      if (!symbolAndName || !tradeDate || !buySell || !quantity) {
        continue;
      }

      // Validate transaction type
      if (!isValidTransactionType(buySell)) {
        console.warn(`Skipping row with invalid transaction type: ${buySell}`);
        continue;
      }

      // Parse and validate dates
      const parsedTradeDate = parseDate(tradeDate);
      const parsedSettlementDate = parseDate(settlementDate);

      if (!parsedTradeDate) {
        console.warn(`Skipping row with invalid trade date: ${tradeDate}`);
        continue;
      }

      // Parse symbol and company name
      const { symbol, companyName } = parseSymbolAndName(symbolAndName);

      // Skip if symbol couldn't be parsed
      if (!symbol) {
        continue;
      }

      const row: ParsedCSVRow = {
        symbol,
        companyName,
        tradeDate: parsedTradeDate,
        settlementDate: parsedSettlementDate || parsedTradeDate,
        type: buySell.toUpperCase() as TransactionType,
        quantity: parseFloat(quantity) || 0,
        tradedPrice: parseFloat(tradedPrice) || 0,
        grossAmount: parseFloat(grossAmount) || 0,
        commission: Math.abs(parseFloat(commission) || 0),
        vat: Math.abs(parseFloat(vat) || 0),
        netAmount: parseFloat(netAmount) || 0,
      };

      results.push(row);
    }
  }
  
  return results;
}

/**
 * Parse a single CSV line handling quoted fields and escaped quotes
 * Handles escaped quotes ("") within quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote ("") - add single quote and skip next char
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Parse symbol and company name from combined field
 * Example: "NVDA NVIDIA CORPORATION" -> { symbol: "NVDA", companyName: "NVIDIA CORPORATION" }
 */
function parseSymbolAndName(combined: string): { symbol: string; companyName: string } {
  const parts = combined.trim().split(' ');
  if (parts.length === 0) {
    return { symbol: '', companyName: '' };
  }
  
  const symbol = parts[0];
  const companyName = parts.slice(1).join(' ');
  
  return { symbol, companyName };
}

/**
 * Parse date from DD/MM/YYYY format to ISO string
 * Returns null if date is invalid
 */
function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;

  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;

  const [dayStr, monthStr, yearStr] = parts;
  const day = parseInt(dayStr, 10);
  const month = parseInt(monthStr, 10);
  const year = parseInt(yearStr, 10);

  // Validate date components
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (year < 1900 || year > 2100) return null;

  // Create date and verify it's valid
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return `${year}-${monthStr.padStart(2, '0')}-${dayStr.padStart(2, '0')}`;
}

/**
 * Validate transaction type
 */
function isValidTransactionType(type: string): type is 'BUY' | 'SELL' {
  const normalized = type.toUpperCase().trim();
  return normalized === 'BUY' || normalized === 'SELL';
}

/**
 * Group transactions by symbol and calculate holdings
 */
export function calculateHoldingsFromTransactions(
  transactions: ParsedCSVRow[]
): Map<string, { shares: number; totalCost: number; companyName: string }> {
  const holdings = new Map<string, { shares: number; totalCost: number; companyName: string }>();
  
  // Sort by date
  const sorted = [...transactions].sort((a, b) => 
    new Date(a.tradeDate).getTime() - new Date(b.tradeDate).getTime()
  );
  
  for (const tx of sorted) {
    const current = holdings.get(tx.symbol) || { shares: 0, totalCost: 0, companyName: tx.companyName };
    
    if (tx.type === 'BUY') {
      current.shares += tx.quantity;
      current.totalCost += tx.netAmount;
    } else if (tx.type === 'SELL') {
      // For sells, reduce shares and proportionally reduce cost basis
      const avgCost = current.shares > 0 ? current.totalCost / current.shares : 0;
      current.shares -= tx.quantity;
      current.totalCost = current.shares * avgCost;
    }
    
    current.companyName = tx.companyName;
    holdings.set(tx.symbol, current);
  }
  
  // Filter out positions with 0 or negative shares
  for (const [symbol, holding] of holdings) {
    if (holding.shares <= 0) {
      holdings.delete(symbol);
    }
  }
  
  return holdings;
}

/**
 * Validate CSV content
 */
export function validateCSV(csvContent: string): { valid: boolean; error?: string } {
  if (!csvContent || csvContent.trim().length === 0) {
    return { valid: false, error: 'CSV content is empty' };
  }

  const hasHeader = csvContent.includes('Symbol & Name') || csvContent.includes('Symbol,');
  if (!hasHeader) {
    return { valid: false, error: 'CSV header not found. Expected "Symbol & Name" column.' };
  }

  const parsed = parseCSV(csvContent);
  if (parsed.length === 0) {
    return { valid: false, error: 'No valid transactions found in CSV' };
  }

  return { valid: true };
}

/**
 * Generate a unique key for a transaction to detect duplicates
 * Key format: symbol|date|type|quantity|price
 */
export function generateTransactionKey(tx: {
  symbol: string;
  tradeDate: string;
  type: string;
  quantity: number;
  tradedPrice: number;
}): string {
  return `${tx.symbol}|${tx.tradeDate}|${tx.type}|${tx.quantity}|${tx.tradedPrice}`;
}

/**
 * Filter out duplicate transactions
 * Returns { unique: transactions to import, duplicates: skipped transactions }
 */
export function filterDuplicateTransactions(
  newTransactions: ParsedCSVRow[],
  existingTransactions: Array<{
    symbol: string;
    date: string;
    type: string;
    shares: number;
    price: number;
  }>
): { unique: ParsedCSVRow[]; duplicates: ParsedCSVRow[] } {
  // Create set of existing transaction keys
  const existingKeys = new Set(
    existingTransactions.map((tx) =>
      generateTransactionKey({
        symbol: tx.symbol,
        tradeDate: tx.date,
        type: tx.type,
        quantity: tx.shares,
        tradedPrice: tx.price,
      })
    )
  );

  const unique: ParsedCSVRow[] = [];
  const duplicates: ParsedCSVRow[] = [];

  for (const tx of newTransactions) {
    const key = generateTransactionKey({
      symbol: tx.symbol,
      tradeDate: tx.tradeDate,
      type: tx.type,
      quantity: tx.quantity,
      tradedPrice: tx.tradedPrice,
    });

    if (existingKeys.has(key)) {
      duplicates.push(tx);
    } else {
      unique.push(tx);
      existingKeys.add(key); // Prevent duplicates within the same import
    }
  }

  return { unique, duplicates };
}
