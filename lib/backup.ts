import type { Portfolio, Holding, Transaction, AppSettings, CurrencyRate } from '@/types';

/**
 * Backup data structure
 */
export interface BackupData {
  version: string;
  exportedAt: string;
  data: {
    portfolios: Portfolio[];
    holdings: Holding[];
    transactions: Transaction[];
    settings: AppSettings;
    currencyRate: CurrencyRate;
  };
}

/**
 * Create a backup JSON string from app data
 */
export function createBackup(
  portfolios: Portfolio[],
  holdings: Holding[],
  transactions: Transaction[],
  settings: AppSettings,
  currencyRate: CurrencyRate
): string {
  const backup: BackupData = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    data: {
      portfolios,
      holdings,
      transactions,
      settings,
      currencyRate,
    },
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Validate backup data structure
 */
export function validateBackup(data: unknown): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid backup file: not a valid JSON object' };
  }

  const backup = data as Record<string, unknown>;

  if (!backup.version || typeof backup.version !== 'string') {
    return { valid: false, error: 'Invalid backup file: missing version' };
  }

  if (!backup.data || typeof backup.data !== 'object') {
    return { valid: false, error: 'Invalid backup file: missing data' };
  }

  const backupData = backup.data as Record<string, unknown>;

  if (!Array.isArray(backupData.portfolios)) {
    return { valid: false, error: 'Invalid backup file: portfolios must be an array' };
  }

  if (!Array.isArray(backupData.holdings)) {
    return { valid: false, error: 'Invalid backup file: holdings must be an array' };
  }

  if (!Array.isArray(backupData.transactions)) {
    return { valid: false, error: 'Invalid backup file: transactions must be an array' };
  }

  return { valid: true };
}

/**
 * Parse backup JSON string
 */
export function parseBackup(jsonString: string): { success: boolean; data?: BackupData; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    const validation = validateBackup(parsed);
    
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    return { success: true, data: parsed as BackupData };
  } catch (error) {
    return { success: false, error: 'Failed to parse backup file: invalid JSON' };
  }
}

/**
 * Get backup file name with timestamp
 */
export function getBackupFileName(): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
  return `portfolio-backup-${dateStr}-${timeStr}.json`;
}

/**
 * Get backup summary for display
 */
export function getBackupSummary(backup: BackupData): {
  portfolioCount: number;
  holdingCount: number;
  transactionCount: number;
  exportedAt: string;
  version: string;
} {
  return {
    portfolioCount: backup.data.portfolios.length,
    holdingCount: backup.data.holdings.length,
    transactionCount: backup.data.transactions.length,
    exportedAt: backup.exportedAt,
    version: backup.version,
  };
}
