import { RpcClient } from '../rpc/RpcClient';
import { TransactionParser } from '../parser/TransactionParser';
import { OutputFormatter } from '../formatter/OutputFormatter';

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
      if (error instanceof Error) {
        throw new Error(`Failed to process transaction: ${error.message}`);
      }
      throw new Error('Failed to process transaction: Unknown error');
    }
  }
}
