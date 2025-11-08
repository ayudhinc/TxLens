/**
 * Account balance change information
 */
export interface AccountChange {
  address: string;
  balanceChange: number; // in lamports
  isFeePayer: boolean;
}

/**
 * Token transfer information
 */
export interface TokenTransfer {
  mint: string;
  symbol?: string;
  amount: number;
  decimals: number;
  from: string;
  to: string;
}

/**
 * Program interaction information
 */
export interface ProgramInteraction {
  programId: string;
  programName?: string;
  instructionType: string;
  details: Record<string, any>;
}

/**
 * Parsed transaction data with human-readable information
 */
export interface ParsedTransaction {
  signature: string;
  status: 'success' | 'failed';
  slot: number;
  blockTime: Date | null;
  accountChanges: AccountChange[];
  tokenTransfers: TokenTransfer[];
  programInteractions: ProgramInteraction[];
  computeUnits: {
    used: number;
    limit: number;
  };
  fee: number;
}
