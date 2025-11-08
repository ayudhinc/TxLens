import { ParsedTransaction } from '../parser/types';
import { KNOWN_PROGRAMS } from './knownPrograms';

/**
 * Result from evaluating an interesting rule
 */
export interface RuleResult {
  score: number;
  tag: string;
  reason?: string;
}

/**
 * A rule that evaluates if a transaction is interesting
 * Returns false if not interesting, or a RuleResult with score and tag
 */
export type InterestingRule = (tx: NormalizedTx) => false | RuleResult;

/**
 * Normalized transaction with computed metrics for rule evaluation
 */
export interface NormalizedTx extends ParsedTransaction {
  totalSolMoved: number;
  programIds: string[];
  hasTokenTransfers: boolean;
  createsMint: boolean;
  isNftMint: boolean;
  uniquePrograms: number;
}

/**
 * Normalize a parsed transaction for rule evaluation
 */
export function normalizeTransaction(tx: ParsedTransaction): NormalizedTx {
  // Calculate total SOL moved (absolute value of all balance changes)
  const totalSolMoved = tx.accountChanges.reduce(
    (sum, change) => sum + Math.abs(change.balanceChange),
    0
  ) / 1_000_000_000; // Convert lamports to SOL

  // Extract unique program IDs
  const programIds = tx.programInteractions.map((p) => p.programId);
  const uniquePrograms = new Set(programIds).size;

  // Check for token transfers
  const hasTokenTransfers = tx.tokenTransfers.length > 0;

  // Check if transaction creates a mint (InitializeMint instruction)
  const createsMint = tx.programInteractions.some(
    (p) => p.instructionType === 'InitializeMint'
  );

  // Check if it's an NFT mint (mint with 0 decimals)
  const isNftMint = tx.programInteractions.some(
    (p) => p.instructionType === 'InitializeMint' && p.details.decimals === 0
  );

  return {
    ...tx,
    totalSolMoved,
    programIds,
    hasTokenTransfers,
    createsMint,
    isNftMint,
    uniquePrograms,
  };
}

/**
 * Watched DeFi programs for detection
 */
const WATCHED_PROGRAMS = new Set([
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', // Jupiter
  'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', // Orca Whirlpool
  'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK', // Raydium CLMM
  'So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo', // Solend
  '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin', // Serum DEX
]);

/**
 * Default interesting transaction rules
 */
export const DEFAULT_RULES: InterestingRule[] = [
  // Large SOL movements (whale activity)
  (tx: NormalizedTx) => {
    if (tx.totalSolMoved > 100) {
      return {
        score: 10,
        tag: 'whale_move',
        reason: `${tx.totalSolMoved.toFixed(2)} SOL moved`,
      };
    }
    if (tx.totalSolMoved > 50) {
      return {
        score: 7,
        tag: 'large_move',
        reason: `${tx.totalSolMoved.toFixed(2)} SOL moved`,
      };
    }
    if (tx.totalSolMoved > 10) {
      return {
        score: 4,
        tag: 'medium_move',
        reason: `${tx.totalSolMoved.toFixed(2)} SOL moved`,
      };
    }
    return false;
  },

  // New token launches
  (tx: NormalizedTx) => {
    if (tx.createsMint && !tx.isNftMint) {
      return {
        score: 8,
        tag: 'new_token',
        reason: 'New token mint created',
      };
    }
    return false;
  },

  // NFT mints
  (tx: NormalizedTx) => {
    if (tx.isNftMint) {
      return {
        score: 6,
        tag: 'nft_mint',
        reason: 'NFT minted',
      };
    }
    return false;
  },

  // High compute usage (complex transactions)
  (tx: NormalizedTx) => {
    const computePercent = (tx.computeUnits.used / tx.computeUnits.limit) * 100;
    if (tx.computeUnits.used > 1_000_000) {
      return {
        score: 7,
        tag: 'high_compute',
        reason: `${tx.computeUnits.used.toLocaleString()} compute units`,
      };
    }
    if (computePercent > 80) {
      return {
        score: 5,
        tag: 'compute_intensive',
        reason: `${computePercent.toFixed(1)}% compute used`,
      };
    }
    return false;
  },

  // High transaction fees
  (tx: NormalizedTx) => {
    const feeSol = tx.fee / 1_000_000_000;
    if (feeSol > 0.01) {
      return {
        score: 6,
        tag: 'high_fee',
        reason: `${feeSol.toFixed(6)} SOL fee`,
      };
    }
    return false;
  },

  // DeFi interactions with watched programs
  (tx: NormalizedTx) => {
    const watchedProgram = tx.programIds.find((p) => WATCHED_PROGRAMS.has(p));
    if (watchedProgram) {
      const programName = KNOWN_PROGRAMS[watchedProgram] || 'Unknown';
      return {
        score: 5,
        tag: 'defi',
        reason: `Interacts with ${programName}`,
      };
    }
    return false;
  },

  // Large token transfers
  (tx: NormalizedTx) => {
    if (tx.tokenTransfers.length > 5) {
      return {
        score: 6,
        tag: 'multi_token',
        reason: `${tx.tokenTransfers.length} token transfers`,
      };
    }
    if (tx.tokenTransfers.length > 0) {
      return {
        score: 3,
        tag: 'token_transfer',
        reason: `${tx.tokenTransfers.length} token transfer(s)`,
      };
    }
    return false;
  },

  // Complex multi-program interactions
  (tx: NormalizedTx) => {
    if (tx.uniquePrograms > 5) {
      return {
        score: 7,
        tag: 'complex',
        reason: `${tx.uniquePrograms} different programs`,
      };
    }
    if (tx.uniquePrograms > 3) {
      return {
        score: 4,
        tag: 'multi_program',
        reason: `${tx.uniquePrograms} different programs`,
      };
    }
    return false;
  },

  // Failed transactions (might indicate attacks or bugs)
  (tx: NormalizedTx) => {
    if (tx.status === 'failed') {
      return {
        score: 5,
        tag: 'failed',
        reason: 'Transaction failed',
      };
    }
    return false;
  },
];

/**
 * Scored transaction with aggregated results
 */
export interface ScoredTransaction {
  transaction: ParsedTransaction;
  totalScore: number;
  tags: string[];
  reasons: string[];
  topTag: string;
}

/**
 * Evaluate a transaction against all rules and aggregate scores
 */
export function scoreTransaction(
  tx: ParsedTransaction,
  rules: InterestingRule[] = DEFAULT_RULES
): ScoredTransaction {
  const normalized = normalizeTransaction(tx);
  const results: RuleResult[] = [];

  for (const rule of rules) {
    const result = rule(normalized);
    if (result !== false) {
      results.push(result);
    }
  }

  // Aggregate scores and tags
  const totalScore = results.reduce((sum, r) => sum + r.score, 0);
  const tags = results.map((r) => r.tag);
  const reasons = results.map((r) => r.reason || r.tag);

  // Find the highest scoring tag
  const topResult = results.sort((a, b) => b.score - a.score)[0];
  const topTag = topResult ? topResult.tag : 'unknown';

  return {
    transaction: tx,
    totalScore,
    tags,
    reasons,
    topTag,
  };
}

/**
 * Score multiple transactions and sort by score
 */
export function scoreTransactions(
  transactions: ParsedTransaction[],
  rules: InterestingRule[] = DEFAULT_RULES
): ScoredTransaction[] {
  return transactions
    .map((tx) => scoreTransaction(tx, rules))
    .sort((a, b) => b.totalScore - a.totalScore);
}

/**
 * Filter transactions by minimum score
 */
export function filterByScore(
  scored: ScoredTransaction[],
  minScore: number = 5
): ScoredTransaction[] {
  return scored.filter((s) => s.totalScore >= minScore);
}

/**
 * Filter transactions by specific tags
 */
export function filterByTags(
  scored: ScoredTransaction[],
  tags: string[]
): ScoredTransaction[] {
  return scored.filter((s) => s.tags.some((tag) => tags.includes(tag)));
}
