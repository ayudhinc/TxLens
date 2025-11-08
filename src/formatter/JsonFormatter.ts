import { ParsedTransaction } from '../parser/types';
import { OutputFormatter } from './OutputFormatter';

/**
 * Formats parsed transaction data as JSON
 */
export class JsonFormatter implements OutputFormatter {
  format(transaction: ParsedTransaction): string {
    try {
      // Convert Date to ISO string for JSON serialization
      const serializable = {
        ...transaction,
        blockTime: transaction.blockTime ? transaction.blockTime.toISOString() : null,
      };

      return JSON.stringify(serializable, null, 2);
    } catch (error) {
      throw new Error(`Failed to serialize transaction to JSON: ${error}`);
    }
  }
}
