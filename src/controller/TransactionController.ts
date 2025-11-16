import { RpcClient } from '../rpc/RpcClient';
import { TransactionParser } from '../parser/TransactionParser';
import { OutputFormatter } from '../formatter/OutputFormatter';
import { TxLensError, ErrorCode } from '../utils/errors';

/**
 * Orchestrates the transaction processing pipeline
 */
export class TransactionController {
  constructor(
    private rpcClient: RpcClient,
    private parser: TransactionParser,
    private formatter: OutputFormatter
  ) {}

  /**
   * Process a transaction from signature to formatted output
   * @param signature - Transaction signature to process
   * @returns Formatted transaction output
   * @throws TxLensError with appropriate error code and context
   */
  async processTransaction(signature: string): Promise<string> {
    try {
      // Fetch transaction from RPC
      const rawTransaction = await this.rpcClient.getTransaction(signature);

      // Parse transaction
      const parsedTransaction = this.parser.parse(rawTransaction);

      // Format output
      const output = this.formatter.format(parsedTransaction);

      return output;
    } catch (error) {
      // Re-throw TxLensError as-is (already has proper context)
      if (TxLensError.isTxLensError(error)) {
        throw error;
      }

      // Wrap unexpected errors
      throw new TxLensError(
        'Unexpected error occurred while processing transaction',
        ErrorCode.UNKNOWN_ERROR,
        { 
          signature,
          originalError: error instanceof Error ? error.message : String(error)
        }
      );
    }
  }
}
