import { ParsedTransaction } from '../parser/types';
import { OutputFormatter } from './OutputFormatter';
import { TxLensError, ErrorCode } from '../utils/errors';

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
      throw new TxLensError(
        'Failed to serialize transaction to JSON',
        ErrorCode.JSON_SERIALIZATION_FAILED,
        { 
          signature: transaction.signature,
          originalError: error instanceof Error ? error.message : String(error)
        }
      );
    }
  }
}
