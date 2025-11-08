import { Connection, PublicKey } from '@solana/web3.js';

export interface TransactionInfo {
  signature: string;
  slot: number;
  blockTime: number | null;
  err: any | null;
}

/**
 * Fetch recent transactions for an address or program
 */
export async function getRecentTransactions(
  connection: Connection,
  address: string,
  limit: number = 10
): Promise<TransactionInfo[]> {
  try {
    const pubkey = new PublicKey(address);
    const signatures = await connection.getSignaturesForAddress(pubkey, {
      limit,
    });

    return signatures.map((sig) => ({
      signature: sig.signature,
      slot: sig.slot,
      blockTime: sig.blockTime ?? null,
      err: sig.err,
    }));
  } catch (error) {
    throw new Error(`Failed to fetch transactions: ${error}`);
  }
}

/**
 * Filter transactions based on criteria
 */
export function filterInterestingTransactions(
  transactions: TransactionInfo[],
  criteria: {
    onlySuccessful?: boolean;
    onlyFailed?: boolean;
  } = {}
): TransactionInfo[] {
  let filtered = transactions;

  if (criteria.onlySuccessful) {
    filtered = filtered.filter((tx) => tx.err === null);
  }

  if (criteria.onlyFailed) {
    filtered = filtered.filter((tx) => tx.err !== null);
  }

  return filtered;
}

/**
 * Get a random transaction from a list
 */
export function getRandomTransaction(transactions: TransactionInfo[]): TransactionInfo | null {
  if (transactions.length === 0) return null;
  const randomIndex = Math.floor(Math.random() * transactions.length);
  return transactions[randomIndex];
}

/**
 * Well-known addresses for finding interesting transactions
 */
export const INTERESTING_ADDRESSES = {
  // DEXs
  JUPITER: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
  ORCA_WHIRLPOOL: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
  RAYDIUM: 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK',
  
  // Lending
  SOLEND: 'So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo',
  
  // NFT Marketplaces
  MAGIC_EDEN: 'M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K',
  
  // Token Program
  TOKEN_PROGRAM: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
};
