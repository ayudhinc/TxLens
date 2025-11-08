import { ParsedTransaction } from '../parser/types';

/**
 * Interface for formatting parsed transaction data
 */
export interface OutputFormatter {
  /**
   * Format a parsed transaction into a string output
   */
  format(transaction: ParsedTransaction): string;
}
